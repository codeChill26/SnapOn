import React, { useEffect, useState } from 'react';
import { Home, Search, PlusCircle, User, Wallet, Activity, LogIn, LogOut, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLocation, useNavigate, Link, Outlet } from 'react-router';
import { SnapOnLogo } from './SnapOnLogo';
import api from '../../services/api';
import { AnimatePresence, motion } from 'motion/react';
import { WalletModal } from './WalletModal';

export function Layout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentUser,
    setUserRole,
    workerStatus,
    jobs,
    workerCurrentJobId,
    hirerWallet,
    workerWallet,
    topUpWallet,
    fetchProfile,
    firebaseUser,
    authLoading,
    logout,
  } = useApp();

  const [showWallet, setShowWallet] = useState(false);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState(false);

  // Listen to PayOS redirect search query params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const orderCode = searchParams.get('orderCode');
    const status = searchParams.get('status');
    const code = searchParams.get('code');

    if (orderCode && (status === 'PAID' || code === '00')) {
      const verifyPayOSPayment = async () => {
        try {
          const token = localStorage.getItem('firebaseToken');
          // Call check status API on backend to update database
          const res = await api.get(`/wallet/topup/payos/status/${orderCode}`);
          const statusData = res.data;
          if (statusData.success && statusData.data?.status === 'SUCCESS') {
              console.log('🎉 PayOS payment verified successfully!');
              // Re-fetch profile/wallet to show the updated balance
              await fetchProfile();
              setPaymentSuccessToast(true);
              setTimeout(() => {
                setPaymentSuccessToast(false);
              }, 5000);
            }
        } catch (err) {
          console.error('Error verifying payment status on redirect:', err);
        } finally {
          // Remove the PayOS parameters from URL search to keep URL clean and prevent double verification
          const cleanParams = new URLSearchParams(location.search);
          cleanParams.delete('orderCode');
          cleanParams.delete('status');
          cleanParams.delete('code');
          cleanParams.delete('id');
          cleanParams.delete('cancel');
          const newSearch = cleanParams.toString();
          navigate({
            pathname: location.pathname,
            search: newSearch ? `?${newSearch}` : '',
          }, { replace: true });
        }
      };

      verifyPayOSPayment();
    }
  }, [location.search, location.pathname, navigate, fetchProfile]);

  // Route protection
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      const protectedPaths = ['/profile', '/activity', '/post', '/worker'];
      if (protectedPaths.includes(location.pathname)) {
        navigate('/login');
      }
    }
  }, [authLoading, firebaseUser, location.pathname, navigate]);

  const isWorker = currentUser.role === 'worker';
  const isAdmin = currentUser.role === 'admin';
  const walletBalance = isWorker ? workerWallet : hirerWallet;

  const formatWallet = (n: number) => n.toLocaleString('vi-VN') + '₫';

  // Pages that belong exclusively to each role
  const HIRER_ONLY = ['/post'];
  const WORKER_ONLY = ['/worker'];
  const ADMIN_ONLY = ['/admin'];

  const navItems = [
    { path: '/', label: 'Trang chủ', icon: Home },
    { path: isWorker ? '/worker' : '/post', label: isWorker ? 'Tìm việc' : 'Đăng việc', icon: isWorker ? Search : PlusCircle },
    { path: '/profile', label: 'Hồ sơ', icon: User },
  ];

  const currentJob = workerCurrentJobId ? jobs.find(j => j.id === workerCurrentJobId) : null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Sidebar removed for Hirer/Worker */}



      {/* Header */}
      <header className={`sticky top-0 z-50 shadow-sm border-b transition-colors duration-300 ${isWorker
        ? 'bg-gradient-to-r from-blue-700 to-indigo-700 border-blue-600'
        : 'bg-gradient-to-r from-white via-orange-50 to-amber-50 border-orange-100'
        }`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <SnapOnLogo size="md" dark={isWorker} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {[
              { path: '/', label: 'Trang chủ' },
              ...(isWorker
                ? [{ path: '/worker', label: '🔍 Tìm việc' }]
                : [{ path: firebaseUser ? '/post' : '/login', label: '+ Đăng việc' }]
              ),
              ...(firebaseUser ? [
                { path: '/activity', label: '📊 Hoạt động' },
                { path: '/profile', label: '👤 Hồ sơ' }
              ] : [])
            ].map(({ path, label }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${active
                    ? isWorker ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'
                    : isWorker ? 'text-blue-100 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  style={{ fontWeight: active ? 600 : 400 }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: on-job indicator + account */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* On-job badge (worker mode) */}
            {isWorker && workerStatus === 'on_job' && currentJob && (
              <Link to={`/job/${currentJob.id}`} className="hidden sm:flex items-center gap-1.5 bg-green-400/20 border border-green-400/40 text-green-200 text-xs px-3 py-1.5 rounded-full" style={{ fontWeight: 600 }}>
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Đang làm việc
              </Link>
            )}

            {/* Wallet badge */}
            {firebaseUser && !isAdmin && (
              <button
                onClick={() => setShowWallet(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer hover:opacity-80 transition ${isWorker
                  ? 'bg-white/15 border border-white/20 text-white'
                  : 'bg-orange-50 border border-orange-200 text-orange-700'
                  }`} style={{ fontWeight: 600 }}>
                <Wallet className="w-3.5 h-3.5" />
                <span>{formatWallet(walletBalance)}</span>
              </button>
            )}

            {firebaseUser ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border transition ${
                    isWorker
                      ? 'border-blue-300 bg-blue-50/50 hover:bg-blue-100/50'
                      : 'border-orange-200 bg-orange-50 hover:bg-orange-100'
                  }`}
                >
                  <img
                    src={
                      currentUser.avatar ||
                      firebaseUser.photoURL ||
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=HirerUser'
                    }
                    alt={currentUser.name || firebaseUser.displayName || 'User'}
                    className="w-7 h-7 rounded-full bg-white"
                  />

                  <div className="text-left">
                    <p className="text-xs text-gray-800 leading-tight" style={{ fontWeight: 700 }}>
                      {currentUser.name || firebaseUser.displayName || 'Guest'}
                    </p>
                    <p className={`text-xs leading-tight ${isWorker ? 'text-blue-200' : 'text-orange-500'}`}>
                      {isWorker ? 'Người tìm việc' : 'Người thuê việc'}
                    </p>
                  </div>
                </Link>

                <button
                  onClick={() => setUserRole(isWorker ? 'hirer' : 'worker')}
                  className={`px-3 py-1.5 rounded-full text-xs transition border flex items-center gap-1 cursor-pointer ${
                    isWorker
                      ? 'border-blue-400 bg-blue-600 hover:bg-blue-500 text-white'
                      : 'border-orange-300 bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  🔄 {isWorker ? 'Thuê việc' : 'Tìm việc'}
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs transition cursor-pointer"
                  style={{ fontWeight: 600 }}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full shadow-sm transition"
                style={{ fontWeight: 700 }}
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập / Đăng ký</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Worker on-job sticky banner */}
      {isWorker && workerStatus === 'on_job' && currentJob && (
        <div className="bg-green-600 text-white py-2.5 px-4 sticky top-16 z-40 shadow-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-sm" style={{ fontWeight: 600 }}>
                Đang nhận việc: <span className="text-green-200">{currentJob.title}</span>
              </span>
              <span className="text-green-300 text-sm hidden sm:inline">— {currentJob.hirerName}</span>
            </div>
            <Link
              to={`/job/${currentJob.id}`}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition flex-shrink-0"
              style={{ fontWeight: 600 }}
            >
              Xem chi tiết →
            </Link>
          </div>
        </div>
      )}

      {/* Main content with page transitions */}
      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Floating Action Button (mobile) ── */}
      <AnimatePresence>
        {!isWorker && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className="md:hidden fixed bottom-[76px] right-4 z-40"
          >
            <Link
              to="/post"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white pl-4 pr-5 py-3 rounded-full shadow-xl shadow-orange-200 transition"
              style={{ fontWeight: 700 }}
            >
              <PlusCircle className="w-5 h-5" />
              Đăng việc
            </Link>
          </motion.div>
        )}
        {isWorker && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className="md:hidden fixed bottom-[76px] right-4 z-40"
          >
            <Link
              to="/worker"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white pl-4 pr-5 py-3 rounded-full shadow-xl shadow-blue-200 transition"
              style={{ fontWeight: 700 }}
            >
              <Search className="w-5 h-5" />
              Tìm việc
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t z-50 safe-area-inset-bottom ${isWorker ? 'bg-blue-700 border-blue-600' : 'bg-white border-gray-100'
        }`}>
        <div className="flex items-center justify-around h-16">
          {[
            { path: '/', label: 'Trang chủ', icon: Home },
            isWorker
              ? { path: '/worker', label: 'Tìm việc', icon: Search }
              : { path: firebaseUser ? '/post' : '/login', label: 'Đăng việc', icon: PlusCircle },
            { path: '/activity', label: 'Hoạt động', icon: Activity },
            { path: firebaseUser ? '/profile' : '/login', label: firebaseUser ? 'Hồ sơ' : 'Đăng nhập', icon: User },
          ].map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-all ${isWorker
                  ? active ? 'text-white' : 'text-blue-300'
                  : active ? 'text-orange-500' : 'text-gray-400'
                  }`}
              >
                {path === '/profile' ? (
                  <div className="relative">
                    <img
                      src={currentUser.avatar}
                      alt=""
                      className={`w-6 h-6 rounded-full border-2 ${active
                        ? isWorker ? 'border-white' : 'border-orange-400'
                        : isWorker ? 'border-blue-500' : 'border-gray-200'
                        }`}
                    />
                    {workerStatus === 'on_job' && isWorker && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-blue-700" />
                    )}
                  </div>
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span className="text-xs" style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Success toast */}
      <AnimatePresence>
        {paymentSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-green-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span style={{ fontWeight: 600 }}>Nạp tiền thành công! Số dư ví của bạn đã được cập nhật 🎉</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallet Modal */}
      <WalletModal
        open={showWallet}
        onClose={() => setShowWallet(false)}
        balance={walletBalance}
        isWorker={isWorker}
        onTopUp={(amount) => topUpWallet(isWorker ? 'worker' : 'hirer', amount)}
      />

      {/* Footer */}
      <footer className="hidden md:block bg-gray-900 text-gray-400 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <SnapOnLogo size="sm" dark={true} />
          </div>
          <p className="text-sm">Nền tảng kết nối việc làm ngắn hạn — Nhanh · Gần · Tin cậy</p>
        </div>
      </footer>
    </div>
  );
}