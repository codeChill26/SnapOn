import React, { useState, useEffect, useRef } from 'react';
import {
  X, Wallet, CheckCircle, ArrowLeft, Sparkles, Shield, TrendingUp,
  CreditCard, Zap, Clock, ChevronRight, BadgeCheck, ArrowUpRight, Gift, ArrowDownLeft, Landmark, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

import { useApp } from '../context/AppContext';
import api from '../../services/api';
import { BankSelectModal } from './BankSelectModal';

type Step = 'select' | 'loading' | 'waiting_payment' | 'qr' | 'success';

const PRESETS = [
  { amount: 50000, label: '50K', full: '50,000₫', icon: '☕', desc: 'Việc nhỏ' },
  { amount: 100000, label: '100K', full: '100,000₫', icon: '🛒', desc: 'Phổ biến' },
  { amount: 200000, label: '200K', full: '200,000₫', icon: '⚡', desc: 'Tiết kiệm', popular: true },
  { amount: 500000, label: '500K', full: '500,000₫', icon: '🔥', desc: 'Ưa chuộng', popular: true },
  { amount: 1000000, label: '1M', full: '1,000,000₫', icon: '💎', desc: 'Premium' },
  { amount: 2000000, label: '2M', full: '2,000,000₫', icon: '👑', desc: 'VIP', bonus: '+50K' },
];

const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫';
const fmtShort = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
  return (n / 1000).toFixed(0) + 'K';
};

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  balance: number;
  isWorker: boolean;
  onTopUp: (amount: number) => void;
}

// Floating particle for success
function Particle({ delay, isWorker }: { delay: number; isWorker: boolean }) {
  const colors = isWorker
    ? ['bg-blue-400', 'bg-indigo-400', 'bg-cyan-400', 'bg-sky-300']
    : ['bg-orange-400', 'bg-amber-400', 'bg-yellow-400', 'bg-red-300'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const x = Math.random() * 200 - 100;
  const size = Math.random() * 6 + 4;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      animate={{ opacity: 0, y: -120 - Math.random() * 60, x, scale: 0, rotate: Math.random() * 360 }}
      transition={{ duration: 1.2 + Math.random() * 0.5, delay, ease: 'easeOut' }}
      className={`absolute bottom-0 left-1/2 rounded-full ${color}`}
      style={{ width: size, height: size }}
    />
  );
}

