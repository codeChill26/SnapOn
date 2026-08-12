import { Link } from 'react-router';
import {
  Clock, Users, ChevronRight, Flame, Image as ImageIcon,
  MapPin, Star, BadgeCheck, Sparkles, Zap, ArrowUpRight,
  Briefcase, CheckCircle2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Job, useApp } from '../context/AppContext';
import { CountdownTimer } from './CountdownTimer';
import { saveCurrentScrollPosition } from '../hooks/useScrollRestore';

interface JobCardProps {
  job: Job;
  workerDistance?: number;
  isWorker?: boolean;
}

const CATEGORY_STYLES: Record<string, {
  bg: string;
  text: string;
  gradient: string;
  bannerBg: string;
  iconBg: string;
  border: string;
  icon: string;
}> = {
  errands: {
    bg: 'bg-orange-50', text: 'text-orange-600',
    gradient: 'from-orange-500 to-amber-500',
    bannerBg: 'from-orange-500/15 via-amber-500/10 to-orange-500/5',
    iconBg: 'bg-orange-100 text-orange-600',
    border: 'hover:border-orange-300', icon: '🏃',
  },
  content: {
    bg: 'bg-pink-50', text: 'text-pink-600',
    gradient: 'from-pink-500 to-rose-500',
    bannerBg: 'from-pink-500/15 via-rose-500/10 to-pink-500/5',
    iconBg: 'bg-pink-100 text-pink-600',
    border: 'hover:border-pink-300', icon: '✍️',
  },
  design: {
    bg: 'bg-purple-50', text: 'text-purple-600',
    gradient: 'from-purple-500 to-indigo-500',
    bannerBg: 'from-purple-500/15 via-indigo-500/10 to-purple-500/5',
    iconBg: 'bg-purple-100 text-purple-600',
    border: 'hover:border-purple-300', icon: '🎨',
  },
  tech: {
    bg: 'bg-cyan-50', text: 'text-cyan-600',
    gradient: 'from-cyan-500 to-blue-500',
    bannerBg: 'from-cyan-500/15 via-blue-500/10 to-cyan-500/5',
    iconBg: 'bg-cyan-100 text-cyan-600',
    border: 'hover:border-cyan-300', icon: '💻',
  },
  carrying: {
    bg: 'bg-indigo-50', text: 'text-indigo-600',
    gradient: 'from-indigo-500 to-purple-500',
    bannerBg: 'from-indigo-500/15 via-purple-500/10 to-indigo-500/5',
    iconBg: 'bg-indigo-100 text-indigo-600',
    border: 'hover:border-indigo-300', icon: '📦',
  },
  photography: {
    bg: 'bg-rose-50', text: 'text-rose-600',
    gradient: 'from-rose-500 to-pink-500',
    bannerBg: 'from-rose-500/15 via-pink-500/10 to-rose-500/5',
    iconBg: 'bg-rose-100 text-rose-600',
    border: 'hover:border-rose-300', icon: '📸',
  },
  research: {
    bg: 'bg-teal-50', text: 'text-teal-600',
    gradient: 'from-teal-500 to-emerald-500',
    bannerBg: 'from-teal-500/15 via-emerald-500/10 to-teal-500/5',
    iconBg: 'bg-teal-100 text-teal-600',
    border: 'hover:border-teal-300', icon: '🔍',
  },
  manager: {
    bg: 'bg-amber-50', text: 'text-amber-600',
    gradient: 'from-amber-500 to-yellow-500',
    bannerBg: 'from-amber-500/15 via-yellow-500/10 to-amber-500/5',
    iconBg: 'bg-amber-100 text-amber-600',
    border: 'hover:border-amber-300', icon: '📋',
  },
  entertainment: {
    bg: 'bg-fuchsia-50', text: 'text-fuchsia-600',
    gradient: 'from-fuchsia-500 to-pink-500',
    bannerBg: 'from-fuchsia-500/15 via-pink-500/10 to-fuchsia-500/5',
    iconBg: 'bg-fuchsia-100 text-fuchsia-600',
    border: 'hover:border-fuchsia-300', icon: '🎭',
  },
  study: {
    bg: 'bg-blue-50', text: 'text-blue-600',
    gradient: 'from-blue-500 to-indigo-500',
    bannerBg: 'from-blue-500/15 via-indigo-500/10 to-blue-500/5',
    iconBg: 'bg-blue-100 text-blue-600',
    border: 'hover:border-blue-300', icon: '📚',
  },
  others: {
    bg: 'bg-slate-50', text: 'text-slate-600',
    gradient: 'from-slate-500 to-zinc-500',
    bannerBg: 'from-slate-500/15 via-zinc-500/10 to-slate-500/5',
    iconBg: 'bg-slate-100 text-slate-600',
    border: 'hover:border-slate-300', icon: '⚡',
  },
};

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0','') + 'tr';
  if (n >= 1000)    return (n / 1000).toFixed(0) + 'K';
  return n.toLocaleString('vi-VN');
}

