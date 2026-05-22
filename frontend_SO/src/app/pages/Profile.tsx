import { useState, useRef } from 'react';
import {
  Star, Award, MapPin, Edit3, CheckCircle2, Clock, TrendingUp,
  Briefcase, ChevronRight, Shield, Phone, Mail, Camera,
  ThumbsUp, Zap, Users, BarChart2, Settings, Bell,
  Lock, ChevronDown, ChevronUp, MessageCircle, Search,
  Filter, SlidersHorizontal, Check, X, Plus, Trash2,
  DollarSign, CalendarDays, BadgeCheck, CornerDownRight,
  SmilePlus, Meh, Frown, TrendingDown, Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import { useApp, DEMO_WORKER, CATEGORIES } from '../context/AppContext';

// ─── Helper ──────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'tr';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${sz} ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" />
      ))}
    </div>
  );
}

// ─── Inline editable field ────────────────────────────────────
function EditableField({
  label, value, icon, onSave, type = 'text',
}: {
  label: string; value: string; icon: React.ReactNode;
  onSave: (v: string) => void; type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.focus(), 50); };
  const handleSave = () => { onSave(draft); setEditing(false); };
  const handleCancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 group hover:bg-gray-50/80 transition rounded-xl">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        {editing ? (
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
            className="w-full text-sm text-gray-800 border-b-2 border-orange-400 bg-transparent outline-none pb-0.5"
          />
        ) : (
          <p className="text-sm text-gray-700 truncate" style={{ fontWeight: 500 }}>{value}</p>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={handleSave} className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></button>
          <button onClick={handleCancel} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><X className="w-3.5 h-3.5 text-gray-600" /></button>
        </div>
      ) : (
        <button onClick={handleEdit} className="opacity-0 group-hover:opacity-100 transition flex-shrink-0">
          <Edit3 className="w-3.5 h-3.5 text-gray-400 hover:text-orange-500 transition" />
        </button>
      )}
    </div>
  );
}

// ─── Rating distribution bar ──────────────────────────────────
function RatingBar({ star, count, total, active, onClick }: { star: number; count: number; total: number; active: boolean; onClick: () => void }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0;
  return (
    <button onClick={onClick} className={`flex items-center gap-2 w-full rounded-lg px-2 py-1.5 transition ${active ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
      <span className="text-xs text-gray-500 w-5 text-right" style={{ fontWeight: 600 }}>{star}</span>
      <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="currentColor" />
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${star >= 4 ? 'bg-yellow-400' : star === 3 ? 'bg-orange-400' : 'bg-red-400'}`}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
    </button>
  );
}

// ─── Feedback card ────────────────────────────────────────────
interface Review {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
  jobTitle: string;
  jobIcon: string;
  jobCategory: string;
  price: number;
  helpful: number;
  reply?: string;
  tags?: string[];
}

