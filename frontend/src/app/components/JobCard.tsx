import { Link } from 'react-router';
import { Clock, Users, ChevronRight, Flame, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { Job } from '../context/AppContext';
import { CountdownTimer } from './CountdownTimer';

interface JobCardProps {
  job: Job;
  workerDistance?: number;
  isWorker?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  errands:       { bg: 'bg-orange-50',  text: 'text-orange-500' },
  content:       { bg: 'bg-pink-50',    text: 'text-pink-500' },
  design:        { bg: 'bg-purple-50',  text: 'text-purple-500' },
  tech:          { bg: 'bg-cyan-50',    text: 'text-cyan-600' },
  carrying:      { bg: 'bg-indigo-50',  text: 'text-indigo-500' },
  photography:   { bg: 'bg-rose-50',    text: 'text-rose-500' },
  research:      { bg: 'bg-teal-50',    text: 'text-teal-500' },
  manager:       { bg: 'bg-amber-50',   text: 'text-amber-600' },
  entertainment: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-500' },
  study:         { bg: 'bg-blue-50',    text: 'text-blue-500' },
  others:        { bg: 'bg-gray-50',    text: 'text-gray-500' },
};

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0','') + 'tr';
  if (n >= 1000)    return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

export function JobCard({ job, workerDistance, isWorker }: JobCardProps) {
  const isActive    = job.status === 'active' && job.expiresAt > Date.now();
  const isUrgent    = isActive && job.expiresAt - Date.now() < 90000;
  const noApplicants = job.applicants.length === 0 && isActive;
  const catColors   = CATEGORY_COLORS[job.category] ?? { bg: 'bg-gray-50', text: 'text-gray-500' };

  // Price range fill %
  const priceSpread = job.priceMax - job.priceMin;
  const midFillPct  = priceSpread > 0 ? 60 : 100; // visual fill

  return (
    <Link to={`/job/${job.id}`} className="block group">
      <motion.div
        whileHover={{ y: -3, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.985 }}
        className={`bg-white rounded-2xl border overflow-hidden transition-shadow duration-200 group-hover:shadow-lg ${
          isUrgent ? 'border-red-200 shadow-red-50 shadow-md' :
          isActive  ? 'border-gray-100 shadow-sm' :
          'border-gray-100 shadow-sm opacity-80'
        }`}
      >
        {/* Urgent stripe */}
        {isUrgent && (
          <div className="h-1 bg-gradient-to-r from-red-400 via-orange-400 to-red-400 animate-pulse" />
        )}

        {/* Body */}
        <div className="p-4">
          {/* Top row: icon + title + badge */}
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${catColors.bg}`}>
              {job.categoryIcon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-gray-900 leading-snug pr-1" style={{ fontWeight: 700, fontSize: '0.95rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {job.title}
                </h3>
                {/* Status badge */}
                <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  isActive    ? 'bg-green-50 text-green-600' :
                  job.status === 'matched'   ? 'bg-blue-50 text-blue-600' :
                  job.status === 'completed' ? 'bg-purple-50 text-purple-600' :
                  'bg-gray-100 text-gray-400'
                }`} style={{ fontWeight: 600 }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isActive    ? 'bg-green-500 animate-pulse' :
                    job.status === 'matched'   ? 'bg-blue-500' :
                    job.status === 'completed' ? 'bg-purple-400' :
                    'bg-gray-400'
                  }`} />
                  {isActive ? 'Đang tuyển' : job.status === 'matched' ? 'Đã khớp' : job.status === 'completed' ? 'Hoàn thành' : 'Hết hạn'}
                </div>
              </div>

              {/* Hirer */}
              <div className="flex items-center gap-1.5 mt-1">
                <img src={job.hirerAvatar} alt="" className="w-3.5 h-3.5 rounded-full" />
                <span className="text-gray-400" style={{ fontSize: '0.72rem' }}>{job.hirerName}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-500 mt-2.5 leading-relaxed" style={{ fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {job.description}
          </p>

          {/* ── Price range bar ── */}
          <div className="mt-3 bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-green-600" style={{ fontWeight: 700, fontSize: '0.82rem' }}>{fmt(job.priceMin)}₫</span>
              <span className="text-gray-400" style={{ fontSize: '0.68rem' }}>khoảng giá thầu</span>
              <span className="text-orange-500" style={{ fontWeight: 700, fontSize: '0.82rem' }}>{fmt(job.priceMax)}₫</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${midFillPct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-orange-400"
              />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between mt-3 gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Duration */}
              <div className="flex items-center gap-1 text-gray-400" style={{ fontSize: '0.75rem' }}>
                <Clock className="w-3.5 h-3.5" />
                <span>{job.duration}h</span>
              </div>

              {/* Distance (worker mode) */}
              {workerDistance !== undefined && (
                <div className="flex items-center gap-1 text-blue-500" style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                  <span>📍</span>
                  <span>{workerDistance.toFixed(1)} km</span>
                </div>
              )}

              {/* Applicant count / competitive badge */}
              {noApplicants && isWorker ? (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 600, fontSize: '0.7rem' }}>
                  <Flame className="w-3 h-3" />Chưa ai apply!
                </span>
              ) : job.applicants.length > 0 && (
                <div className="flex items-center gap-1 text-gray-400" style={{ fontSize: '0.75rem' }}>
                  <Users className="w-3.5 h-3.5" />
                  <span>{job.applicants.length}</span>
                  {isWorker && job.applicants.length >= 4 && (
                    <span className="text-orange-500 ml-0.5" style={{ fontWeight: 600 }}>🏁</span>
                  )}
                </div>
              )}
            </div>

            {/* Right: countdown + arrow */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isActive && (
                <div className={`${isUrgent ? 'text-red-500' : 'text-gray-400'}`}>
                  <CountdownTimer expiresAt={job.expiresAt} size="sm" />
                </div>
              )}
              {job.status === 'matched' && (
                <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                  {fmt(job.price)}₫ chốt
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
            </div>
          </div>
        </div>

        {/* Urgent bottom bar */}
        {isUrgent && (
          <div className="bg-red-500 text-white text-center py-1.5 flex items-center justify-center gap-1.5" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
            <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>⚡</motion.span>
            Sắp hết hạn — Apply ngay!
          </div>
        )}
      </motion.div>
    </Link>
  );
}