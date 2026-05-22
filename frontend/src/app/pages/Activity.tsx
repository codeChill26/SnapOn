import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Briefcase, Clock, CheckCircle2, Users, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownLeft, ChevronRight, MapPin, Star,
  Zap, Wallet, CircleDollarSign, Timer,
  Sparkles, AlertCircle, BarChart3, Activity as ActivityIcon, XCircle,
  Search, SlidersHorizontal, X, Globe, User, ArrowUpDown,
  Flame, Eye, Heart, ChevronDown, TrendingUp as TUp, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp, DEMO_WORKER, CATEGORIES, type Job } from '../context/AppContext';

const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫';
const fmtShort = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
};
const timeAgo = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return `${Math.floor(diff / 86400000)} ngày trước`;
};
const timeLeft = (expires: number) => {
  const diff = expires - Date.now();
  if (diff <= 0) return 'Đã hết hạn';
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} phút`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

type TabFilter = 'all' | 'active' | 'matched' | 'completed' | 'expired';
type MainTab = 'mine' | 'community';
type SortOption = 'newest' | 'price_high' | 'price_low' | 'applicants' | 'expiring';

const STATUS_CONFIG = {
  active: { label: 'Đang tuyển', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
  matched: { label: 'Đã ghép', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400' },
  completed: { label: 'Hoàn thành', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-400' },
  expired: { label: 'Hết hạn', icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-300' },
};

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'price_high', label: 'Giá cao → thấp' },
  { key: 'price_low', label: 'Giá thấp → cao' },
  { key: 'applicants', label: 'Nhiều ứng viên' },
  { key: 'expiring', label: 'Sắp hết hạn' },
];

const PRICE_RANGES = [
  { label: 'Tất cả', min: 0, max: Infinity },
  { label: '< 100K', min: 0, max: 100000 },
  { label: '100K - 300K', min: 100000, max: 300000 },
  { label: '300K - 500K', min: 300000, max: 500000 },
  { label: '500K - 1M', min: 500000, max: 1000000 },
  { label: '> 1M', min: 1000000, max: Infinity },
];

const DURATION_FILTERS = [
  { label: 'Tất cả', max: Infinity },
  { label: '≤ 1h', max: 1 },
  { label: '1-2h', max: 2 },
  { label: '2-3h', max: 3 },
];

// ═══════════════════════════════════════════════════════
//  STAT CARD
// ═══════════════════════════════════════════════════════
function StatCard({ icon: Icon, label, value, sub, gradient, delay }: {
  icon: any; label: string; value: string; sub?: string;
  gradient: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${gradient} border border-white/50 shadow-sm`}
    >
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
      <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white/5 rounded-full" />
      <div className="relative z-10">
        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <p className="text-white/70 text-xs mb-0.5" style={{ fontWeight: 500 }}>{label}</p>
        <p className="text-white" style={{ fontWeight: 800, fontSize: '1.35rem' }}>{value}</p>
        {sub && <p className="text-white/50 text-[10px] mt-1" style={{ fontWeight: 500 }}>{sub}</p>}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