export function WalletModal({ open, onClose, balance, isWorker, onTopUp }: WalletModalProps) {
  const { fetchProfile } = useApp();
  const [step, setStep] = useState<Step>('select');
  const [mode, setMode] = useState<'topup' | 'withdraw'>('topup');
  const [selected, setSelected] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [countdown, setCountdown] = useState(4);
  const [progress, setProgress] = useState(0);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [orderCode, setOrderCode] = useState<number | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [initialBalance, setInitialBalance] = useState(balance);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [hasPendingWithdraw, setHasPendingWithdraw] = useState(false);
  const [pendingWithdrawInfo, setPendingWithdrawInfo] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    const checkPendingWithdraw = async () => {
      try {
        const res = await api.get('/wallet/transactions');
        const items = res.data?.data || res.data?.transactions || [];
        const pending = items.find((t: any) => t.type === 'WITHDRAW' && t.status === 'PENDING');
        if (pending) {
          setHasPendingWithdraw(true);
          setPendingWithdrawInfo(pending);
        } else {
          setHasPendingWithdraw(false);
          setPendingWithdrawInfo(null);
        }
      } catch {
        // ignore
      }
    };
    checkPendingWithdraw();
  }, [open, mode, withdrawSuccess]);

  // Stable QR value — generated once when entering QR step
  const qrValueRef = useRef('');

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('select');
      setSelected(null);
      setCustomAmount('');
      setCountdown(4);
      setProgress(0);
      setCheckoutUrl('');
      setErrorMsg('');
      setInitialBalance(balance);
      setOrderCode(null);

      const savedBank = localStorage.getItem('userBankName') || '';
      const savedAcc = localStorage.getItem('userBankAccountNumber') || '';
      setBankName(savedBank);
      setBankAccountNumber(savedAcc);
    }
  }, [open, balance]);

  const handlePresetSelect = (amount: number) => {
    setSelected(amount);
    setCustomAmount(amount.toString());
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanVal = rawVal.replace(/\D/g, '');
    if (cleanVal) {
      const num = Number(cleanVal);
      setSelected(num);
      setCustomAmount(cleanVal);
    } else {
      setSelected(null);
      setCustomAmount('');
    }
  };

  // Track balance changes to automatically transition to success step
  useEffect(() => {
    if (step === 'waiting_payment' && balance > initialBalance) {
      setStep('success');
    }
  }, [balance, initialBalance, step]);

  const handlePayOSTopUp = async () => {
    if (!selected) return;
    try {
      setPaymentLoading(true);
      setErrorMsg('');
      setStep('loading');

      const res = await api.post('/wallet/topup/payos/create', { amount: selected });
      const data = res.data;
      if (!res.data.success) {
        throw new Error(data.message || 'Không thể tạo liên kết thanh toán.');
      }
      if (data.success && data.data?.checkoutUrl) {
        setCheckoutUrl(data.data.checkoutUrl);
        setOrderCode(data.data.orderCode);
        setInitialBalance(balance); // mark balance at entry
        
        // Open the payment page in a new window/tab
        window.open(data.data.checkoutUrl, '_blank');
        
        // Transition to waiting payment step
        setStep('waiting_payment');
      } else {
        throw new Error('Không nhận được liên kết thanh toán từ máy chủ.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi kết nối đến cổng thanh toán.');
      setStep('select');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCheckBalance = async () => {
    try {
      if (orderCode) {
        const res = await api.get(`/wallet/topup/payos/status/${orderCode}`);
        const statusData = res.data;
        if (statusData.success && statusData.data?.status === 'SUCCESS') {
          setStep('success');
        }
      }
      await fetchProfile();
    } catch (err) {
      console.error('Lỗi khi tải lại số dư:', err);
    }
  };

  // Generate stable QR value when entering QR step
  useEffect(() => {
    if (step === 'qr' && selected) {
      qrValueRef.current = `snapon://topup?amount=${selected}&id=${Math.random().toString(36).slice(2, 10)}`;
    }
  }, [step, selected]);

  // QR countdown → success
  useEffect(() => {
    if (step !== 'qr') return;
    setCountdown(4);
    setProgress(0);

    // Smooth progress bar
    const progressTimer = setInterval(() => {
      setProgress(prev => Math.min(prev + 0.5, 100));
    }, 20);

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          clearInterval(progressTimer);
          setProgress(100);
          setStep('success');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { clearInterval(timer); clearInterval(progressTimer); };
  }, [step]);

  // Apply top-up when entering success step (for mock QR flow)
  useEffect(() => {
    if (step === 'success' && selected && checkoutUrl === '') {
      onTopUp(selected);
    }
  }, [step, selected, checkoutUrl]);

  const handleWithdraw = async () => {
    const amt = parseInt(withdrawAmount.replace(/\D/g, ''), 10);
    if (!amt || amt <= 0) { setErrorMsg('Vui lòng nhập số tiền hợp lệ.'); return; }
    if (amt > 2000000) { setErrorMsg('Số tiền rút mỗi lần tối đa là 2.000.000₫.'); return; }
    if (!bankName.trim()) { setErrorMsg('Vui lòng nhập tên ngân hàng.'); return; }
    if (!bankAccountNumber.trim()) { setErrorMsg('Vui lòng nhập số tài khoản.'); return; }
    if (amt > balance) { setErrorMsg('Số dư không đủ để rút.'); return; }

    try {
      setWithdrawLoading(true);
      setErrorMsg('');
      const res = await api.post('/wallet/withdraw', { amount: amt, bankName: bankName.trim(), bankAccountNumber: bankAccountNumber.trim() });
      if (res.data.success) {
        localStorage.setItem('userBankName', bankName.trim());
        localStorage.setItem('userBankAccountNumber', bankAccountNumber.trim());
        setWithdrawSuccess(true);
        setWithdrawAmount('');
        await fetchProfile();
        window.dispatchEvent(new Event('notification-updated'));
        setTimeout(() => {
          setWithdrawSuccess(false);
        }, 4000);
      } else {
        throw new Error(res.data.message || 'Không thể tạo yêu cầu rút tiền.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi tạo yêu cầu rút tiền.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const accentGradient = isWorker
    ? 'from-blue-600 via-indigo-600 to-violet-600'
    : 'from-orange-500 via-amber-500 to-yellow-500';
  const accentGradientSubtle = isWorker
    ? 'from-blue-50 to-indigo-50'
    : 'from-orange-50 to-amber-50';
  const accentColor = isWorker ? '#3b82f6' : '#f97316';
  const accentText = isWorker ? 'text-blue-600' : 'text-orange-600';
  const accentBg = isWorker ? 'bg-blue-500' : 'bg-orange-500';
  const accentBgLight = isWorker ? 'bg-blue-50' : 'bg-orange-50';
  const accentBorder = isWorker ? 'border-blue-300' : 'border-orange-300';
  const accentRing = isWorker ? 'ring-blue-200' : 'ring-orange-200';

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[9999] backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[420px] overflow-hidden relative">

              {/* Centered Success Modal Popup Overlay */}
              <AnimatePresence>
                {withdrawSuccess && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-5">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 10 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                      className="bg-white rounded-3xl p-6 text-center shadow-2xl border border-emerald-100 max-w-[340px] w-full relative overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setWithdrawSuccess(false)}
                        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      </div>

                      <h3 className="text-gray-900 text-base font-bold mb-1">
                        Yêu cầu rút tiền đã được gửi!
                      </h3>

                      <p className="text-gray-500 text-xs leading-relaxed mb-5">
                        Số dư khả dụng đã được cập nhật. Yêu cầu của bạn đang chờ Admin xét duyệt.
                      </p>

                      <button
                        type="button"
                        onClick={() => setWithdrawSuccess(false)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl shadow-md transition cursor-pointer"
                      >
                        Đã hiểu
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* ═══════════ HEADER — Wallet Card Style ═══════════ */}
              <div className={`bg-gradient-to-br ${accentGradient} px-6 pt-5 pb-6 relative overflow-hidden`}>
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full" />
                <div className="absolute top-1/2 right-8 w-16 h-16 bg-white/5 rounded-full" />

                {/* Top bar */}
                <div className="flex items-center justify-between mb-5 relative z-10">
                  <div className="flex items-center gap-2.5">
                    {step !== 'select' && step !== 'success' && (
                      <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => setStep('select')}
                        className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition backdrop-blur-sm"
                      >
                        <ArrowLeft className="w-4 h-4 text-white" />
                      </motion.button>
                    )}
                    <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-white text-sm" style={{ fontWeight: 700 }}>Ví SnapOn</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Shield className="w-3 h-3 text-white/50" />
                        <span className="text-white/50 text-[10px]" style={{ fontWeight: 500 }}>Bảo mật SSL</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition backdrop-blur-sm"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Balance card */}
                <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/60 text-xs mb-1" style={{ fontWeight: 500 }}>Số dư khả dụng</p>
                      <motion.p
                        key={balance}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1 }}
                        className="text-white"
                        style={{ fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.02em' }}
                      >
                        {fmt(balance)}
                      </motion.p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-white/80 text-[10px]" style={{ fontWeight: 600 }}>Hoạt động</span>
                      </div>
                      <span className="text-white/40 text-[10px]">
                        {isWorker ? '💼 Người làm' : '🏠 Người thuê'}
                      </span>
                    </div>
                  </div>

                  {/* Mini card chip decoration */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-8 h-5 rounded bg-gradient-to-br from-yellow-200/40 to-yellow-400/40 border border-yellow-200/30" />
                    <span className="text-white/30 text-xs tracking-[0.25em]" style={{ fontWeight: 500 }}>
                      •••• •••• ••••
                    </span>
                  </div>
                </div>
              </div>

              {/* ═══════════ CONTENT ═══════════ */}
              <AnimatePresence mode="wait">

                {/* ── STEP 1: Select amount ── */}
                {step === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="p-5"
                  >
                    {/* Mode tabs */}
                    <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => { setMode('topup'); setErrorMsg(''); setSelected(null); setCustomAmount(''); }}
                        className={`flex-1 py-2 rounded-lg text-xs transition-all ${
                          mode === 'topup' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        style={{ fontWeight: 700 }}
                      >
                        <CreditCard className="w-3.5 h-3.5 inline mr-1" />
                        Nạp tiền
                      </button>
                      <button
                        onClick={() => { setMode('withdraw'); setErrorMsg(''); setSelected(null); setCustomAmount(''); }}
                        className={`flex-1 py-2 rounded-lg text-xs transition-all ${
                          mode === 'withdraw' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        style={{ fontWeight: 700 }}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5 inline mr-1" />
                        Rút tiền
                      </button>
                    </div>

                    {mode === 'topup' && (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <TrendingUp className={`w-4 h-4 ${accentText}`} />
                            <p className="text-gray-800 text-sm" style={{ fontWeight: 700 }}>Nạp tiền vào ví</p>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <Zap className="w-3 h-3" />
                            <span>Xử lý tức thì</span>
                          </div>
                        </div>

                        {/* Preset grid */}
                        <div className="grid grid-cols-3 gap-2">
                          {PRESETS.map(p => {
                            const isActive = selected === p.amount;
                            return (
                              <motion.button
                                key={p.amount}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => handlePresetSelect(p.amount)}
                                className={`relative py-3 px-2 rounded-2xl border-2 text-center transition-all ${
                                  isActive
                                    ? `${accentBorder} ${accentBgLight} ring-4 ${accentRing}/30`
                                    : 'border-gray-100 bg-gray-50/80 hover:border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                {p.popular && (
                                  <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded-full text-white ${accentBg}`}
                                    style={{ fontWeight: 700 }}>
                                    HOT
                                  </span>
                                )}
                                {p.bonus && (
                                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded-full bg-green-500 text-white"
                                    style={{ fontWeight: 700 }}>
                                    {p.bonus}
                                  </span>
                                )}
                                <span className="text-lg block mb-0.5">{p.icon}</span>
                                <span className={`block text-sm ${isActive ? accentText : 'text-gray-800'}`}
                                  style={{ fontWeight: 800 }}>
                                  {p.label}
                                </span>
                                <span className="block text-[10px] text-gray-400 mt-0.5" style={{ fontWeight: 500 }}>
                                  {p.desc}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>

                        {/* Custom Amount Input */}
                        <div className="mt-4 text-left">
                          <label className="block text-xs text-gray-400 mb-1.5 font-medium">Hoặc nhập số tiền khác (tối đa 2.000.000₫)</label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={customAmount}
                              onChange={handleCustomAmountChange}
                              placeholder="Nhập số tiền (ví dụ: 100000)..."
                              className={`w-full pl-4 pr-12 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50/80 text-gray-800 text-sm font-bold focus:bg-white focus:outline-none transition-all ${
                                isWorker ? 'focus:border-blue-500' : 'focus:border-orange-500'
                              }`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">₫</span>
                          </div>
                          {selected !== null && selected < 1000 && (
                            <p className="text-red-500 text-[10px] mt-1 font-semibold">Số tiền nạp tối thiểu là 1.000₫</p>
                          )}
                          {selected !== null && selected > 2000000 && (
                            <p className="text-red-500 text-[10px] mt-1 font-semibold">Số tiền nạp tối đa mỗi giao dịch là 2.000.000₫</p>
                          )}
                        </div>

                        {/* Summary */}
                        <AnimatePresence>
                          {selected && selected >= 1000 && selected <= 2000000 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className={`p-4 rounded-2xl bg-gradient-to-r ${accentGradientSubtle} border border-gray-100`}>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Số tiền nạp</span>
                                  <span className={accentText} style={{ fontWeight: 700 }}>{fmt(selected)}</span>
                                </div>
                                <div className="w-full h-px bg-gray-200/50 my-2.5" />
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Số dư sau nạp</span>
                                  <div className="flex items-center gap-1.5">
                                    <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                                    <span className="text-gray-900" style={{ fontWeight: 800 }}>{fmt(balance + selected)}</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {errorMsg && (
                          <div className="mt-3 text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl text-center">
                            {errorMsg}
                          </div>
                        )}

                        {/* CTA Buttons */}
                        <div className="flex flex-col gap-2 mt-5">
                          <motion.button
                            whileHover={selected && selected >= 1000 && selected <= 2000000 ? { scale: 1.01 } : {}}
                            whileTap={selected && selected >= 1000 && selected <= 2000000 ? { scale: 0.98 } : {}}
                            disabled={!selected || selected < 1000 || selected > 2000000 || paymentLoading}
                            onClick={handlePayOSTopUp}
                            className={`w-full py-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 ${
                              selected && selected >= 1000 && selected <= 2000000
                                ? `bg-gradient-to-r ${accentGradient} text-white shadow-lg hover:shadow-xl`
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            }`}
                            style={{ fontWeight: 700 }}
                          >
                            {selected ? (
                              selected > 2000000 ? (
                                'Số tiền tối đa 2.000.000₫'
                              ) : selected >= 1000 ? (
                                <>
                                  <CreditCard className="w-4 h-4" />
                                  {paymentLoading ? 'Đang kết nối...' : `Nạp tiền qua PayOS ${fmtShort(selected)}`}
                                  <ChevronRight className="w-4 h-4" />
                                </>
                              ) : (
                                'Số tiền tối thiểu 1.000₫'
                              )
                            ) : (
                              'Chọn mệnh giá để tiếp tục'
                            )}
                          </motion.button>
                        </div>

                        {/* Trust badges */}
                        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-gray-300">
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            <span>Bảo mật</span>
                          </div>
                          <div className="w-0.5 h-3 bg-gray-200 rounded-full" />
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>Tức thì</span>
                          </div>
                          <div className="w-0.5 h-3 bg-gray-200 rounded-full" />
                          <div className="flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3" />
                            <span>An toàn</span>
                          </div>
                        </div>
                      </>
                    )}

                    {mode === 'withdraw' && (
                      <>
                        <div className="flex items-center gap-2 mb-4">
                          <ArrowDownLeft className={`w-4 h-4 ${accentText}`} />
                          <p className="text-gray-800 text-sm" style={{ fontWeight: 700 }}>Rút tiền về tài khoản ngân hàng</p>
                        </div>

                        <p className="text-xs text-gray-400 mb-3">
                          Số dư khả dụng: <span style={{ fontWeight: 700 }} className="text-gray-800">{fmt(balance)}</span>
                        </p>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 text-[11px] text-amber-800 space-y-1">
                          <div className="flex items-center gap-1 font-bold text-amber-900">
                            <Shield className="w-3.5 h-3.5 text-amber-600" />
                            <span>Quy định rút tiền:</span>
                          </div>
                          <div>• Tối đa <strong>2.000.000₫</strong> / 1 lần rút</div>
                          <div>• Hạn mức tối đa <strong>20.000.000₫</strong> / 24 giờ</div>
                          <div>• Yêu cầu sẽ gửi đến <strong>Admin xét duyệt</strong></div>
                        </div>

                        {hasPendingWithdraw && (
                          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center mb-4">
                            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                              <Clock className="w-5 h-5 animate-pulse" />
                            </div>
                            <h4 className="text-amber-900 font-bold text-sm mb-1">
                              Đang có 1 yêu cầu rút tiền chờ duyệt
                            </h4>
                            <p className="text-amber-700 text-xs leading-relaxed">
                              Yêu cầu rút {pendingWithdrawInfo ? parseFloat(pendingWithdrawInfo.amount || 0).toLocaleString('vi-VN') + 'đ' : ''} đang chờ Admin xét duyệt. Vui lòng chờ Admin xử lý xong trước khi tạo đơn rút tiền mới.
                            </p>
                          </div>
                        )}

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Tên ngân hàng</label>
                            <button
                              type="button"
                              onClick={() => setBankModalOpen(true)}
                              className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50/80 text-gray-800 text-sm font-semibold focus:bg-white focus:outline-none transition-all flex items-center justify-between hover:border-gray-300 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Landmark className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <span className={bankName ? 'text-gray-800 font-bold' : 'text-gray-400 font-normal'}>
                                  {bankName || 'Chọn ngân hàng...'}
                                </span>
                              </div>
                              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            </button>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Số tài khoản</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={bankAccountNumber}
                              onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                              placeholder="Nhập số tài khoản..."
                              className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50/80 text-gray-800 text-sm font-medium focus:bg-white focus:outline-none transition-all focus:border-gray-300"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Số tiền rút</label>
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="numeric"
                                disabled={hasPendingWithdraw}
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value.replace(/\D/g, ''))}
                                placeholder="Nhập số tiền..."
                                className={`w-full pl-4 pr-12 py-3.5 rounded-2xl border-2 border-gray-100 text-gray-800 text-sm font-bold focus:bg-white focus:outline-none transition-all ${
                                  hasPendingWithdraw ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-gray-50/80'
                                } ${isWorker ? 'focus:border-blue-500' : 'focus:border-orange-500'}`}
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">₫</span>
                            </div>
                          </div>
                        </div>

                        {errorMsg && (
                          <div className="mt-3 text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl text-center">
                            {errorMsg}
                          </div>
                        )}

                        <motion.button
                          whileHover={!withdrawLoading && !hasPendingWithdraw && withdrawAmount && bankName && bankAccountNumber ? { scale: 1.01 } : {}}
                          whileTap={!withdrawLoading && !hasPendingWithdraw && withdrawAmount && bankName && bankAccountNumber ? { scale: 0.98 } : {}}
                          disabled={withdrawLoading || hasPendingWithdraw || !withdrawAmount || !bankName || !bankAccountNumber}
                          onClick={handleWithdraw}
                          className={`w-full py-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 mt-4 ${
                            !hasPendingWithdraw && withdrawAmount && bankName && bankAccountNumber
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl cursor-pointer'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                          }`}
                          style={{ fontWeight: 700 }}
                        >
                          {withdrawLoading ? (
                            <>
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                              Đang xử lý...
                            </>
                          ) : hasPendingWithdraw ? (
                            <>
                              <Clock className="w-4 h-4 text-gray-400" />
                              Đang chờ Admin duyệt đơn trước đó
                            </>
                          ) : (
                            <>
                              <Landmark className="w-4 h-4" />
                              Gửi yêu cầu rút tiền
                            </>
                          )}
                        </motion.button>

                      </>
                    )}
                  </motion.div>
                )}

                {/* ── STEP: Loading ── */}
                {step === 'loading' && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-10 text-center flex flex-col items-center justify-center min-h-[260px]"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      className={`w-12 h-12 border-4 border-gray-100 rounded-full mb-4 ${
                        isWorker ? 'border-t-blue-500' : 'border-t-orange-500'
                      }`}
                    />
                    <p className="text-gray-800 text-sm font-semibold">Đang kết nối cổng thanh toán PayOS...</p>
                    <p className="text-gray-400 text-xs mt-1">Vui lòng chờ trong giây lát</p>
                  </motion.div>
                )}

                {/* ── STEP: Waiting Payment ── */}
                {step === 'waiting_payment' && selected && (
                  <motion.div
                    key="waiting_payment"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="p-5 text-center"
                  >
                    {/* Pulsing card icon */}
                    <div className="relative inline-block mb-4">
                      <div className={`absolute inset-0 bg-gradient-to-br ${accentGradient} opacity-20 rounded-full blur-lg scale-150 animate-pulse`} />
                      <div className={`relative w-14 h-14 bg-gradient-to-br ${accentGradient} rounded-full flex items-center justify-center text-white shadow-md`}>
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                    </div>

                    <p className="text-gray-900 text-base" style={{ fontWeight: 800 }}>Đang chờ thanh toán</p>
                    <p className="text-gray-500 text-xs mt-1 px-4">
                      Hệ thống đã mở liên kết thanh toán PayOS ở tab mới. Hãy thực hiện chuyển khoản chính xác số tiền.
                    </p>

                    <div className={`my-4 p-4 rounded-2xl bg-gradient-to-br ${accentGradientSubtle} border border-gray-100`}>
                      <span className="text-xs text-gray-400 block mb-1">Số tiền cần thanh toán</span>
                      <span className={`${accentText} text-xl block`} style={{ fontWeight: 800 }}>{fmt(selected)}</span>
                    </div>

                    {/* Reopen button */}
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 underline mb-5"
                    >
                      Bấm vào đây nếu tab thanh toán chưa được mở
                    </a>

                    <div className="space-y-2">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCheckBalance}
                        className={`w-full py-3.5 rounded-2xl text-white text-sm bg-gradient-to-r ${accentGradient} shadow-md flex items-center justify-center gap-2`}
                        style={{ fontWeight: 700 }}
                      >
                        🔄 Kiểm tra lại số dư
                      </motion.button>

                      <button
                        onClick={() => setStep('select')}
                        className="w-full py-2.5 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition"
                        style={{ fontWeight: 500 }}
                      >
                        Quay lại chọn mệnh giá khác
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 2: QR Payment ── */}
                {step === 'qr' && selected && (
                  <motion.div
                    key="qr"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="p-5"
                  >
                    {/* Bank transfer header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${accentBg}`}>
                          <CreditCard className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-gray-800 text-xs" style={{ fontWeight: 700 }}>Chuyển khoản ngân hàng</p>
                          <p className="text-gray-400 text-[10px]">Quét mã QR bằng app ngân hàng</p>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full ${accentBgLight} ${accentText} text-[10px]`} style={{ fontWeight: 700 }}>
                        {fmt(selected)}
                      </div>
                    </div>

                    {/* QR Code area */}
                    <div className="relative mx-auto w-fit">
                      {/* Outer glow */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${accentGradient} opacity-10 rounded-3xl blur-xl`} />

                      <div className="relative bg-white rounded-2xl p-1 border border-gray-100 shadow-lg">
                        {/* Corner accents */}
                        <div className={`absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] rounded-tl-2xl ${isWorker ? 'border-blue-500' : 'border-orange-500'}`} />
                        <div className={`absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] rounded-tr-2xl ${isWorker ? 'border-blue-500' : 'border-orange-500'}`} />
                        <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] rounded-bl-2xl ${isWorker ? 'border-blue-500' : 'border-orange-500'}`} />
                        <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] rounded-br-2xl ${isWorker ? 'border-blue-500' : 'border-orange-500'}`} />

                        <div className="p-4">
                          <QRCodeSVG
                            value={qrValueRef.current}
                            size={180}
                            level="M"
                            includeMargin={false}
                            bgColor="#FFFFFF"
                            fgColor="#1a1a1a"
                          />
                        </div>

                        {/* SnapOn branding on QR */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                          <span style={{ fontWeight: 900, fontSize: '8px', color: accentColor }}>SNAP</span>
                        </div>
                      </div>
                    </div>

                    {/* Transfer details */}
                    <div className="mt-4 bg-gray-50 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Ngân hàng</span>
                        <span className="text-gray-700" style={{ fontWeight: 600 }}>SnapOn Pay</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Số tài khoản</span>
                        <span className="text-gray-700" style={{ fontWeight: 600 }}>8888 xxxx xxxx</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Số tiền</span>
                        <span className={accentText} style={{ fontWeight: 700 }}>{fmt(selected)}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className={`w-3.5 h-3.5 border-2 border-gray-200 rounded-full ${
                              isWorker ? 'border-t-blue-500' : 'border-t-orange-500'
                            }`}
                          />
                          <span className="text-gray-500" style={{ fontWeight: 500 }}>Đang xử lý thanh toán...</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span style={{ fontWeight: 600 }}>{countdown}s</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full bg-gradient-to-r ${accentGradient}`}
                          initial={{ width: '0%' }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.1, ease: 'linear' }}
                        />
                      </div>
                    </div>

                    {/* Security notice */}
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-gray-300">
                      <Shield className="w-3 h-3" />
                      <span>Giao dịch được mã hoá và bảo mật</span>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 3: Success ── */}
                {step === 'success' && selected && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', duration: 0.4 }}
                    className="p-6 text-center relative overflow-hidden"
                  >
                    {/* Confetti particles */}
                    <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <Particle key={i} delay={i * 0.05} isWorker={isWorker} />
                      ))}
                    </div>

                    {/* Success icon with glow */}
                    <div className="relative inline-block mb-5">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                        className="relative"
                      >
                        <div className="absolute inset-0 bg-green-400/20 rounded-full blur-xl scale-150" />
                        <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                          <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Title */}
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="text-gray-900 mb-1"
                      style={{ fontWeight: 800, fontSize: '1.25rem' }}
                    >
                      Nạp tiền thành công! 🎉
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35 }}
                      className="text-gray-400 text-sm mb-5"
                    >
                      Giao dịch đã được xác nhận
                    </motion.p>

                    {/* Transaction receipt */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-gray-50 rounded-2xl p-4 text-left space-y-2.5 mb-5 border border-gray-100"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Đã nạp</span>
                        <span className="text-green-600" style={{ fontWeight: 700 }}>+{fmt(selected)}</span>
                      </div>
                      <div className="w-full h-px bg-gray-200/60" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Số dư mới</span>
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-gray-900" style={{ fontWeight: 800 }}>{fmt(balance)}</span>
                        </div>
                      </div>
                      <div className="w-full h-px bg-gray-200/60" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">Mã giao dịch</span>
                        <span className="text-gray-400 font-mono text-[10px]">TXN-{Date.now().toString(36).toUpperCase()}</span>
                      </div>
                    </motion.div>

                    {/* Close button */}
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onClose}
                      className={`w-full py-4 rounded-2xl text-white text-sm bg-gradient-to-r ${accentGradient} hover:opacity-95 transition shadow-lg flex items-center justify-center gap-2`}
                      style={{ fontWeight: 700 }}
                    >
                      <Gift className="w-4 h-4" />
                      Tuyệt vời! Đóng
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}

      <BankSelectModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        selectedBank={bankName}
        onSelectBank={(selected) => setBankName(selected)}
      />
    </AnimatePresence>
  );
}