export function JobCard({ job, workerDistance, isWorker }: JobCardProps) {
  const { currentUser } = useApp();
  const isActive = job.status === 'active' && (!job.expiresAt || job.expiresAt > Date.now());
  const isUrgent = isActive && job.expiresAt && job.expiresAt - Date.now() < 3 * 3600 * 1000 && job.expiresAt - Date.now() > 0;
  const isOwner = Boolean(currentUser?.id && (job.hirerId === currentUser.id || job.rawTask?.posterId === currentUser.id));

  const catStyle = CATEGORY_STYLES[job.category] || CATEGORY_STYLES.others;

  const rawTask = job.rawTask;
  const images = rawTask?.images || [];
  const hasImages = images.length > 0;
  const hashtags = rawTask?.hashtags || [];
  const workMode = rawTask?.workMode || 'REMOTE';
  const salaryUnit = rawTask?.salaryUnit || 'PER_JOB';
  const postType = rawTask?.postType || 'RECRUITMENT';
  const peopleNeeded = rawTask?.peopleNeeded || 1;

  const unitLabel =
    salaryUnit === 'PER_HOUR' ? '/giờ' :
    salaryUnit === 'PER_DAY' ? '/ngày' :
    salaryUnit === 'PER_MONTH' ? '/tháng' : '/việc';

  return (
    <Link
      to={`/job/${job.id}`}
      onClick={() => saveCurrentScrollPosition()}
      className="block group h-full"
    >
      <motion.div
        whileHover={{ y: -6, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.985 }}
        className={`relative h-full flex flex-col justify-between bg-white rounded-3xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/10 ${catStyle.border} ${
          isUrgent
            ? 'border-red-200 ring-1 ring-red-400/30'
            : isActive
            ? 'border-gray-200/80 hover:border-orange-300'
            : 'border-gray-200/60 opacity-85'
        }`}
      >
        {/* Top Accent Gradient Stripe */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${catStyle.gradient}`} />

        {/* ── CARD VISUAL HERO (Images OR Category Icon Showcase) ── */}
        <div className="relative w-full h-36 overflow-hidden bg-gradient-to-br border-b border-gray-100 flex items-center justify-center select-none"
          style={{ backgroundImage: hasImages ? undefined : undefined }}>
          {hasImages ? (
            <>
              <img
                src={images[0]}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              {images.length > 1 && (
                <span className="absolute bottom-2.5 right-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> +{images.length - 1} ảnh
                </span>
              )}
            </>
          ) : (
            /* Rich Illustrated Category Showcase with Centered Big Icon & ambient rings */
            <div className={`w-full h-full bg-gradient-to-br ${catStyle.bannerBg} flex flex-col items-center justify-center relative overflow-hidden`}>
              {/* Decorative background ambient circles */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/40 blur-xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/40 blur-xl pointer-events-none" />

              {/* Big Centered Category Icon Badge */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 3 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-md shadow-md border border-white flex items-center justify-center text-3xl group-hover:shadow-lg transition-shadow"
              >
                <span>{job.categoryIcon || catStyle.icon}</span>
              </motion.div>

              <span className={`text-[11px] font-extrabold mt-1.5 uppercase tracking-wider ${catStyle.text} drop-shadow-sm`}>
                {job.category}
              </span>
            </div>
          )}

          {/* Floating Badges Overlay (Top-Left & Top-Right) */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
            {postType === 'SERVICE_OFFER' ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-600 text-white shadow-sm flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> DV Thợ
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-orange-500 text-white shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Tuyển dụng
              </span>
            )}

            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-gray-800 shadow-sm">
              {workMode === 'REMOTE' ? '🌐 Online' : workMode === 'ONSITE' ? '📍 Tại chỗ' : '🤝 Linh hoạt'}
            </span>
          </div>

          <div className="absolute top-2.5 right-2.5 z-10">
            <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-sm ${
              isActive
                ? 'bg-emerald-500/90 text-white'
                : job.status === 'matched'
                ? 'bg-blue-500/90 text-white'
                : job.status === 'completed'
                ? 'bg-purple-500/90 text-white'
                : 'bg-gray-700/80 text-white'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>
                {isActive ? 'Đang mở' : job.status === 'matched' ? 'Đã chốt' : job.status === 'completed' ? 'Hoàn thành' : 'Đã đóng'}
              </span>
            </span>
          </div>
        </div>

        {/* ── CARD CONTENT BODY ── */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            {/* Title */}
            <h3 className="text-gray-950 font-extrabold text-base leading-snug group-hover:text-orange-600 transition-colors line-clamp-2 mb-2">
              {job.title}
            </h3>

            {/* Description */}
            <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-3">
              {job.description}
            </p>

            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {hashtags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Price Box */}
            <div className="bg-gradient-to-br from-orange-500/5 via-amber-500/10 to-orange-500/5 border border-orange-200/60 rounded-2xl p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Thù lao đề xuất</span>
                <span className="text-[11px] text-orange-600 font-extrabold bg-white px-2 py-0.5 rounded-md border border-orange-100">
                  {unitLabel}
                </span>
              </div>
              <div className="mt-1">
                <span className="text-gray-950 font-black text-lg md:text-xl text-orange-600">
                  {fmt(job.priceMin)}₫ – {fmt(job.priceMax)}₫
                </span>
              </div>
            </div>
          </div>

          {/* ── FOOTER & POSTER INFO ── */}
          <div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 mb-3 text-xs">
              {/* Poster Profile */}
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={job.hirerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${job.hirerName}`}
                  alt=""
                  className="w-6 h-6 rounded-full bg-orange-100 border border-gray-200 flex-shrink-0"
                />
                <span className="font-bold text-gray-800 truncate max-w-[120px]">
                  {job.hirerName}
                </span>
                <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              </div>

              {/* Location or distance */}
              {workerDistance !== undefined ? (
                <span className="font-bold text-blue-600 flex items-center gap-0.5 text-xs">
                  <MapPin className="w-3 h-3" /> {workerDistance.toFixed(1)} km
                </span>
              ) : job.location?.address ? (
                <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
                  {job.location.address.split(',')[0]}
                </span>
              ) : null}
            </div>

            {/* Bottom Row: Applicant Count (ONLY IF OWNER) or People Needed / Timer */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-xs text-gray-500">
                {/* 🔒 STRICT PRIVACY: Only show applicant count if current user is the owner */}
                {isOwner ? (
                  <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
                    <Users className="w-3.5 h-3.5" />
                    <span>{job.applicants.length} ứng viên</span>
                  </span>
                ) : peopleNeeded > 1 ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-gray-600 text-[11px]">
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    <span>Tuyển {peopleNeeded} người</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Sẵn sàng nhận</span>
                  </span>
                )}

                {/* Countdown Timer with fixed intelligent formatting */}
                {isActive && job.expiresAt && (
                  <CountdownTimer expiresAt={job.expiresAt} size="sm" />
                )}
              </div>

              <div className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
                <span>Xem chi tiết</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Urgent Bottom Warning */}
        {isUrgent && (
          <div className="bg-gradient-to-r from-red-500 via-orange-500 to-red-500 text-white text-center py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-extrabold tracking-wide uppercase">
            <Zap className="w-3.5 h-3.5 animate-bounce" />
            Sắp hết hạn — Ứng tuyển ngay!
          </div>
        )}
      </motion.div>
    </Link>
  );
}