//  MY ACTIVITY - JOB CARD
// ═══════════════════════════════════════════════════════
function JobActivityCard({ job, isWorker, index }: { job: Job; isWorker: boolean; index: number }) {
  const sc = STATUS_CONFIG[job.status];
  const matchedWorker = job.aiMatchId ? job.applicants.find(a => a.workerId === job.aiMatchId) : null;
  const demoApplied = job.applicants.some(a => a.workerId === DEMO_WORKER.id);
  const demoApplicant = job.applicants.find(a => a.workerId === DEMO_WORKER.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <Link
        to={`/job/${job.id}`}
        className="block bg-white rounded-2xl border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all group"
      >
        <div className={`h-1 rounded-t-2xl ${
          job.status === 'active' ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
          job.status === 'matched' ? 'bg-gradient-to-r from-blue-400 to-indigo-400' :
          job.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-emerald-400' :
          'bg-gray-200'
        }`} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{job.categoryIcon}</span>
                <h3 className="text-gray-900 text-sm truncate" style={{ fontWeight: 700 }}>{job.title}</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location.address.split(',').slice(0, 2).join(',')}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(job.postedAt)}</span>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] ${sc.bg} ${sc.color} border ${sc.border} flex-shrink-0`} style={{ fontWeight: 600 }}>
              <div className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${job.status === 'active' ? 'animate-pulse' : ''}`} />
              {sc.label}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${isWorker ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`} style={{ fontWeight: 700 }}>
              <CircleDollarSign className="w-3 h-3" />{fmt(job.price)}
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 text-xs" style={{ fontWeight: 500 }}>
              <Timer className="w-3 h-3" />{job.duration}h
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 text-xs" style={{ fontWeight: 500 }}>
              <Users className="w-3 h-3" />{job.applicants.length} ứng viên
            </div>
          </div>
          <div className="pt-3 border-t border-gray-50">
            {isWorker ? (
              demoApplied && demoApplicant ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={job.hirerAvatar} alt="" className="w-7 h-7 rounded-full bg-gray-100" />
                    <div>
                      <p className="text-gray-600 text-xs" style={{ fontWeight: 600 }}>{job.hirerName}</p>
                      <p className="text-gray-400 text-[10px]">Báo giá: <span className="text-blue-600" style={{ fontWeight: 700 }}>{fmt(demoApplicant.bidPrice)}</span></p>
                    </div>
                  </div>
                  {job.status === 'matched' && job.aiMatchId === DEMO_WORKER.id && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600 text-[10px]" style={{ fontWeight: 700 }}><Sparkles className="w-3 h-3" />Bạn được chọn!</div>
                  )}
                  {job.status === 'matched' && job.aiMatchId !== DEMO_WORKER.id && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-gray-400 text-[10px]" style={{ fontWeight: 600 }}>Không được chọn</div>
                  )}
                  {job.status === 'completed' && job.aiMatchId === DEMO_WORKER.id && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600 text-[10px]" style={{ fontWeight: 700 }}><ArrowDownLeft className="w-3 h-3" />+{fmt(job.price)}</div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-xs"><img src={job.hirerAvatar} alt="" className="w-6 h-6 rounded-full bg-gray-100" /><span>{job.hirerName}</span></div>
              )
            ) : (
              <>
                <div className="flex items-center justify-between">
                  {job.applicants.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {job.applicants.slice(0, 4).map((a, i) => (
                          <img key={a.workerId} src={a.avatar} alt="" className="w-7 h-7 rounded-full border-2 border-white bg-gray-100" style={{ zIndex: 4 - i }} />
                        ))}
                        {job.applicants.length > 4 && (
                          <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] text-gray-500" style={{ fontWeight: 700 }}>+{job.applicants.length - 4}</div>
                        )}
                      </div>
                      {job.status === 'active' && <span className="text-gray-400 text-[10px]">đang chờ duyệt</span>}
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" />Chưa có ứng viên</span>
                  )}
                  {job.status === 'matched' && <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-500 text-[10px]" style={{ fontWeight: 700 }}><ArrowUpRight className="w-3 h-3" />-{fmt(job.price)}</div>}
                  {job.status === 'completed' && <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600 text-[10px]" style={{ fontWeight: 700 }}><CheckCircle2 className="w-3 h-3" />Đã thanh toán</div>}
                </div>
                {(job.status === 'matched' || job.status === 'completed') && matchedWorker && (
                  <div className="mt-2.5 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <img src={matchedWorker.avatar} alt="" className="w-6 h-6 rounded-full bg-gray-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 text-xs truncate" style={{ fontWeight: 600 }}>{matchedWorker.name}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400"><Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />{matchedWorker.rating} · {matchedWorker.completedJobs} việc</div>
                    </div>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="px-4 py-2.5 border-t border-gray-50 flex items-center justify-between text-xs text-gray-300 group-hover:text-gray-500 transition">
          <span style={{ fontWeight: 500 }}>Xem chi tiết</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
//  TRANSACTION TIMELINE ITEM
// ═══════════════════════════════════════════════════════
function TransactionItem({ type, amount, label, time, isLast }: {
  type: 'in' | 'out'; amount: number; label: string; time: string; isLast: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${type === 'in' ? 'bg-green-50' : 'bg-red-50'}`}>
          {type === 'in' ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" /> : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />}
        </div>
        {!isLast && <div className="w-px h-6 bg-gray-100 mt-1" />}
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-gray-700 text-xs truncate" style={{ fontWeight: 600 }}>{label}</p>
          <span className={`text-xs flex-shrink-0 ${type === 'in' ? 'text-green-600' : 'text-red-500'}`} style={{ fontWeight: 700 }}>{type === 'in' ? '+' : '-'}{fmt(amount)}</span>
        </div>
        <p className="text-gray-300 text-[10px] mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  COMMUNITY EXPLORE CARD
// ═══════════════════════════════════════════════════════
function ExploreJobCard({ job, index, isWorker }: { job: Job; index: number; isWorker: boolean }) {
  const isActive = job.status === 'active';
  const remaining = timeLeft(job.expiresAt);
  const isUrgent = job.expiresAt - Date.now() < 300000 && isActive; // < 5 min
  const isHot = job.applicants.length >= 3;
  const pricePerHour = Math.round(job.price / job.duration);
  const competitionLevel = job.applicants.length === 0 ? 'Dễ' : job.applicants.length < 3 ? 'Vừa' : 'Cao';
  const competitionColor = job.applicants.length === 0 ? 'text-green-500' : job.applicants.length < 3 ? 'text-amber-500' : 'text-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.4, type: 'spring', bounce: 0.1 }}
      layout
    >
      <Link
        to={`/job/${job.id}`}
        className="block bg-white rounded-2xl border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
      >
        {/* Gradient accent */}
        <div className={`h-1.5 ${
          isUrgent
            ? 'bg-gradient-to-r from-red-500 via-rose-400 to-pink-500'
            : isActive
              ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400'
              : 'bg-gradient-to-r from-gray-200 to-gray-300'
        }`} />

        {/* Badges floating top-right */}
        <div className="absolute top-4 right-3 flex flex-col gap-1.5 items-end z-10">
          {isUrgent && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px]"
              style={{ fontWeight: 700 }}
            >
              <Flame className="w-3 h-3" />
              Sắp hết!
            </motion.div>
          )}
          {isHot && !isUrgent && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px]" style={{ fontWeight: 700 }}>
              <Flame className="w-3 h-3" />
              Hot
            </div>
          )}
        </div>

        <div className="p-4 pb-3">
          {/* Category + Title */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-xl flex-shrink-0 border border-gray-100 group-hover:scale-110 transition-transform">
              {job.categoryIcon}
            </div>
            <div className="flex-1 min-w-0 pr-14">
              <h3 className="text-gray-900 text-sm mb-1 group-hover:text-gray-700 transition-colors" style={{ fontWeight: 700 }}>
                {job.title}
              </h3>
              <p className="text-gray-400 text-xs line-clamp-1">{job.description}</p>
            </div>
          </div>

          {/* Price + Meta row */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {/* Price pill — gradient */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white ${
              isWorker
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                : 'bg-gradient-to-r from-orange-500 to-amber-500'
            }`} style={{ fontWeight: 800 }}>
              <CircleDollarSign className="w-3.5 h-3.5" />
              {fmt(job.price)}
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-50 text-gray-500 text-xs border border-gray-100" style={{ fontWeight: 500 }}>
              <Timer className="w-3 h-3" />{job.duration}h
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-50 text-gray-500 text-xs border border-gray-100" style={{ fontWeight: 500 }}>
              ~{fmt(pricePerHour)}/h
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{job.location.address}</span>
          </div>

          {/* Bottom info bar */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            {/* Left: hirer info */}
            <div className="flex items-center gap-2">
              <img src={job.hirerAvatar} alt="" className="w-6 h-6 rounded-full bg-gray-100" />
              <span className="text-gray-500 text-xs" style={{ fontWeight: 500 }}>{job.hirerName}</span>
            </div>

            {/* Right: stats */}
            <div className="flex items-center gap-3 text-[11px]">
              {/* Applicants */}
              <div className="flex items-center gap-1 text-gray-400">
                <Users className="w-3 h-3" />
                <span style={{ fontWeight: 600 }}>{job.applicants.length}</span>
              </div>
              {/* Competition */}
              <div className={`flex items-center gap-1 ${competitionColor}`}>
                <TUp className="w-3 h-3" />
                <span style={{ fontWeight: 600 }}>{competitionLevel}</span>
              </div>
              {/* Time left */}
              {isActive && (
                <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-500' : 'text-gray-400'}`}>
                  <Clock className="w-3 h-3" />
                  <span style={{ fontWeight: 600 }}>{remaining}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover reveal: View button */}
        <div className="px-4 py-2.5 border-t border-gray-50 flex items-center justify-between text-xs text-gray-300 group-hover:text-gray-500 transition-all">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3 h-3" />
            <span style={{ fontWeight: 500 }}>Xem chi tiết & ứng tuyển</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════
//  MAIN ACTIVITY PAGE
// ═══════════════════════════════════════════════════════
export default function Activity() {
  const { jobs, currentUser, hirerWallet, workerWallet } = useApp();
  const isWorker = currentUser.role === 'worker';
  const [mainTab, setMainTab] = useState<MainTab>('mine');
  const [filter, setFilter] = useState<TabFilter>('all');

  // Community filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState(0); // index
  const [durationFilter, setDurationFilter] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── My Activity data ──
  const relevantJobs = useMemo(() => {
    if (isWorker) {
      return jobs.filter(j => j.applicants.some(a => a.workerId === DEMO_WORKER.id) || j.aiMatchId === DEMO_WORKER.id);
    }
    return jobs.filter(j => j.hirerName === currentUser.name);
  }, [jobs, isWorker, currentUser.name]);

  const filteredMyJobs = useMemo(() => {
    if (filter === 'all') return relevantJobs;
    return relevantJobs.filter(j => j.status === filter);
  }, [relevantJobs, filter]);

  const stats = useMemo(() => {
    const active = relevantJobs.filter(j => j.status === 'active').length;
    const matched = relevantJobs.filter(j => j.status === 'matched').length;
    const completed = relevantJobs.filter(j => j.status === 'completed').length;
    const totalSpent = relevantJobs.filter(j => j.status === 'matched' || j.status === 'completed').reduce((s, j) => s + j.price, 0);
    const totalEarned = relevantJobs.filter(j => j.status === 'completed' && j.aiMatchId === DEMO_WORKER.id).reduce((s, j) => s + j.price, 0);
    return { active, matched, completed, total: relevantJobs.length, totalSpent, totalEarned };
  }, [relevantJobs]);

  const transactions = useMemo(() => {
    const txns: { type: 'in' | 'out'; amount: number; label: string; time: string }[] = [];
    relevantJobs.forEach(j => {
      if (isWorker) {
        if (j.status === 'completed' && j.aiMatchId === DEMO_WORKER.id) txns.push({ type: 'in', amount: j.price, label: j.title, time: timeAgo(j.postedAt) });
      } else {
        if (j.status === 'matched' || j.status === 'completed') txns.push({ type: 'out', amount: j.price, label: j.title, time: timeAgo(j.postedAt) });
      }
    });
    return txns.slice(0, 5);
  }, [relevantJobs, isWorker]);

  const MY_FILTERS: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: relevantJobs.length },
    { key: 'active', label: 'Đang tuyển', count: stats.active },
    { key: 'matched', label: 'Đã ghép', count: stats.matched },
    { key: 'completed', label: 'Hoàn thành', count: stats.completed },
  ];

  // ── Community data ──
  const communityJobs = useMemo(() => {
    let list = [...jobs];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.location.address.toLowerCase().includes(q) ||
        j.hirerName.toLowerCase().includes(q)
      );
    }

    // Category
    if (selectedCategory) {
      list = list.filter(j => j.category === selectedCategory);
    }

    // Price range
    const pr = PRICE_RANGES[priceRange];
    if (pr.max !== Infinity || pr.min !== 0) {
      list = list.filter(j => j.price >= pr.min && j.price < (pr.max === Infinity ? 999999999 : pr.max));
    }

    // Duration
    const df = DURATION_FILTERS[durationFilter];
    if (df.max !== Infinity) {
      const minDur = durationFilter === 2 ? 1 : durationFilter === 3 ? 2 : 0;
      list = list.filter(j => j.duration >= minDur && j.duration <= df.max);
    }

    // Sort
    switch (sortBy) {
      case 'newest': list.sort((a, b) => b.postedAt - a.postedAt); break;
      case 'price_high': list.sort((a, b) => b.price - a.price); break;
      case 'price_low': list.sort((a, b) => a.price - b.price); break;
      case 'applicants': list.sort((a, b) => b.applicants.length - a.applicants.length); break;
      case 'expiring': list.sort((a, b) => a.expiresAt - b.expiresAt); break;
    }

    return list;
  }, [jobs, searchQuery, selectedCategory, priceRange, durationFilter, sortBy]);

  const communityStats = useMemo(() => ({
    total: jobs.length,
    active: jobs.filter(j => j.status === 'active').length,
    avgPrice: jobs.length > 0 ? Math.round(jobs.reduce((s, j) => s + j.price, 0) / jobs.length) : 0,
    totalApplicants: jobs.reduce((s, j) => s + j.applicants.length, 0),
  }), [jobs]);

  const activeFiltersCount = (selectedCategory ? 1 : 0) + (priceRange > 0 ? 1 : 0) + (durationFilter > 0 ? 1 : 0);
  const balance = isWorker ? workerWallet : hirerWallet;
  const accentGradient = isWorker ? 'from-blue-600 to-indigo-600' : 'from-orange-500 to-amber-500';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setPriceRange(0);
    setDurationFilter(0);
    setSortBy('newest');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-28">

      {/* ─── Page header ─── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${accentGradient} flex items-center justify-center shadow-sm`}>
              <ActivityIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-gray-900" style={{ fontWeight: 800, fontSize: '1.35rem' }}>Hoạt động</h1>
              <p className="text-gray-400 text-xs" style={{ fontWeight: 500 }}>
                {mainTab === 'mine'
                  ? isWorker ? 'Theo dõi việc đã ứng tuyển & thu nhập' : 'Quản lý việc đăng & chi tiêu'
                  : 'Khám phá tất cả việc đang tuyển'}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl ${isWorker ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`} style={{ fontWeight: 700, fontSize: '0.8rem' }}>
            <Wallet className="w-4 h-4" />{fmt(balance)}
          </div>
        </div>

        {/* ─── Main Tab Switcher ─── */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {([
            { key: 'mine' as MainTab, label: 'Của tôi', icon: User, desc: 'Việc của bạn' },
            { key: 'community' as MainTab, label: 'Cộng đồng', icon: Globe, desc: 'Tất cả việc' },
          ]).map(tab => {
            const active = mainTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setMainTab(tab.key)}
                className={`flex-1 relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm transition-all ${
                  active ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                }`}
              >
                <TabIcon className={`w-4 h-4 ${active ? isWorker ? 'text-blue-600' : 'text-orange-500' : 'text-gray-400'}`} />
                <span className={active ? 'text-gray-900' : 'text-gray-500'} style={{ fontWeight: active ? 700 : 500 }}>
                  {tab.label}
                </span>
                {tab.key === 'community' && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    active ? isWorker ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-400'
                  }`} style={{ fontWeight: 700 }}>
                    {communityStats.active}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  TAB: MY ACTIVITY                                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {mainTab === 'mine' && (
          <motion.div
            key="mine"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard icon={Briefcase} label="Tổng việc" value={stats.total.toString()} sub={`${stats.active} đang tuyển`} gradient={isWorker ? 'from-blue-500 to-blue-600' : 'from-orange-400 to-orange-500'} delay={0} />
              <StatCard icon={Users} label="Đã ghép" value={stats.matched.toString()} sub="Đang thực hiện" gradient="from-violet-500 to-purple-600" delay={0.05} />
              <StatCard icon={CheckCircle2} label="Hoàn thành" value={stats.completed.toString()} sub="Thành công" gradient="from-emerald-500 to-green-600" delay={0.1} />
              <StatCard icon={isWorker ? TrendingUp : TrendingDown} label={isWorker ? 'Thu nhập' : 'Chi tiêu'} value={fmtShort(isWorker ? stats.totalEarned : stats.totalSpent)} sub={isWorker ? 'Tổng nhận được' : 'Tổng đã chi'} gradient={isWorker ? 'from-cyan-500 to-teal-600' : 'from-red-400 to-rose-500'} delay={0.15} />
            </div>

            <div className="flex gap-5 items-start">
              <div className="flex-1 min-w-0">
                {/* Filter tabs */}
                <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
                  {MY_FILTERS.map(f => {
                    const isActive = filter === f.key;
                    return (
                      <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${isActive ? isWorker ? 'bg-blue-600 text-white shadow-sm' : 'bg-orange-500 text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                        style={{ fontWeight: isActive ? 700 : 500 }}>
                        {f.label}
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200/60 text-gray-400'}`} style={{ fontWeight: 700 }}>{f.count}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filteredMyJobs.length > 0 ? filteredMyJobs.map((job, i) => (
                      <JobActivityCard key={job.id} job={job} isWorker={isWorker} index={i} />
                    )) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Briefcase className="w-7 h-7 text-gray-300" /></div>
                        <p className="text-gray-400 text-sm" style={{ fontWeight: 600 }}>Chưa có hoạt động nào</p>
                        <p className="text-gray-300 text-xs mt-1">{isWorker ? 'Hãy tìm và ứng tuyển việc!' : 'Đăng việc đầu tiên!'}</p>
                        <Link to={isWorker ? '/worker' : '/post'} className={`inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl text-white text-sm ${isWorker ? 'bg-blue-600' : 'bg-orange-500'}`} style={{ fontWeight: 600 }}>
                          {isWorker ? 'Tìm việc ngay' : 'Đăng việc ngay'}<ChevronRight className="w-4 h-4" />
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Sidebar */}
              <div className="hidden lg:block w-72 flex-shrink-0 space-y-4 sticky top-24">
                <div className={`bg-gradient-to-br ${accentGradient} rounded-2xl p-5 relative overflow-hidden`}>
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3"><Wallet className="w-4 h-4 text-white/70" /><span className="text-white/70 text-xs" style={{ fontWeight: 600 }}>Ví SnapOn</span></div>
                    <p className="text-white" style={{ fontWeight: 800, fontSize: '1.5rem' }}>{fmt(balance)}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="w-7 h-4 rounded bg-gradient-to-br from-yellow-200/30 to-yellow-400/30 border border-yellow-200/20" />
                      <span className="text-white/25 text-[10px] tracking-[0.2em]">•••• ••••</span>
                    </div>
                  </div>
                </div>
                {transactions.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-4"><BarChart3 className={`w-4 h-4 ${isWorker ? 'text-blue-500' : 'text-orange-500'}`} /><span className="text-gray-800 text-xs" style={{ fontWeight: 700 }}>Giao dịch gần đây</span></div>
                    {transactions.map((tx, i) => <TransactionItem key={i} type={tx.type} amount={tx.amount} label={tx.label} time={tx.time} isLast={i === transactions.length - 1} />)}
                  </div>
                )}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-4">
                  <div className="flex items-center gap-2 mb-2.5"><Sparkles className="w-4 h-4 text-amber-500" /><span className="text-amber-800 text-xs" style={{ fontWeight: 700 }}>Mẹo hay</span></div>
                  <p className="text-amber-700/70 text-xs leading-relaxed">
                    {isWorker ? 'Đánh giá cao và phản hồi nhanh giúp AI ưu tiên bạn!' : 'Dùng "Đóng tuyển" để AI tự chọn ứng viên tốt nhất.'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  TAB: COMMUNITY EXPLORE                                */}
        {/* ═══════════════════════════════════════════════════════ */}
        {mainTab === 'community' && (
          <motion.div
            key="community"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            {/* ── Live stats banner ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.12),transparent_70%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(249,115,22,0.12),transparent_70%)]" />
              <div className="relative z-10 flex items-center justify-around text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-green-400 text-[10px]" style={{ fontWeight: 600 }}>LIVE</span>
                  </div>
                  <p className="text-white" style={{ fontWeight: 800, fontSize: '1.15rem' }}>{communityStats.active}</p>
                  <p className="text-gray-500 text-[10px]">Đang tuyển</p>
                </div>
                <div className="w-px h-10 bg-gray-700" />
                <div>
                  <p className="text-gray-500 text-[10px] mb-1">Tổng việc</p>
                  <p className="text-white" style={{ fontWeight: 800, fontSize: '1.15rem' }}>{communityStats.total}</p>
                  <p className="text-gray-500 text-[10px]">Đã đăng</p>
                </div>
                <div className="w-px h-10 bg-gray-700" />
                <div>
                  <p className="text-gray-500 text-[10px] mb-1">Trung bình</p>
                  <p className="text-white" style={{ fontWeight: 800, fontSize: '1.15rem' }}>{fmtShort(communityStats.avgPrice)}</p>
                  <p className="text-gray-500 text-[10px]">/việc</p>
                </div>
                <div className="w-px h-10 bg-gray-700 hidden sm:block" />
                <div className="hidden sm:block">
                  <p className="text-gray-500 text-[10px] mb-1">Ứng viên</p>
                  <p className="text-white" style={{ fontWeight: 800, fontSize: '1.15rem' }}>{communityStats.totalApplicants}</p>
                  <p className="text-gray-500 text-[10px]">Đã ứng tuyển</p>
                </div>
              </div>
            </motion.div>

            {/* ── Search bar ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-4"
            >
              <div className={`flex items-center gap-3 bg-white rounded-2xl border-2 px-4 py-3 transition-all shadow-sm ${
                searchFocused
                  ? isWorker ? 'border-blue-400 shadow-blue-100' : 'border-orange-400 shadow-orange-100'
                  : 'border-gray-100 hover:border-gray-200'
              }`}>
                <Search className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  searchFocused ? isWorker ? 'text-blue-500' : 'text-orange-500' : 'text-gray-300'
                }`} />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Tìm kiếm việc, địa điểm, người đăng..."
                  className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-300"
                  style={{ fontWeight: 500 }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${
                    showFilters || activeFiltersCount > 0
                      ? isWorker ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-orange-50 border-orange-200 text-orange-600'
                      : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Lọc
                  {activeFiltersCount > 0 && (
                    <span className={`w-4.5 h-4.5 rounded-full text-white text-[10px] flex items-center justify-center ${
                      isWorker ? 'bg-blue-500' : 'bg-orange-500'
                    }`} style={{ fontWeight: 700 }}>{activeFiltersCount}</span>
                  )}
                </button>

                {/* Sort dropdown */}
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100 transition"
                    style={{ fontWeight: 600 }}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.key === sortBy)?.label}</span>
                  </button>
                  <AnimatePresence>
                    {showSortDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5 z-50 w-44"
                      >
                        {SORT_OPTIONS.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => { setSortBy(opt.key); setShowSortDropdown(false); }}
                            className={`w-full text-left px-3.5 py-2 text-xs transition ${
                              sortBy === opt.key
                                ? isWorker ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            style={{ fontWeight: sortBy === opt.key ? 700 : 500 }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* ── Advanced Filters Panel ── */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
                    {/* Price range */}
                    <div>
                      <p className="text-gray-600 text-xs mb-2" style={{ fontWeight: 700 }}>
                        <CircleDollarSign className="w-3.5 h-3.5 inline mr-1" />
                        Khoảng giá
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {PRICE_RANGES.map((pr, i) => (
                          <button
                            key={i}
                            onClick={() => setPriceRange(i)}
                            className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                              priceRange === i
                                ? isWorker ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-orange-50 border-orange-300 text-orange-600'
                                : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'
                            }`}
                            style={{ fontWeight: priceRange === i ? 700 : 500 }}
                          >
                            {pr.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <p className="text-gray-600 text-xs mb-2" style={{ fontWeight: 700 }}>
                        <Timer className="w-3.5 h-3.5 inline mr-1" />
                        Thời gian
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {DURATION_FILTERS.map((df, i) => (
                          <button
                            key={i}
                            onClick={() => setDurationFilter(i)}
                            className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                              durationFilter === i
                                ? isWorker ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-orange-50 border-orange-300 text-orange-600'
                                : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'
                            }`}
                            style={{ fontWeight: durationFilter === i ? 700 : 500 }}
                          >
                            {df.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Clear all */}
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition"
                        style={{ fontWeight: 600 }}
                      >
                        <X className="w-3 h-3" />
                        Xóa tất cả bộ lọc
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Category chips (horizontal scroll) ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-5 overflow-x-auto scrollbar-none"
            >
              <div className="flex gap-2 pb-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                    !selectedCategory
                      ? isWorker ? 'bg-blue-600 text-white shadow-sm' : 'bg-orange-500 text-white shadow-sm'
                      : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
                  }`}
                  style={{ fontWeight: !selectedCategory ? 700 : 500 }}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Tất cả
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${!selectedCategory ? 'bg-white/20' : 'bg-gray-100'}`} style={{ fontWeight: 700 }}>
                    {communityJobs.length}
                  </span>
                </button>
                {CATEGORIES.map(cat => {
                  const count = jobs.filter(j => j.category === cat.id).length;
                  const isActive = selectedCategory === cat.id;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                        isActive
                          ? isWorker ? 'bg-blue-600 text-white shadow-sm' : 'bg-orange-500 text-white shadow-sm'
                          : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
                      }`}
                      style={{ fontWeight: isActive ? 700 : 500 }}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      {cat.label}
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-white/20' : 'bg-gray-100'}`} style={{ fontWeight: 700 }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Results header ── */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <p className="text-gray-700 text-sm" style={{ fontWeight: 700 }}>
                  {communityJobs.length} kết quả
                </p>
                {(searchQuery || activeFiltersCount > 0) && (
                  <span className="text-gray-400 text-xs">
                    {searchQuery && `"${searchQuery}"`}
                    {activeFiltersCount > 0 && ` · ${activeFiltersCount} bộ lọc`}
                  </span>
                )}
              </div>
              {(searchQuery || activeFiltersCount > 0) && (
                <button onClick={clearAllFilters} className="text-xs text-gray-400 hover:text-gray-600 transition" style={{ fontWeight: 500 }}>
                  Xóa lọc
                </button>
              )}
            </div>

            {/* ── Job cards grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {communityJobs.length > 0 ? (
                  communityJobs.map((job, i) => (
                    <ExploreJobCard key={job.id} job={job} index={i} isWorker={isWorker} />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="col-span-full py-20 text-center"
                  >
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
                      <Search className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-gray-500 text-sm mb-1" style={{ fontWeight: 700 }}>Không tìm thấy kết quả</p>
                    <p className="text-gray-300 text-xs mb-4">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                    <button
                      onClick={clearAllFilters}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm ${isWorker ? 'bg-blue-600' : 'bg-orange-500'}`}
                      style={{ fontWeight: 600 }}
                    >
                      Xóa bộ lọc
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Bottom tip ── */}
            {communityJobs.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <Shield className="w-3.5 h-3.5 text-gray-300" />
                  <span className="text-gray-400 text-xs" style={{ fontWeight: 500 }}>
                    Tất cả việc được bảo vệ bởi AI Matching của SnapOn
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
