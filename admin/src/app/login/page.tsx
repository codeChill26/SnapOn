'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  Mail, 
  Loader2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Zap, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  KeyRound,
  Building2
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/api/auth/login', {
        email,
        password,
      });

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Email hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@snapon.com');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#09090B] text-white flex items-center justify-center relative overflow-hidden font-sans p-4 lg:p-8">
      {/* Dynamic Ambient Background Lighting */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-orange-600/10 blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full bg-zinc-700/10 blur-[120px] pointer-events-none" />

      {/* Grid Background Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      {/* Main Container Container Card */}
      <div className="w-full max-w-5xl rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl relative z-10 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Side: Brand & Value Showcase (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#18181B] via-[#09090B] to-[#121215] p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Accent Light */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            {/* Logo Badge */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[#312F2C] border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <ShieldCheck className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  SnapOn <span className="text-amber-400 font-extrabold text-sm px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">ADMIN</span>
                </h1>
                <p className="text-[11px] text-zinc-400 font-medium">Trung Tâm Quản Trị Hệ Thống</p>
              </div>
            </div>

            {/* Hero Pitch */}
            <div className="mt-10 space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Nền tảng dịch vụ tiện ích số #1</span>
              </span>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight tracking-tight">
                Quản lý Dòng tiền & Kế toán Ký quỹ Minh bạch.
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                Hệ thống hỗ trợ đối soát tự động 100% doanh thu phí 8%, thanh toán nạp tiền VietQR PayOS và thực nhận 92% của người làm.
              </p>
            </div>

            {/* Feature List */}
            <div className="mt-8 space-y-3.5">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Ký Quỹ Đóng Băng Tự Động</h4>
                  <p className="text-[11px] text-zinc-400">Bảo vệ 100% giá trị hợp đồng giữa Người Thuê & Người Làm.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">VietQR PayOS Instant Sync</h4>
                  <p className="text-[11px] text-zinc-400">Xử lý giao dịch nạp rút ví tức thì qua mã ngân hàng.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Sổ Kế Toán Đối Soát Chuẩn Toán Học</h4>
                  <p className="text-[11px] text-zinc-400">Khớp 100% tổng đại số biến động số dư và doanh thu SnapOn.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Security Note */}
          <div className="mt-8 pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-semibold flex items-center justify-between">
            <span>Enterprise Security SSL 256-bit</span>
            <span>v2.4.0</span>
          </div>
        </div>

        {/* Right Side: Login Form (7 cols) */}
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-between bg-zinc-900/60 backdrop-blur-md">
          <div className="space-y-6">
            
            {/* Header */}
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Đăng Nhập Quản Trị
                <KeyRound className="h-5 w-5 text-amber-400" />
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                Vui lòng điền thông tin tài khoản được ủy quyền để truy cập hệ thống.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
                <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Địa chỉ Email Admin
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 pointer-events-none">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@snapon.com"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl py-3.5 pl-10 pr-4 text-xs font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                    Mật Khẩu Quản Trị
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 pointer-events-none">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl py-3.5 pl-10 pr-10 text-xs font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* One-Click Quick Fill Demo Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="w-full py-2.5 px-3 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800 text-amber-400 text-xs font-bold border border-amber-500/20 hover:border-amber-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Điền nhanh tài khoản Admin Demo (admin@snapon.com)</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-zinc-950 font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 text-xs uppercase tracking-wider disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang Xác Thực...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng Nhập Vào System</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Security Footer */}
          <div className="mt-8 pt-4 border-t border-zinc-800/80 text-center">
            <p className="text-[11px] text-zinc-400 font-semibold">
              Khu vực dành riêng cho Quản trị viên SnapOn. Mọi phiên đăng nhập đều được ghi nhật ký audit log.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
