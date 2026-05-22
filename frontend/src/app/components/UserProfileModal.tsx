import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Star, MapPin, Shield, BadgeCheck, Clock, Briefcase,
  ThumbsUp, Zap, ChevronRight, Phone, Award, TrendingUp,
  DollarSign, Users, MessageCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
export interface HirerProfileData {
  type: 'hirer';
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  memberSince: string;
  jobsPosted: number;
  jobsCompleted: number;
  area: string;
  totalSpent?: number;
  verified?: boolean;
  recentReviews?: Array<{ name: string; avatar: string; rating: number; text: string; date: string }>;
}

export interface WorkerProfileData {
  type: 'worker';
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  skills: string[];
  bio: string;
  responseTime?: string;
  satisfactionRate?: number;
  area?: string;
  distance?: number;
  bidPrice?: number;
  priceMin?: number;
  priceMax?: number;
  verified?: boolean;
  recentReviews?: Array<{ name: string; avatar: string; rating: number; text: string; date: string }>;
}

type ProfileData = HirerProfileData | WorkerProfileData;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileData;
}

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${sz} ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" />
      ))}
    </div>
  );
}

// ─── Hirer Profile ────────────────────────────────────────────
function HirerView({ data }: { data: HirerProfileData }) {
  const positiveRate = data.recentReviews
    ? Math.round(data.recentReviews.filter(r => r.rating >= 4).length / data.recentReviews.length * 100)
    : 95;

  return (
    <>
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-6 pt-6 pb-8 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full" />
        <div className="relative flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <img src={data.avatar} alt={data.name} className="w-16 h-16 rounded-2xl border-2 border-white/30 shadow-lg bg-orange-300" />
            {data.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                <BadgeCheck className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white" style={{ fontWeight: 800, fontSize: '1.15rem' }}>{data.name}</h2>
            <p className="text-orange-100 text-xs mt-0.5">Người thuê · Thành viên từ {data.memberSince}</p>
            <div className="flex items-center gap-2 mt-2">
              <Stars rating={data.rating} size="sm" />
              <span className="text-white text-xs" style={{ fontWeight: 700 }}>{data.rating.toFixed(1)}</span>
              <span className="text-orange-200 text-xs">({data.reviewCount} đánh giá)</span>
            </div>
          </div>
          <span className="flex-shrink-0 bg-white/20 text-white text-xs px-2.5 py-1 rounded-full border border-white/30" style={{ fontWeight: 600 }}>
            🏅 Tin cậy
          </span>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/20">
          <div className="text-center">
            <div className="text-white" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{data.jobsPosted}</div>
            <div className="text-orange-100 text-xs">Đã đăng</div>
          </div>
          <div className="text-center">
            <div className="text-white" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{data.jobsCompleted}</div>
            <div className="text-orange-100 text-xs">Hoàn thành</div>
          </div>
          <div className="text-center">
            <div className="text-white" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{positiveRate}%</div>
            <div className="text-orange-100 text-xs">Hài lòng</div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 py-4 space-y-4">
        {/* Trust badges */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <Shield className="w-4 h-4 text-green-500" />, label: 'CMND xác minh', bg: 'bg-green-50', text: 'text-green-700' },
            { icon: <Zap className="w-4 h-4 text-orange-500" />, label: 'Thanh toán nhanh', bg: 'bg-orange-50', text: 'text-orange-700' },
            { icon: <TrendingUp className="w-4 h-4 text-blue-500" />, label: `${Math.round(data.jobsCompleted / (data.jobsPosted || 1) * 100)}% hoàn thành`, bg: 'bg-blue-50', text: 'text-blue-700' },
            { icon: <MapPin className="w-4 h-4 text-purple-500" />, label: data.area, bg: 'bg-purple-50', text: 'text-purple-700' },
          ].map((b, i) => (
            <div key={i} className={`flex items-center gap-2 ${b.bg} rounded-xl px-3 py-2`}>
              {b.icon}
              <span className={`text-xs ${b.text} truncate`} style={{ fontWeight: 500 }}>{b.label}</span>
            </div>
          ))}
        </div>

        {/* Reviews */}
        {data.recentReviews && data.recentReviews.length > 0 && (
          <div>
            <h3 className="text-gray-900 text-sm mb-3" style={{ fontWeight: 700 }}>
              ⭐ Nhận xét từ người lao động
            </h3>
            <div className="space-y-2.5">
              {data.recentReviews.slice(0, 3).map((r, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <img src={r.avatar} alt={r.name} className="w-7 h-7 rounded-full border border-gray-200 bg-gray-100" />
                    <span className="text-gray-800 text-xs" style={{ fontWeight: 600 }}>{r.name}</span>
                    <Stars rating={r.rating} size="sm" />
                    <span className="text-gray-400 text-xs ml-auto">{r.date}</span>
                  </div>
                  <p className="text-gray-600 text-xs leading-relaxed">"{r.text}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Worker Profile ───────────────────────────────────────────
function WorkerView({ data }: { data: WorkerProfileData }) {
  const bidRatio = data.bidPrice && data.priceMin !== undefined && data.priceMax !== undefined
    ? (data.bidPrice - data.priceMin) / ((data.priceMax - data.priceMin) || 1)
    : null;
  const competitiveness = bidRatio !== null
    ? bidRatio < 0.3 ? { label: '🔥 Rất cạnh tranh', color: 'text-green-700', bg: 'bg-green-50 border-green-200' }
      : bidRatio < 0.6 ? { label: '✅ Cạnh tranh tốt', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' }
      : { label: '⚖️ Trung bình', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' }
    : null;

  return (
    <>
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-6 pb-8 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full" />
        <div className="relative flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <img src={data.avatar} alt={data.name} className="w-16 h-16 rounded-2xl border-2 border-white/30 shadow-lg bg-blue-400" />
            {data.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                <BadgeCheck className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white" style={{ fontWeight: 800, fontSize: '1.15rem' }}>{data.name}</h2>
            <p className="text-blue-200 text-xs mt-0.5">Người lao động · {data.area ?? 'TP.HCM'}</p>
            <div className="flex items-center gap-2 mt-2">
              <Stars rating={data.rating} size="sm" />
              <span className="text-white text-xs" style={{ fontWeight: 700 }}>{data.rating.toFixed(1)}</span>
              <span className="text-blue-200 text-xs">({data.reviewCount} đánh giá)</span>
            </div>
          </div>
          <span className="flex-shrink-0 bg-white/20 text-white text-xs px-2.5 py-1 rounded-full border border-white/30" style={{ fontWeight: 600 }}>
            ✅ Xác minh
          </span>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-white/20">
          {[
            { v: data.completedJobs, l: 'Việc done' },
            { v: data.satisfactionRate ? data.satisfactionRate + '%' : '98%', l: 'Hài lòng' },
            { v: data.responseTime ?? '< 5 phút', l: 'Phản hồi' },
            { v: data.distance ? data.distance.toFixed(1) + 'km' : '—', l: 'Khoảng cách' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-white" style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>{s.v}</div>
              <div className="text-blue-200" style={{ fontSize: '0.6rem', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="px-5 py-4 space-y-4">
        {/* Bid card — only shown in hirer context */}
        {data.bidPrice !== undefined && competitiveness && (
          <div className={`border rounded-2xl p-4 ${competitiveness.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ fontWeight: 700 }}>💰 Giá chào</span>
              <span className={`${competitiveness.color} text-sm`} style={{ fontWeight: 800 }}>
                {data.bidPrice.toLocaleString('vi-VN')}₫
              </span>
            </div>
            {data.priceMin !== undefined && data.priceMax !== undefined && (
              <div className="mb-2.5">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{data.priceMin.toLocaleString('vi-VN')}₫</span>
                  <span>{data.priceMax.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(bidRatio ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <span className={`text-xs ${competitiveness.color}`} style={{ fontWeight: 600 }}>
              {competitiveness.label}
            </span>
          </div>
        )}

        {/* Bio */}
        {data.bio && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-gray-900 text-xs mb-2 flex items-center gap-1.5" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <MessageCircle className="w-3.5 h-3.5 text-gray-400" /> Giới thiệu
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">{data.bio}</p>
          </div>
        )}

        {/* Skills */}
        {data.skills && data.skills.length > 0 && (
          <div>
            <h3 className="text-gray-500 text-xs mb-2" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kỹ năng</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map(s => (
                <span key={s} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-2.5 py-1 rounded-full" style={{ fontWeight: 500 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Trust badges */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <Shield className="w-4 h-4 text-green-500" />, label: 'CMND xác minh', bg: 'bg-green-50', text: 'text-green-700' },
            { icon: <Award className="w-4 h-4 text-yellow-500" />, label: '100% hoàn thành', bg: 'bg-yellow-50', text: 'text-yellow-700' },
            { icon: <Zap className="w-4 h-4 text-orange-500" />, label: data.responseTime ?? '< 5 phút', bg: 'bg-orange-50', text: 'text-orange-700' },
            { icon: <ThumbsUp className="w-4 h-4 text-blue-500" />, label: `Top 15% khu vực`, bg: 'bg-blue-50', text: 'text-blue-700' },
          ].map((b, i) => (
            <div key={i} className={`flex items-center gap-2 ${b.bg} rounded-xl px-3 py-2`}>
              {b.icon}
              <span className={`text-xs ${b.text} truncate`} style={{ fontWeight: 500 }}>{b.label}</span>
            </div>
          ))}
        </div>

        {/* Reviews */}
        {data.recentReviews && data.recentReviews.length > 0 && (
          <div>
            <h3 className="text-gray-900 text-sm mb-3" style={{ fontWeight: 700 }}>
              ⭐ Đánh giá gần đây
            </h3>
            <div className="space-y-2.5">
              {data.recentReviews.slice(0, 3).map((r, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <img src={r.avatar} alt={r.name} className="w-7 h-7 rounded-full border border-gray-200 bg-gray-100" />
                    <span className="text-gray-800 text-xs" style={{ fontWeight: 600 }}>{r.name}</span>
                    <Stars rating={r.rating} size="sm" />
                    <span className="text-gray-400 text-xs ml-auto">{r.date}</span>
                  </div>
                  <p className="text-gray-600 text-xs leading-relaxed">"{r.text}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Modal Component ─────────────────────────────────────
export function UserProfileModal({ isOpen, onClose, profile }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const isHirer = profile.type === 'hirer';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[9998] backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-1/2 md:-translate-x-1/2 z-[9999] w-full md:max-w-md"
          >
            <div className="bg-white md:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-0 md:hidden sticky top-0 bg-transparent z-10">
                <div className="w-10 h-1 rounded-full bg-white/60" />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className={`absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition ${isHirer ? 'bg-white/20 hover:bg-white/30' : 'bg-white/20 hover:bg-white/30'}`}
              >
                <X className="w-4 h-4 text-white" />
              </button>

              {/* Content */}
              {isHirer
                ? <HirerView data={profile as HirerProfileData} />
                : <WorkerView data={profile as WorkerProfileData} />
              }

              {/* Bottom padding for mobile safe area */}
              <div className="h-6" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