function FeedbackCard({ review, accentColor, onReply }: {
  review: Review;
  accentColor: string;
  onReply: (id: string, text: string) => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState(review.reply || '');
  const [helpful, setHelpful] = useState(review.helpful);
  const [likedByMe, setLikedByMe] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const needsTruncate = review.comment.length > 120;
  const displayText = needsTruncate && !expanded
    ? review.comment.slice(0, 120) + '...'
    : review.comment;

  const sentimentIcon = review.rating >= 4 ? <SmilePlus className="w-4 h-4 text-green-500" />
    : review.rating === 3 ? <Meh className="w-4 h-4 text-orange-400" />
    : <Frown className="w-4 h-4 text-red-400" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        review.rating >= 4 ? 'border-gray-100' : review.rating === 3 ? 'border-orange-100' : 'border-red-100'
      }`}
    >
      {/* Left accent stripe */}
      <div className={`h-1 ${review.rating >= 4 ? 'bg-yellow-400' : review.rating === 3 ? 'bg-orange-400' : 'bg-red-400'}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <img src={review.avatar} alt={review.name} className="w-10 h-10 rounded-full border-2 border-gray-100 bg-gray-50 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{review.name}</span>
              {sentimentIcon}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Stars rating={review.rating} size="sm" />
              <span className="text-yellow-600 text-xs" style={{ fontWeight: 700 }}>{review.rating}.0</span>
              <span className="text-gray-300">·</span>
              <span className="text-gray-400 text-xs">{review.date}</span>
            </div>
          </div>
        </div>

        {/* Job reference */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 mb-3">
          <span className="text-base">{review.jobIcon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-gray-600 truncate block" style={{ fontWeight: 500 }}>{review.jobTitle}</span>
            <span className="text-xs text-gray-400">{fmt(review.price)}₫</span>
          </div>
        </div>

        {/* Comment */}
        <p className="text-gray-700 text-sm leading-relaxed">
          "{displayText}"
          {needsTruncate && (
            <button onClick={() => setExpanded(!expanded)} className="text-orange-500 ml-1 text-xs" style={{ fontWeight: 600 }}>
              {expanded ? 'Thu gọn' : 'Đọc thêm'}
            </button>
          )}
        </p>

        {/* Tags */}
        {review.tags && review.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {review.tags.map(tag => (
              <span key={tag} className={`text-xs px-2.5 py-0.5 rounded-full border ${
                review.rating >= 4 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'
              }`} style={{ fontWeight: 500 }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
          <button
            onClick={() => { if (!likedByMe) { setHelpful(h => h + 1); setLikedByMe(true); } else { setHelpful(h => h - 1); setLikedByMe(false); } }}
            className={`flex items-center gap-1.5 text-xs transition ${likedByMe ? 'text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${likedByMe ? 'fill-current' : ''}`} />
            <span style={{ fontWeight: likedByMe ? 600 : 400 }}>Hữu ích ({helpful})</span>
          </button>
          <button
            onClick={() => setShowReply(!showReply)}
            className={`flex items-center gap-1.5 text-xs transition ${showReply ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'}`}
          >
            <CornerDownRight className="w-3.5 h-3.5" />
            <span style={{ fontWeight: showReply ? 600 : 400 }}>
              {review.reply ? 'Sửa phản hồi' : 'Phản hồi'}
            </span>
          </button>
        </div>

        {/* Existing reply display */}
        {review.reply && !showReply && (
          <div className="mt-3 ml-3 pl-3 border-l-2 border-orange-200">
            <p className="text-xs text-gray-500 mb-0.5" style={{ fontWeight: 600 }}>Phản hồi của bạn:</p>
            <p className="text-sm text-gray-600 italic">"{review.reply}"</p>
          </div>
        )}

        {/* Reply input */}
        <AnimatePresence>
          {showReply && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 ml-3 pl-3 border-l-2 border-orange-200">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Viết phản hồi của bạn..."
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder-gray-400"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setShowReply(false)} className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition">Huỷ</button>
                  <button
                    onClick={() => { onReply(review.id, replyText); setShowReply(false); }}
                    disabled={!replyText.trim()}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition disabled:opacity-50"
                    style={{ fontWeight: 600 }}
                  >
                    Gửi phản hồi
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Full Feedback Panel ──────────────────────────────────────
function FeedbackPanel({ reviews, accentColor, onReply }: {
  reviews: Review[];
  accentColor: string;
  onReply: (id: string, text: string) => void;
}) {
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [searchQ, setSearchQ] = useState('');

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const distribution = [5, 4, 3, 2, 1].map(s => ({ star: s, count: reviews.filter(r => r.rating === s).length }));

  const filtered = reviews
    .filter(r => filterStar === null || r.rating === filterStar)
    .filter(r => !searchQ || r.name.toLowerCase().includes(searchQ.toLowerCase()) || r.comment.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest')  return b.id.localeCompare(a.id);
      if (sortBy === 'oldest')  return a.id.localeCompare(b.id);
      if (sortBy === 'highest') return b.rating - a.rating;
      return a.rating - b.rating;
    });

  const positiveCount = reviews.filter(r => r.rating >= 4).length;
  const positiveRate  = reviews.length > 0 ? Math.round(positiveCount / reviews.length * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex gap-6 items-start">
            {/* Big score */}
            <div className="text-center flex-shrink-0">
              <div className="text-gray-900" style={{ fontWeight: 900, fontSize: '3.5rem', lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
              <Stars rating={Math.round(avgRating)} size="md" />
              <div className="text-gray-400 text-xs mt-1.5">{reviews.length} đánh giá</div>
              <div className={`mt-2 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${positiveRate >= 80 ? 'bg-green-100 text-green-700' : positiveRate >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`} style={{ fontWeight: 600 }}>
                {positiveRate >= 80 ? <SmilePlus className="w-3 h-3" /> : positiveRate >= 60 ? <Meh className="w-3 h-3" /> : <Frown className="w-3 h-3" />}
                {positiveRate}% hài lòng
              </div>
            </div>

            {/* Distribution bars */}
            <div className="flex-1 space-y-0.5">
              {distribution.map(d => (
                <RatingBar
                  key={d.star}
                  star={d.star}
                  count={d.count}
                  total={reviews.length}
                  active={filterStar === d.star}
                  onClick={() => setFilterStar(filterStar === d.star ? null : d.star)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 border-t border-gray-50">
          {[
            { label: '5★', value: distribution.find(d => d.star === 5)?.count ?? 0, color: 'text-yellow-500' },
            { label: 'TB', value: avgRating.toFixed(1), color: 'text-gray-700' },
            { label: 'Hài lòng', value: positiveRate + '%', color: 'text-green-600' },
          ].map((s, i) => (
            <div key={i} className={`py-3 text-center ${i < 2 ? 'border-r border-gray-50' : ''}`}>
              <div className={`${s.color}`} style={{ fontWeight: 800, fontSize: '1.1rem' }}>{s.value}</div>
              <div className="text-gray-400 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + Search bar */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Tìm trong đánh giá..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {/* Star filter chips */}
          {[null, 5, 4, 3, 2, 1].map(s => (
            <button
              key={String(s)}
              onClick={() => setFilterStar(filterStar === s ? null : s)}
              className={`flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition ${
                filterStar === s
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
              style={{ fontWeight: filterStar === s ? 600 : 400 }}
            >
              {s === null ? 'Tất cả' : <><span>{s}</span><Star className="w-3 h-3" fill="currentColor" /></>}
              {s !== null && <span className="text-gray-400 ml-0.5">({distribution.find(d => d.star === s)?.count ?? 0})</span>}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="flex-shrink-0 text-xs border border-gray-200 rounded-full px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="highest">Điểm cao nhất</option>
            <option value="lowest">Điểm thấp nhất</option>
          </select>
        </div>
      </div>

      {/* Result count */}
      {(filterStar || searchQ) && (
        <p className="text-xs text-gray-400">
          Tìm thấy <strong className="text-gray-700">{filtered.length}</strong> đánh giá
          {filterStar && <span> · {filterStar}★</span>}
          {searchQ && <span> · "{searchQ}"</span>}
          <button onClick={() => { setFilterStar(null); setSearchQ(''); }} className="ml-2 text-orange-500 hover:text-orange-600">Xoá lọc</button>
        </p>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-400 text-sm">Không tìm thấy đánh giá nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <FeedbackCard key={r.id} review={r} accentColor={accentColor} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-orange-500' : 'bg-gray-200'}`}
      style={{ height: '22px', width: '40px' }}
    >
      <motion.div
        animate={{ x: value ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  );
}

// ═════════════════════════════════════════════════════════════
// WORKER PROFILE
// ═════════════════════════════════════════════════════════════
function WorkerProfile() {
  const { jobs } = useApp();
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'feedback' | 'settings'>('profile');

  // Editable fields
  const [name,    setName]    = useState(DEMO_WORKER.name);
  const [phone,   setPhone]   = useState('0901 234 567');
  const [email,   setEmail]   = useState('minh.demo@snapon.vn');
  const [area,    setArea]    = useState('Quận 1, TP.HCM');
  const [bio,     setBio]     = useState(DEMO_WORKER.bio);
  const [editBio, setEditBio] = useState(false);
  const [draftBio, setDraftBio] = useState(bio);
  const [skills,  setSkills]  = useState([...DEMO_WORKER.skills]);
  const [newSkill, setNewSkill] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);

  // Settings toggles
  const [notifNewJob,   setNotifNewJob]   = useState(true);
  const [notifMatched,  setNotifMatched]  = useState(true);
  const [notifPromo,    setNotifPromo]    = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [available,     setAvailable]     = useState(true);

  // Feedback data
  const [workerReviews, setWorkerReviews] = useState<Review[]>([
    { id: 'r1', name: 'Nguyễn Thanh Tâm', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NTT', rating: 5, comment: 'Bạn Minh làm việc rất nhanh, cẩn thận, đúng giờ. Nhà được dọn sạch hơn cả mong đợi. Chắc chắn sẽ thuê lại lần sau!', date: '20/02/2026', jobTitle: 'Lau dọn căn hộ 60m²', jobIcon: '🧹', jobCategory: 'cleaning', price: 200000, helpful: 3, tags: ['Đúng giờ', 'Cẩn thận', 'Thân thiện'], reply: 'Cảm ơn bạn nhiều! Rất vui được giúp đỡ 😊' },
    { id: 'r2', name: 'Phạm Hồng Nhung', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PHN', rating: 4, comment: 'Thái độ tốt, làm việc đúng yêu cầu. Có một số chỗ cần nhắc thêm nhưng nhìn chung hài lòng.', date: '18/02/2026', jobTitle: 'Mua sắm hộ siêu thị', jobIcon: '🛒', jobCategory: 'shopping', price: 130000, helpful: 1, tags: ['Thân thiện', 'Đáng tin'] },
    { id: 'r3', name: 'Trần Văn Khoa', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TVK', rating: 5, comment: 'Xuất sắc, vượt mong đợi hoàn toàn. Bạn làm việc nhanh và rất chuyên nghiệp. Highly recommended!', date: '14/02/2026', jobTitle: 'Tỉa cây sân vườn', jobIcon: '🌿', jobCategory: 'gardening', price: 250000, helpful: 5, tags: ['Chuyên nghiệp', 'Nhanh chóng', 'Đáng tin'] },
    { id: 'r4', name: 'Lê Thị Mai', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LTM', rating: 3, comment: 'Làm được việc nhưng đến hơi muộn 15 phút. Chất lượng công việc ổn, có thể cải thiện hơn về giờ giấc.', date: '10/02/2026', jobTitle: 'Giao hàng trong ngày', jobIcon: '🚗', jobCategory: 'delivery', price: 80000, helpful: 0, tags: ['Đúng yêu cầu'] },
    { id: 'r5', name: 'Hoàng Văn Tuấn', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HVT', rating: 5, comment: 'Rất hài lòng! Bạn làm sạch sẽ tỉ mỉ từng góc phòng, mang đầy đủ dụng cụ, không cần phải giám sát nhiều.', date: '05/02/2026', jobTitle: 'Vệ sinh phòng trọ', jobIcon: '🧹', jobCategory: 'cleaning', price: 150000, helpful: 4, tags: ['Tỉ mỉ', 'Tự giác', 'Chuyên nghiệp'] },
  ]);

  const handleReply = (id: string, text: string) => {
    setWorkerReviews(prev => prev.map(r => r.id === id ? { ...r, reply: text } : r));
  };

  const appliedJobs = jobs.filter(j => j.applicants.some(a => a.workerId === DEMO_WORKER.id));
  const wonJobs     = appliedJobs.filter(j => j.aiMatchId === DEMO_WORKER.id);
  const totalEarned = wonJobs.reduce((s, j) => s + j.price, 0);
  const avgRating   = workerReviews.reduce((s, r) => s + r.rating, 0) / (workerReviews.length || 1);

  const TABS = [
    { key: 'profile',  label: 'Hồ sơ',   icon: '👤' },
    { key: 'history',  label: 'Lịch sử', icon: '📋' },
    { key: 'feedback', label: 'Đánh giá', icon: '⭐', badge: workerReviews.length },
    { key: 'settings', label: 'Cài đặt', icon: '⚙️' },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-10">

      {/* ── Hero card ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-6 mb-5 text-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full" />

        <div className="relative flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img src={DEMO_WORKER.avatar} alt={name} className="w-20 h-20 rounded-2xl border-2 border-white/30 bg-blue-400 shadow-lg" />
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-white" style={{ fontWeight: 800, fontSize: '1.2rem' }}>{name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${available ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-blue-200 text-xs">{available ? 'Sẵn sàng nhận việc' : 'Tạm nghỉ'}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="bg-white/20 px-3 py-1 rounded-full text-xs border border-white/20 flex items-center gap-1" style={{ fontWeight: 600 }}>
                  <BadgeCheck className="w-3.5 h-3.5 text-blue-200" /> Đã xác minh
                </div>
                <div className="flex items-center gap-1 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 text-yellow-300" fill="currentColor" />
                  <span className="text-white" style={{ fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {skills.map(s => (
                <span key={s} className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/20">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative grid grid-cols-4 gap-2 mt-5 pt-5 border-t border-white/20">
          {[
            { v: DEMO_WORKER.completedJobs, l: 'Việc done' },
            { v: appliedJobs.length,        l: 'Đã apply' },
            { v: workerReviews.length,       l: 'Đánh giá' },
            { v: fmt(totalEarned) + '₫',    l: 'Tổng thu' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-white" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{s.v}</div>
              <div className="text-blue-200" style={{ fontSize: '0.65rem' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5 gap-0.5">
        {TABS.map(({ key, label, icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-lg transition-all relative ${
              activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ fontWeight: activeTab === key ? 700 : 400 }}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
            {'badge' in { badge } && badge !== undefined && badge > 0 && (
              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center ${activeTab === key ? 'bg-orange-500' : 'bg-gray-400'}`} style={{ fontSize: '9px', fontWeight: 700 }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Availability toggle */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${available ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Briefcase className={`w-5 h-5 ${available ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>Trạng thái nhận việc</p>
                    <p className="text-xs text-gray-400">{available ? 'Đang hiển thị trong kết quả tìm kiếm' : 'Đã ẩn khỏi kết quả'}</p>
                  </div>
                </div>
                <Toggle value={available} onChange={setAvailable} />
              </div>

              {/* Bio */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Giới thiệu bản thân</h3>
                  {!editBio ? (
                    <button onClick={() => { setEditBio(true); setDraftBio(bio); }}
                      className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600" style={{ fontWeight: 500 }}>
                      <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditBio(false)} className="text-xs text-gray-400">Huỷ</button>
                      <button onClick={() => { setBio(draftBio); setEditBio(false); }}
                        className="text-xs bg-orange-500 text-white px-3 py-1 rounded-full" style={{ fontWeight: 600 }}>
                        Lưu
                      </button>
                    </div>
                  )}
                </div>
                {editBio ? (
                  <textarea value={draftBio} onChange={e => setDraftBio(e.target.value)} rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300" />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed">{bio}</p>
                )}
              </div>

              {/* Skills */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Kỹ năng</h3>
                  <button onClick={() => setAddingSkill(true)} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600" style={{ fontWeight: 500 }}>
                    <Plus className="w-3.5 h-3.5" /> Thêm
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <div key={s} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 group">
                      <span className="text-xs" style={{ fontWeight: 500 }}>{s}</span>
                      <button onClick={() => setSkills(prev => prev.filter(sk => sk !== s))}
                        className="opacity-0 group-hover:opacity-100 transition ml-0.5">
                        <X className="w-3 h-3 text-blue-400 hover:text-red-500 transition" />
                      </button>
                    </div>
                  ))}
                  {addingSkill && (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newSkill.trim()) { setSkills(p => [...p, newSkill.trim()]); setNewSkill(''); setAddingSkill(false); }
                          if (e.key === 'Escape') { setNewSkill(''); setAddingSkill(false); }
                        }}
                        placeholder="Kỹ năng mới..."
                        className="text-xs border border-blue-300 rounded-full px-3 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <button onClick={() => { if (newSkill.trim()) { setSkills(p => [...p, newSkill.trim()]); setNewSkill(''); } setAddingSkill(false); }}
                        className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>THÔNG TIN LIÊN HỆ</p>
                </div>
                <div className="divide-y divide-gray-50">
                  <EditableField label="Số điện thoại" value={phone} onSave={setPhone} icon={<Phone className="w-4 h-4 text-blue-500" />} />
                  <EditableField label="Email" value={email} onSave={setEmail} icon={<Mail className="w-4 h-4 text-purple-500" />} type="email" />
                  <EditableField label="Khu vực" value={area} onSave={setArea} icon={<MapPin className="w-4 h-4 text-orange-500" />} />
                </div>
                <div className="px-4 py-3.5 border-t border-gray-50 flex items-center gap-3 hover:bg-gray-50/80 transition cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Xác minh danh tính</p>
                    <p className="text-sm text-green-600" style={{ fontWeight: 600 }}>CMND đã xác minh ✅</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {/* Summary chips */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: appliedJobs.length, l: 'Đã apply', color: 'blue' },
                  { v: wonJobs.length,     l: 'Được chọn', color: 'green' },
                  { v: appliedJobs.length - wonJobs.length, l: 'Chưa được', color: 'gray' },
                ].map((s, i) => (
                  <div key={i} className={`bg-${s.color}-50 rounded-xl p-3 text-center border border-${s.color}-100`}>
                    <div className={`text-${s.color}-600`} style={{ fontWeight: 800, fontSize: '1.3rem' }}>{s.v}</div>
                    <div className={`text-${s.color}-500 text-xs mt-0.5`}>{s.l}</div>
                  </div>
                ))}
              </div>

              {appliedJobs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-gray-400 text-sm">Chưa có lịch sử ứng tuyển</p>
                  <Link to="/worker" className="mt-3 inline-block text-blue-500 text-sm">Tìm việc ngay →</Link>
                </div>
              ) : (
                appliedJobs.map(job => {
                  const applicant = job.applicants.find(a => a.workerId === DEMO_WORKER.id);
                  const isWinner  = job.aiMatchId === DEMO_WORKER.id;
                  return (
                    <Link key={job.id} to={`/job/${job.id}`}>
                      <motion.div
                        whileHover={{ y: -1 }}
                        className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition ${
                          isWinner ? 'border-green-200' : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isWinner ? 'bg-green-50' : 'bg-gray-50'}`}>
                            {job.categoryIcon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-gray-900 text-sm truncate pr-1" style={{ fontWeight: 600 }}>{job.title}</p>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full flex-shrink-0 border ${
                                isWinner            ? 'bg-green-50 text-green-700 border-green-200' :
                                job.status === 'active' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-gray-50 text-gray-500 border-gray-200'
                              }`} style={{ fontWeight: 600 }}>
                                {isWinner ? '🏆 Được chọn' : job.status === 'active' ? '⏳ Chờ kết quả' : 'Không được chọn'}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs mt-0.5 truncate">{job.hirerName}</p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className={`text-sm ${isWinner ? 'text-green-600' : 'text-orange-500'}`} style={{ fontWeight: 700 }}>
                                {applicant?.bidPrice ? applicant.bidPrice.toLocaleString('vi-VN') + '₫' : job.price.toLocaleString('vi-VN') + '₫'}
                                <span className="text-xs text-gray-400 ml-1" style={{ fontWeight: 400 }}>giá chào</span>
                              </span>
                              <span className="text-gray-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{job.duration}h</span>
                              {applicant && <span className="text-blue-500 text-xs">📍 {applicant.distance} km</span>}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })
              )}
            </div>
          )}

          {/* ── FEEDBACK TAB ── */}
          {activeTab === 'feedback' && (
            <FeedbackPanel reviews={workerReviews} accentColor="blue" onReply={handleReply} />
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-xs text-gray-500 flex items-center gap-2" style={{ fontWeight: 600 }}>
                    <Bell className="w-3.5 h-3.5" /> THÔNG BÁO
                  </p>
                </div>
                {[
                  { label: 'Việc mới gần bạn', sub: 'Thông báo khi có việc trong bán kính 5km', v: notifNewJob, fn: setNotifNewJob },
                  { label: 'Được chọn làm việc', sub: 'Thông báo khi người thuê chốt phiên chọn bạn', v: notifMatched, fn: setNotifMatched },
                  { label: 'Khuyến mãi & ưu đãi', sub: 'Tin tức và chương trình của SnapOn', v: notifPromo, fn: setNotifPromo },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b border-gray-50' : ''}`}>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                    </div>
                    <Toggle value={item.v} onChange={item.fn} />
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-xs text-gray-500 flex items-center gap-2" style={{ fontWeight: 600 }}>
                    <Lock className="w-3.5 h-3.5" /> QUYỀN RIÊNG TƯ
                  </p>
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Hồ sơ công khai</p>
                    <p className="text-xs text-gray-400 mt-0.5">Người thuê có thể xem hồ sơ của bạn</p>
                  </div>
                  <Toggle value={publicProfile} onChange={setPublicProfile} />
                </div>
              </div>

              <button className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition" style={{ fontWeight: 500 }}>
                Đăng xuất
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// HIRER PROFILE
// ═════════════════════════════════════════════════════════════
function HirerProfile() {
  const { jobs, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'feedback' | 'settings'>('overview');

  // Editable fields
  const [phone,    setPhone]    = useState('0912 345 678');
  const [email,    setEmail]    = useState('hoa.nguyen@gmail.com');
  const [area,     setArea]     = useState('Quận 1, Bình Thạnh, TP.HCM');

  // Settings
  const [notifApply,  setNotifApply]  = useState(true);
  const [notifRemind, setNotifRemind] = useState(true);
  const [notifPromo,  setNotifPromo]  = useState(false);

  const myJobs        = jobs.filter(j => j.hirerName === currentUser.name || j.hirerName === 'Nguyễn Thị Hoa');
  const activeJobs    = myJobs.filter(j => j.status === 'active');
  const matchedJobs   = myJobs.filter(j => j.status === 'matched' || j.status === 'completed');
  const totalSpent    = matchedJobs.reduce((s, j) => s + j.price, 0);
  const totalApplicants = myJobs.reduce((s, j) => s + j.applicants.length, 0);
  const successRate   = myJobs.length > 0 ? Math.round(matchedJobs.length / myJobs.length * 100) : 0;

  const [hirerReviews, setHirerReviews] = useState<Review[]>([
    { id: 'h1', name: 'Nguyễn Văn An', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenVanAn', rating: 5, comment: 'Chủ nhà rất thân thiện, mô tả công việc rõ ràng và chi tiết. Trả tiền ngay sau khi hoàn thành, không cần phải nhắc.', date: '20/02/2026', jobTitle: 'Lau dọn căn hộ 60m²', jobIcon: '🧹', jobCategory: 'cleaning', price: 200000, helpful: 2, tags: ['Thân thiện', 'Thanh toán nhanh', 'Rõ ràng'] },
    { id: 'h2', name: 'Phan Thị Lan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PhanThiLan', rating: 4, comment: 'Thanh toán nhanh chóng, đúng như cam kết. Mô tả việc khá rõ ràng, có thể thêm hình ảnh để dễ hiểu hơn.', date: '15/02/2026', jobTitle: 'Dọn nhà cuối năm', jobIcon: '🧹', jobCategory: 'cleaning', price: 350000, helpful: 1, tags: ['Thanh toán nhanh', 'Đúng cam kết'] },
    { id: 'h3', name: 'Võ Thành Phong', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VoThanhPhong', rating: 5, comment: 'Chủ nhà hỗ trợ rất nhiệt tình, cung cấp đầy đủ dụng cụ. Sẽ tiếp tục làm việc cùng trong tương lai!', date: '12/02/2026', jobTitle: 'Tỉa cây sân vườn', jobIcon: '🌿', jobCategory: 'gardening', price: 250000, helpful: 3, tags: ['Hỗ trợ tốt', 'Chuyên nghiệp', 'Sẽ thuê lại'] },
    { id: 'h4', name: 'Lê Hoàng Cường', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LeHoangCuong', rating: 3, comment: 'Yêu cầu hơi nhiều so với mức giá. Có thể điều chỉnh giá cho phù hợp hơn với công việc thực tế.', date: '08/02/2026', jobTitle: 'Sửa vòi nước rò', jobIcon: '🔧', jobCategory: 'repair', price: 180000, helpful: 0, tags: ['Cần cải thiện giá'] },
  ]);

  const handleReply = (id: string, text: string) => {
    setHirerReviews(prev => prev.map(r => r.id === id ? { ...r, reply: text } : r));
  };

  const avgRating = hirerReviews.reduce((s, r) => s + r.rating, 0) / (hirerReviews.length || 1);

  const TABS = [
    { key: 'overview',  label: 'Tổng quan',  icon: '📊' },
    { key: 'jobs',      label: 'Việc đăng',  icon: '📝', badge: myJobs.length },
    { key: 'feedback',  label: 'Đánh giá',   icon: '⭐', badge: hirerReviews.length },
    { key: 'settings',  label: 'Cài đặt',    icon: '⚙️' },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-10">

      {/* ── Hero card ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 rounded-3xl p-6 mb-5 text-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full" />

        <div className="relative flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-20 h-20 rounded-2xl border-2 border-white/30 bg-orange-400 shadow-lg" />
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition">
              <Camera className="w-3.5 h-3.5 text-orange-600" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-white" style={{ fontWeight: 800, fontSize: '1.2rem' }}>{currentUser.name}</h1>
                <p className="text-orange-100 text-xs mt-0.5">Thành viên từ Tháng 1, 2025</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs border border-white/20 flex items-center gap-1" style={{ fontWeight: 600 }}>
                  🏅 Tin cậy
                </span>
                <div className="flex items-center gap-1 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 text-yellow-300" fill="currentColor" />
                  <span className="text-white" style={{ fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 text-orange-100 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs">Quận 1 · Bình Thạnh, TP.HCM</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative grid grid-cols-4 gap-2 mt-5 pt-5 border-t border-white/20">
          {[
            { v: myJobs.length,     l: 'Đã đăng' },
            { v: activeJobs.length, l: 'Đang tuyển' },
            { v: fmt(totalSpent) + '₫', l: 'Đã chi' },
            { v: totalApplicants,   l: 'Ứng viên' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-white" style={{ fontWeight: 800, fontSize: '1.05rem' }}>{s.v}</div>
              <div className="text-orange-100" style={{ fontSize: '0.65rem' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5 gap-0.5">
        {TABS.map(({ key, label, icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-lg transition-all relative ${
              activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ fontWeight: activeTab === key ? 700 : 400 }}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
            {'badge' in { badge } && badge !== undefined && badge > 0 && (
              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center ${activeTab === key ? 'bg-orange-500' : 'bg-gray-400'}`} style={{ fontSize: '9px', fontWeight: 700 }}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* KPI grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Briefcase className="w-5 h-5" />, label: 'Đang tuyển', value: activeJobs.length, color: 'orange' },
                  { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Đã hoàn thành', value: matchedJobs.length, color: 'green' },
                  { icon: <Users className="w-5 h-5" />, label: 'Tổng ứng viên', value: totalApplicants, color: 'blue' },
                  { icon: <TrendingUp className="w-5 h-5" />, label: 'Tỷ lệ thành công', value: successRate + '%', color: 'purple' },
                ].map((s, i) => {
                  const bg: Record<string, string> = { orange: 'bg-orange-50 text-orange-600', blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600' };
                  return (
                    <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg[s.color]}`}>{s.icon}</div>
                      <div className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.3rem' }}>{s.value}</div>
                      <div className="text-gray-400 text-xs">{s.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Category distribution */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-gray-900 mb-4 text-sm" style={{ fontWeight: 700 }}>📊 Loại việc hay đăng</h3>
                <div className="space-y-2.5">
                  {CATEGORIES.map(cat => {
                    const count = myJobs.filter(j => j.category === cat.id).length;
                    if (count === 0) return null;
                    const pct = myJobs.length > 0 ? Math.round(count / myJobs.length * 100) : 0;
                    return (
                      <div key={cat.id} className="flex items-center gap-3">
                        <span className="text-lg w-6 flex-shrink-0">{cat.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600" style={{ fontWeight: 500 }}>{cat.label.split('/')[0].trim()}</span>
                            <span className="text-xs text-gray-400">{count} việc · {pct}%</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="bg-orange-400 h-1.5 rounded-full" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {myJobs.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Chưa có dữ liệu</p>}
                </div>
              </div>

              {/* Contact info */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>THÔNG TIN TÀI KHOẢN</p>
                </div>
                <div className="divide-y divide-gray-50">
                  <EditableField label="Số điện thoại" value={phone} onSave={setPhone} icon={<Phone className="w-4 h-4 text-orange-500" />} />
                  <EditableField label="Email" value={email} onSave={setEmail} icon={<Mail className="w-4 h-4 text-purple-500" />} type="email" />
                  <EditableField label="Khu vực" value={area} onSave={setArea} icon={<MapPin className="w-4 h-4 text-blue-500" />} />
                </div>
              </div>
            </div>
          )}

          {/* ── JOBS TAB ── */}
          {activeTab === 'jobs' && (
            <div className="space-y-3">
              {myJobs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-gray-400 text-sm">Chưa có việc nào được đăng</p>
                  <Link to="/post" className="mt-3 inline-block text-orange-500 text-sm" style={{ fontWeight: 600 }}>Đăng việc ngay →</Link>
                </div>
              ) : (
                myJobs.map(job => (
                  <Link key={job.id} to={`/job/${job.id}`}>
                    <motion.div whileHover={{ y: -1 }}
                      className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition ${
                        job.status === 'active' ? 'border-green-100' : job.status === 'matched' ? 'border-blue-100' : 'border-gray-100'
                      }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                          job.status === 'active' ? 'bg-green-50' : job.status === 'matched' ? 'bg-blue-50' : 'bg-gray-50'
                        }`}>
                          {job.categoryIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-gray-900 text-sm truncate pr-1" style={{ fontWeight: 600 }}>{job.title}</p>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full flex-shrink-0 border ${
                              job.status === 'active'  ? 'bg-green-50 text-green-700 border-green-200' :
                              job.status === 'matched' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              'bg-gray-50 text-gray-500 border-gray-200'
                            }`} style={{ fontWeight: 600 }}>
                              {job.status === 'active' ? '🟢 Đang tuyển' : job.status === 'matched' ? '✅ Đã khớp' : 'Hết hạn'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs truncate">{job.location.address}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-orange-600 text-xs" style={{ fontWeight: 700 }}>
                              {job.priceMin.toLocaleString('vi-VN')}₫–{job.priceMax.toLocaleString('vi-VN')}₫
                            </span>
                            <span className="flex items-center gap-1 text-gray-400 text-xs">
                              <Users className="w-3 h-3" /> {job.applicants.length} ứng viên
                            </span>
                            <span className="flex items-center gap-1 text-gray-400 text-xs">
                              <Clock className="w-3 h-3" /> {job.duration}h
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                      </div>
                    </motion.div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* ── FEEDBACK TAB ── */}
          {activeTab === 'feedback' && (
            <FeedbackPanel reviews={hirerReviews} accentColor="orange" onReply={handleReply} />
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-xs text-gray-500 flex items-center gap-2" style={{ fontWeight: 600 }}>
                    <Bell className="w-3.5 h-3.5" /> THÔNG BÁO
                  </p>
                </div>
                {[
                  { label: 'Ứng viên mới apply', sub: 'Nhận thông báo khi có người apply vào việc của bạn', v: notifApply, fn: setNotifApply },
                  { label: 'Nhắc nhở đếm ngược', sub: 'Nhắc khi còn 2 phút trước khi hết hạn nhận đơn', v: notifRemind, fn: setNotifRemind },
                  { label: 'Khuyến mãi & ưu đãi', sub: 'Tin tức và chương trình của SnapOn', v: notifPromo, fn: setNotifPromo },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b border-gray-50' : ''}`}>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                    </div>
                    <Toggle value={item.v} onChange={item.fn} />
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-xs text-gray-500 flex items-center gap-2" style={{ fontWeight: 600 }}>
                    <Settings className="w-3.5 h-3.5" /> TÀI KHOẢN
                  </p>
                </div>
                {[
                  { icon: <Lock className="w-4 h-4 text-gray-400" />, label: 'Đổi mật khẩu', sub: 'Cập nhật mật khẩu đăng nhập' },
                  { icon: <Shield className="w-4 h-4 text-gray-400" />, label: 'Xác minh danh tính', sub: 'CMND/CCCD đã được xác minh ✅' },
                  { icon: <DollarSign className="w-4 h-4 text-gray-400" />, label: 'Phương thức thanh toán', sub: 'Momo, VNPay, Thẻ ngân hàng' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/60 transition cursor-pointer`}>
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                ))}
              </div>

              <button className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition" style={{ fontWeight: 500 }}>
                Đăng xuất
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Entry point ──────────────────────────────────────────────
export default function Profile() {
  const { currentUser } = useApp();
  return currentUser.role === 'worker' ? <WorkerProfile /> : <HirerProfile />;
}
