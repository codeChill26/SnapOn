import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ChevronLeft, MapPin, Clock, Users, Star, Sparkles, CheckCircle2, CheckCheck,
  Bot, Award, MessageCircle, PartyPopper, Briefcase, Send, Lock, AlertCircle,
  ChevronDown, ChevronUp, User, ShieldCheck, TrendingDown, TrendingUp, Zap,
  Target, BarChart3, FlameKindling, ExternalLink, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp, haversineDistance, DEMO_WORKER, scoreApplicants } from '../context/AppContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { MapPicker } from '../components/MapPicker';
import { UserProfileModal, type HirerProfileData, type WorkerProfileData } from '../components/UserProfileModal';

function fmt(n: number) { return n.toLocaleString('vi-VN') + '₫'; }
function pct(v: number)  { return Math.round(v * 100) + '%'; }

function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <p className="text-gray-500">Không tìm thấy công việc này.</p>
      <Link to="/" className="mt-4 inline-block text-orange-500 hover:underline">← Về trang chủ</Link>
    </div>
  );
}

// ─── Score bar component ──────────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
      <span className="text-xs w-8 text-right" style={{ fontWeight: 600, color }}>{pct(value)}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  WORKER VIEW
// ═════════════════════════════════════════════════════════════
function WorkerJobDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, applyToJob, workerStatus, workerCurrentJobId } = useApp();
  const [note, setNote] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [bidPrice, setBidPrice] = useState(0);
  const [showHirerProfile, setShowHirerProfile] = useState(false);

  const job = jobs.find(j => j.id === id);

  useEffect(() => {
    if (job) setBidPrice(Math.round((job.priceMin + job.priceMax) / 2 / 10000) * 10000);
  }, [job?.id]);

  if (!job) return <NotFound />;

  const alreadyApplied = job.applicants.some(a => a.workerId === DEMO_WORKER.id);
  const myApplication  = job.applicants.find(a => a.workerId === DEMO_WORKER.id);
  const isMatched      = job.status === 'matched' && job.aiMatchId === DEMO_WORKER.id;
  const isCompleted    = job.status === 'completed';
  const isOnThisJob    = workerCurrentJobId === job.id && workerStatus === 'on_job';
  const canApply       = job.status === 'active' && job.expiresAt > Date.now() && !alreadyApplied && !applied && workerStatus === 'available';
  const workerBusy     = workerStatus === 'on_job' && workerCurrentJobId !== job.id;
  const distance       = haversineDistance(DEMO_WORKER.lat, DEMO_WORKER.lng, job.location.lat, job.location.lng);

  // Competitiveness hint based on bid
  const bidRatio = (bidPrice - job.priceMin) / (job.priceMax - job.priceMin || 1);
  const competitiveness = bidRatio < 0.3 ? { label: 'Rất cạnh tranh 🔥', color: 'text-green-600', bg: 'bg-green-50' }
    : bidRatio < 0.6 ? { label: 'Cạnh tranh tốt ✅', color: 'text-blue-600', bg: 'bg-blue-50' }
    : { label: 'Trung bình', color: 'text-amber-600', bg: 'bg-amber-50' };

  const handleApply = () => {
    applyToJob(job.id, DEMO_WORKER, note || 'Tôi sẵn sàng làm ngay!', bidPrice);
    setApplied(true);
    setShowApplyForm(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-10">
      {/* Back */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-gray-400 text-xs mb-0.5">Chi tiết công việc</p>
          <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{job.title}</h1>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full border ${
          job.status === 'active'    ? 'bg-green-50 text-green-600 border-green-200' :
          job.status === 'matched'   ? 'bg-blue-50 text-blue-600 border-blue-200' :
          job.status === 'completed' ? 'bg-purple-50 text-purple-600 border-purple-200' :
          'bg-gray-50 text-gray-500 border-gray-200'
        }`} style={{ fontWeight: 600 }}>
          {job.status === 'active' ? '🟢 Đang tuyển' : job.status === 'matched' ? '✅ Đã khớp' : job.status === 'completed' ? '🏆 Xong' : '⏸ Hết hạn'}
        </span>
      </div>

      {/* Status banners */}
      <AnimatePresence>
        {(isMatched || isOnThisJob) && !isCompleted && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-green-700" style={{ fontWeight: 700 }}>🎉 Bạn đã được chọn!</p>
              <p className="text-green-600 text-sm mt-0.5">Thù lao xác nhận: <strong>{fmt(job.price)}</strong>. Chờ người thuê xác nhận hoàn thành.</p>
            </div>
          </motion.div>
        )}
        {isCompleted && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-purple-50 border border-purple-200 rounded-2xl p-5 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <PartyPopper className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-purple-700" style={{ fontWeight: 700 }}>Hoàn thành! 🎉</p>
              <p className="text-purple-600 text-sm mt-0.5"><strong>{fmt(job.price)}</strong> đã được xử lý. Bạn có thể nhận việc mới!</p>
            </div>
          </motion.div>
        )}
        {(applied || alreadyApplied) && !isMatched && !isOnThisJob && !isCompleted && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-blue-700 text-sm" style={{ fontWeight: 700 }}>Đã gửi đơn — Giá chào: <span className="text-blue-500">{fmt(myApplication?.bidPrice ?? bidPrice)}</span></p>
              <p className="text-blue-500 text-xs mt-0.5">Đang chờ người thuê chốt phiên. AI sẽ tự matching khi họ sẵn sàng.</p>
            </div>
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
              className="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0" />
          </motion.div>
        )}
        {workerBusy && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-amber-700 text-sm" style={{ fontWeight: 600 }}>Bạn đang bận. Hoàn thành việc hiện tại trước khi ứng tuyển mới.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown */}
      {job.status === 'active' && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 mb-4 text-center shadow-md">
          <p className="text-orange-100 text-xs mb-2" style={{ fontWeight: 500 }}>⚡ Thời gian còn lại nhận đơn</p>
          <CountdownTimer expiresAt={job.expiresAt} size="lg" />
        </div>
      )}

      {/* Job card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl flex-shrink-0">{job.categoryIcon}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-gray-900" style={{ fontWeight: 700 }}>{job.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <img src={job.hirerAvatar} alt="" className="w-5 h-5 rounded-full" />
              <span className="text-gray-500 text-sm">{job.hirerName}</span>
              <span className="text-gray-300">·</span>
              <span className="text-gray-400 text-xs">{new Date(job.postedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed mb-4">{job.description}</p>

        {/* Price range — PUBLIC to worker */}
        <div className="bg-gradient-to-r from-green-50 to-orange-50 border border-orange-100 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600" style={{ fontWeight: 600 }}>💰 Khoảng giá thầu</span>
            <span className="text-xs text-gray-400">Đặt giá thấp hơn để có lợi thế</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-green-600 text-sm" style={{ fontWeight: 700 }}>{fmt(job.priceMin)}</div>
              <div className="text-gray-400 text-xs">Tối thiểu</div>
            </div>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 to-orange-500 rounded-full w-full" />
            </div>
            <div className="text-center">
              <div className="text-orange-600 text-sm" style={{ fontWeight: 700 }}>{fmt(job.priceMax)}</div>
              <div className="text-gray-400 text-xs">Tối đa</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-blue-600" style={{ fontWeight: 800 }}>{job.duration}h</div>
            <div className="text-gray-400 text-xs">Thời gian</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <div className="text-orange-600" style={{ fontWeight: 800 }}>{distance.toFixed(1)}km</div>
            <div className="text-gray-400 text-xs">Từ bạn</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-gray-600" style={{ fontWeight: 800 }}>{job.applicants.length}</div>
            <div className="text-gray-400 text-xs">Đã apply</div>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 mt-3">
          <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-600">{job.location.address}</span>
        </div>
      </div>

      {/* Map (collapsible) */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-4">
        <button onClick={() => setShowMap(!showMap)} className="w-full flex items-center justify-between px-5 py-4">
          <span className="text-gray-700 text-sm flex items-center gap-2" style={{ fontWeight: 600 }}>
            <MapPin className="w-4 h-4 text-orange-500" /> Xem vị trí trên bản đồ
          </span>
          {showMap ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        <AnimatePresence>
          {showMap && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden px-4 pb-4">
              <MapPicker value={job.location} onChange={() => {}} readonly height="240px" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hirer info */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">
        <h3 className="text-gray-700 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
          <User className="w-4 h-4 text-gray-400" /> Người đăng việc
        </h3>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHirerProfile(true)} className="relative flex-shrink-0 group">
            <img src={job.hirerAvatar} alt={job.hirerName} className="w-12 h-12 rounded-xl border border-gray-100 bg-gray-50 group-hover:opacity-90 transition" />
          </button>
          <div className="flex-1">
            <button onClick={() => setShowHirerProfile(true)} className="text-left">
              <p className="text-gray-900 hover:text-orange-600 transition" style={{ fontWeight: 700 }}>{job.hirerName}</p>
            </button>
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-yellow-400" fill="currentColor" />)}
              <span className="text-gray-400 text-xs ml-1">5.0 · 8 đánh giá</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full" style={{ fontWeight: 600 }}>
              <ShieldCheck className="w-3.5 h-3.5" /> Đã xác minh
            </div>
            <button
              onClick={() => setShowHirerProfile(true)}
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition"
              style={{ fontWeight: 600 }}
            >
              Xem hồ sơ →
            </button>
          </div>
        </div>
      </div>

      {/* Hirer profile modal */}
      <UserProfileModal
        isOpen={showHirerProfile}
        onClose={() => setShowHirerProfile(false)}
        profile={{
          type: 'hirer',
          name: job.hirerName,
          avatar: job.hirerAvatar,
          rating: 5.0,
          reviewCount: 8,
          memberSince: 'Tháng 1, 2025',
          jobsPosted: 12,
          jobsCompleted: 10,
          area: 'Quận 1, TP.HCM',
          totalSpent: 3200000,
          verified: true,
          recentReviews: [
            { name: 'Nguyễn Văn An', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NVA2', rating: 5, text: 'Chủ nhà rất thân thiện, mô tả công việc rõ ràng. Trả tiền ngay khi xong.', date: '20/02/2026' },
            { name: 'Phan Thị Lan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PTL2', rating: 4, text: 'Thanh toán nhanh chóng, đúng như cam kết. Sẽ làm việc lại.', date: '15/02/2026' },
            { name: 'Võ Thành Phong', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VTP2', rating: 5, text: 'Hỗ trợ rất nhiệt tình, cung cấp đầy đủ dụng cụ cần thiết.', date: '12/02/2026' },
          ],
        } as HirerProfileData}
      />

      {/* ── Apply section ── */}
      {canApply && (
        <AnimatePresence mode="wait">
          {!showApplyForm ? (
            <motion.button key="apply-btn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowApplyForm(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition"
              style={{ fontWeight: 700, fontSize: '1rem' }}>
              <Briefcase className="w-5 h-5" />
              Ứng tuyển & Đặt giá
            </motion.button>
          ) : (
            <motion.div key="apply-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <p className="text-blue-700 mb-4" style={{ fontWeight: 700 }}>💬 Đặt giá của bạn</p>

              {/* Bid slider */}
              <div className="bg-white rounded-xl p-4 mb-4 border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600" style={{ fontWeight: 600 }}>Giá chào của bạn</span>
                  <motion.span key={bidPrice} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                    className="text-blue-600" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                    {fmt(bidPrice)}
                  </motion.span>
                </div>

                <input type="range"
                  min={job.priceMin} max={job.priceMax}
                  step={10000} value={bidPrice}
                  onChange={e => setBidPrice(Number(e.target.value))}
                  className="w-full accent-blue-600 mb-2"
                  style={{ cursor: 'pointer' }}
                />

                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <div className="flex flex-col items-center">
                    <span className="text-green-600" style={{ fontWeight: 600 }}>{fmt(job.priceMin)}</span>
                    <span>Tối thiểu</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-orange-500" style={{ fontWeight: 600 }}>{fmt(job.priceMax)}</span>
                    <span>Tối đa</span>
                  </div>
                </div>

                {/* Competitiveness meter */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${competitiveness.bg}`}>
                  <FlameKindling className={`w-4 h-4 flex-shrink-0 ${competitiveness.color}`} />
                  <div className="flex-1">
                    <p className={`text-xs ${competitiveness.color}`} style={{ fontWeight: 600 }}>{competitiveness.label}</p>
                    <p className="text-gray-500 text-xs">AI: giá thấp hơn → điểm cao hơn 35%</p>
                  </div>
                </div>
              </div>

              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Lời giới thiệu ngắn (không bắt buộc)..." rows={2}
                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm text-gray-700 resize-none outline-none focus:ring-2 focus:ring-blue-300 mb-3" />

              <div className="flex gap-2">
                <button onClick={() => setShowApplyForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition" style={{ fontWeight: 500 }}>
                  Hủy
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={handleApply}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition"
                  style={{ fontWeight: 700 }}>
                  <Send className="w-4 h-4" /> Gửi đơn — {fmt(bidPrice)}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Expired / already filled */}
      {job.status === 'expired' && !alreadyApplied && !applied && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>Việc này đã hết hạn</p>
          <Link to="/worker" className="mt-3 inline-block text-blue-500 text-sm">← Tìm việc khác</Link>
        </div>
      )}
      {job.status === 'matched' && !alreadyApplied && !applied && !isMatched && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
          <CheckCircle2 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>Việc này đã có người nhận</p>
          <Link to="/worker" className="mt-3 inline-block text-blue-500 text-sm">← Tìm việc khác</Link>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  HIRER VIEW
// ═════════════════════════════════════════════════════════════
function HirerJobDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, matchJob, closeBidding, completeJob, hirerWallet } = useApp();
  const [manualPicked, setManualPicked] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showAlgoDetails, setShowAlgoDetails] = useState(false);
  const [profileWorkerId, setProfileWorkerId] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const job = jobs.find(j => j.id === id);

  useEffect(() => {
    if (!job) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 500);
    return () => clearTimeout(t);
  }, [job?.applicants.length]);

  if (!job) return <NotFound />;

  const isActive    = job.status === 'active' && job.expiresAt > Date.now();
  const isMatched   = job.status === 'matched';
  const isCompleted = job.status === 'completed';

  const aiWinner = job.applicants.find(a => a.workerId === job.aiMatchId);
  const allMarkers = job.applicants.map(a => ({
    lat: a.lat, lng: a.lng, label: a.name,
    color: a.workerId === job.aiMatchId ? 'green' : 'blue',
  }));

  const handleManualMatch = (workerId: string) => {
    const applicant = job.applicants.find(a => a.workerId === workerId);
    const cost = applicant?.bidPrice ?? job.price;
    if (hirerWallet < cost) {
      setWalletError(`Số dư ví không đủ! Cần ${fmt(cost)} nhưng ví chỉ còn ${fmt(hirerWallet)}.`);
      return;
    }
    setWalletError(null);
    setSelectedWorkerId(workerId);
    setManualPicked(true);
    matchJob(job.id, workerId);
  };

  const handleCloseBidding = () => {
    // Pre-check: estimate lowest bid
    const lowestBid = Math.min(...job.applicants.map(a => a.bidPrice));
    if (hirerWallet < lowestBid) {
      setWalletError(`Số dư ví không đủ! Cần ít nhất ${fmt(lowestBid)} nhưng ví chỉ còn ${fmt(hirerWallet)}.`);
      return;
    }
    setWalletError(null);
    setClosing(true);
    setTimeout(() => {
      closeBidding(job.id);
      setClosing(false);
      setShowCloseConfirm(false);
    }, 1800);
  };

  const handleComplete = () => {
    completeJob(job.id);
    setCompleted(true);
  };

  // Preview the scoring for the current applicants (before closing)
  const previewScored = job.applicants.length >= 2 ? scoreApplicants(job) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>🏠 Quản lý</span>
          <h1 className="text-gray-900 mt-0.5" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{job.title}</h1>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs border ${
          job.status === 'active'    ? 'bg-green-50 text-green-600 border-green-200' :
          job.status === 'matched'   ? 'bg-blue-50 text-blue-600 border-blue-200' :
          job.status === 'completed' ? 'bg-purple-50 text-purple-600 border-purple-200' :
          'bg-gray-100 text-gray-500'
        }`} style={{ fontWeight: 600 }}>
          {job.status === 'active' ? '🟢 Đang tuyển' : job.status === 'matched' ? '✅ Đã khớp' : job.status === 'completed' ? '🏆 Hoàn thành' : '⏸ Hết hạn'}
        </span>
      </div>

      {/* Countdown */}
      {job.status === 'active' && (
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 mb-4 text-center shadow-lg">
          <p className="text-orange-100 text-xs mb-2" style={{ fontWeight: 500 }}>⚡ Thời gian nhận đơn còn lại</p>
          <CountdownTimer expiresAt={job.expiresAt} size="lg" />
          <div className="flex items-center justify-center gap-2 mt-3 text-orange-200 text-xs">
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-green-300 rounded-full" />
            AI đang tìm kiếm người gần nhất
          </div>
        </div>
      )}

      {/* Status banners */}
      <AnimatePresence>
        {(manualPicked || (isMatched && !completed)) && !isCompleted && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <CheckCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-green-700" style={{ fontWeight: 700 }}>Đã xác nhận!</p>
                <p className="text-green-600 text-sm">
                  {job.applicants.find(a => a.workerId === (selectedWorkerId || job.aiMatchId))?.name} đang trên đường.
                  Giá chốt: <strong>{fmt(job.price)}</strong>
                </p>
              </div>
            </div>
            <button onClick={handleComplete}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
              style={{ fontWeight: 600 }}>
              <CheckCircle2 className="w-5 h-5" /> Xác nhận hoàn thành & Thanh toán
            </button>
          </motion.div>
        )}
        {(completed || isCompleted) && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-purple-50 border border-purple-200 rounded-2xl p-5 mb-4 text-center">
            <PartyPopper className="w-10 h-10 text-purple-500 mx-auto mb-2" />
            <p className="text-purple-700" style={{ fontWeight: 700 }}>Hoàn thành! 🎉</p>
            <p className="text-purple-600 text-sm mt-1">Đã thanh toán <strong>{fmt(job.price)}</strong>. Cảm ơn bạn đã dùng SnapOn!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job summary */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">{job.categoryIcon}</div>
          <div className="flex-1">
            <p className="text-gray-900" style={{ fontWeight: 600 }}>{job.title}</p>
            <p className="text-gray-400 text-xs">Đăng {new Date(job.postedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">{job.description}</p>

        {/* Price range */}
        <div className="bg-gradient-to-r from-green-50 to-orange-50 border border-orange-100 rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>💰 Khoảng giá đã đặt</span>
            {isMatched && <span className="text-sm text-green-600" style={{ fontWeight: 700 }}>Chốt: {fmt(job.price)}</span>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-green-600 text-sm" style={{ fontWeight: 700 }}>{fmt(job.priceMin)}</div>
              <div className="text-xs text-gray-400">Tối thiểu</div>
            </div>
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 to-orange-500 rounded-full w-full" />
            </div>
            <div className="text-center">
              <div className="text-orange-600 text-sm" style={{ fontWeight: 700 }}>{fmt(job.priceMax)}</div>
              <div className="text-xs text-gray-400">Tối đa</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-blue-600" style={{ fontWeight: 700 }}>{job.duration}h</div>
            <div className="text-xs text-gray-400">Thời gian</div>
          </div>
          <div className={`bg-green-50 rounded-xl p-3 text-center transition-transform ${pulse ? 'scale-105' : ''}`}>
            <div className="text-green-600" style={{ fontWeight: 700 }}>{job.applicants.length}</div>
            <div className="text-xs text-gray-400">Ứng viên</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <div className="text-orange-600 text-xs" style={{ fontWeight: 700 }}>{fmt(job.priceMin)}–{fmt(job.priceMax).replace('₫', '')}₫</div>
            <div className="text-xs text-gray-400">Khoảng giá</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 bg-gray-50 rounded-xl p-3">
          <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="text-sm text-gray-600">{job.location.address}</span>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-4">
        <button onClick={() => setShowMap(!showMap)} className="w-full flex items-center justify-between px-5 py-4">
          <span className="text-gray-700 text-sm flex items-center gap-2" style={{ fontWeight: 600 }}>
            <MapPin className="w-4 h-4 text-orange-500" />
            Bản đồ {job.applicants.length > 0 ? `& vị trí ${job.applicants.length} ứng viên` : ''}
          </span>
          {showMap ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        <AnimatePresence>
          {showMap && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden px-4 pb-4">
              <MapPicker value={job.location} onChange={() => {}} readonly height="280px" markers={allMarkers} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CLOSE BIDDING BUTTON ── */}
      {isActive && job.applicants.length > 0 && !manualPicked && (
        <AnimatePresence>
          {!showCloseConfirm ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
              <button onClick={() => setShowCloseConfirm(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition"
                style={{ fontWeight: 700, fontSize: '1rem' }}>
                <Target className="w-5 h-5" />
                Chốt phiên — Để AI tự chọn người tốt nhất
              </button>
              <p className="text-center text-xs text-gray-400 mt-2">
                AI phân tích: 45% khoảng cách + 35% giá thầu + 20% đánh giá
              </p>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-5 mb-4">
              {!closing ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="w-6 h-6 text-purple-600" />
                    <p className="text-purple-700" style={{ fontWeight: 700 }}>Xác nhận chốt phiên?</p>
                  </div>
                  <p className="text-purple-600 text-sm mb-4">
                    AI sẽ chấm điểm <strong>{job.applicants.length} ứng viên</strong> theo thuật toán và tự động chọn người tốt nhất. Bạn vẫn có thể xem lý do sau.
                  </p>
                  {/* Preview scores */}
                  {previewScored && (
                    <div className="bg-white rounded-xl p-3 mb-4 space-y-2">
                      <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>👁️ Xem trước điểm AI:</p>
                      {previewScored.slice(0, 3).map((a, i) => (
                        <div key={a.workerId} className={`flex items-center gap-2 py-2 px-2 rounded-lg ${i === 0 ? 'bg-green-50' : ''}`}>
                          <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`} style={{ fontWeight: 700 }}>
                            {i + 1}
                          </span>
                          <img src={a.avatar} className="w-7 h-7 rounded-full flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-900 truncate" style={{ fontWeight: 600 }}>{a.name}</span>
                              {i === 0 && <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ fontWeight: 600 }}>🏆 Winner</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                              <span>📍 {a.distance}km</span>
                              <span>💰 {fmt(a.bidPrice)}</span>
                              <span>⭐ {a.rating}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-sm ${i === 0 ? 'text-green-600' : 'text-gray-500'}`} style={{ fontWeight: 800 }}>
                              {pct(a.aiScore ?? 0)}
                            </div>
                            <div className="text-xs text-gray-400">điểm</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setShowCloseConfirm(false)}
                      className="flex-1 py-3 rounded-xl border border-purple-200 text-purple-600 text-sm hover:bg-purple-50 transition" style={{ fontWeight: 500 }}>
                      Chưa vội
                    </button>
                    <button onClick={handleCloseBidding}
                      className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm flex items-center justify-center gap-2 transition" style={{ fontWeight: 700 }}>
                      <Zap className="w-4 h-4" fill="currentColor" /> Chốt ngay!
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-3" />
                  <p className="text-purple-700" style={{ fontWeight: 700 }}>AI đang phân tích...</p>
                  <p className="text-purple-500 text-sm mt-1">Chấm điểm khoảng cách · giá thầu · đánh giá</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Applicant list — HIRER ONLY (bids visible) */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 flex items-center gap-2" style={{ fontWeight: 700 }}>
            <Users className="w-5 h-5 text-orange-500" />
            Danh sách ứng viên
            <span className="text-sm text-gray-400 ml-1" style={{ fontWeight: 400 }}>({job.applicants.length})</span>
          </h2>
          {job.applicants.length >= 2 && isActive && (
            <button onClick={() => setShowAlgoDetails(!showAlgoDetails)}
              className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700 transition">
              <BarChart3 className="w-3.5 h-3.5" />
              {showAlgoDetails ? 'Ẩn điểm AI' : 'Xem điểm AI'}
            </button>
          )}
        </div>

        {isActive && job.applicants.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-gray-400 text-sm">Chưa có ứng viên. AI đang tìm kiếm...</p>
          </div>
        )}

        {/* Wallet error banner */}
        {walletError && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-red-600 text-xs" style={{ fontWeight: 600 }}>{walletError}</p>
            <button onClick={() => setWalletError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        <div className="space-y-3">
          {job.applicants.map((applicant, idx) => {
            const isWinner   = applicant.workerId === job.aiMatchId;
            const isSelected = applicant.workerId === selectedWorkerId;
            const scored     = previewScored?.find(s => s.workerId === applicant.workerId);
            const rank       = previewScored ? previewScored.findIndex(s => s.workerId === applicant.workerId) : idx;

            return (
              <motion.div key={applicant.workerId}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.07 }}
                className={`rounded-xl border p-4 transition-all ${
                  isSelected ? 'border-green-400 bg-green-50' :
                  (isMatched && isWinner) ? 'border-blue-400 bg-blue-50' :
                  rank === 0 && showAlgoDetails ? 'border-purple-300 bg-purple-50/30' :
                  'border-gray-100 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <img src={applicant.avatar} alt={applicant.name}
                      className={`w-11 h-11 rounded-full border-2 ${
                        (isMatched && isWinner) ? 'border-blue-400' :
                        rank === 0 && showAlgoDetails ? 'border-purple-400' : 'border-gray-200'
                      } bg-gray-100`}
                    />
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white border border-white ${
                      rank === 0 && showAlgoDetails ? 'bg-purple-500' : 'bg-gray-600'
                    }`} style={{ fontSize: '9px', fontWeight: 700 }}>
                      {rank + 1}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{applicant.name}</span>
                      {isMatched && isWinner && (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                          <CheckCheck className="w-3 h-3" /> Được chọn
                        </span>
                      )}
                      {rank === 0 && showAlgoDetails && !isMatched && (
                        <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                          <Bot className="w-3 h-3" /> AI dự đoán #1
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-3 h-3" fill="currentColor" />
                        <span style={{ fontWeight: 600 }}>{applicant.rating}</span>
                      </span>
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" />{applicant.completedJobs} việc</span>
                      <span className="text-blue-500" style={{ fontWeight: 600 }}>📍 {applicant.distance} km</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(applicant.appliedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* BID PRICE — only visible to hirer */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                        rank === 0 && showAlgoDetails ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'
                      }`} style={{ fontWeight: 700 }}>
                        <TrendingDown className="w-3 h-3" />
                        Giá chào: {fmt(applicant.bidPrice)}
                        {applicant.bidPrice === job.priceMin && (
                          <span className="text-green-600 ml-0.5">↓ Thấp nhất</span>
                        )}
                      </div>

                      {/* Bid visual within range */}
                      <div className="flex items-center gap-1 flex-1 min-w-[80px]">
                        <TrendingDown className="w-3 h-3 text-green-400 flex-shrink-0" />
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 rounded-full"
                            style={{ width: `${Math.max(5, ((applicant.bidPrice - job.priceMin) / (job.priceMax - job.priceMin || 1)) * 100)}%` }} />
                        </div>
                        <TrendingUp className="w-3 h-3 text-orange-400 flex-shrink-0" />
                      </div>
                    </div>

                    {applicant.note && (
                      <p className="text-gray-500 text-xs mt-1.5 italic bg-gray-50 rounded-lg px-2.5 py-1.5">
                        "{applicant.note}"
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {applicant.skills.map(s => (
                        <span key={s} className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>

                    {/* AI Score breakdown (shown when "Xem điểm AI") */}
                    {showAlgoDetails && applicant.aiBreakdown && (
                      <div className="mt-2 bg-white rounded-lg p-2.5 border border-purple-100 space-y-1.5">
                        <ScoreBar label="📍 Khoảng cách" value={applicant.aiBreakdown.distScore}   color="#8b5cf6" />
                        <ScoreBar label="💰 Giá thầu"    value={applicant.aiBreakdown.priceScore}  color="#f97316" />
                        <ScoreBar label="⭐ Đánh giá"    value={applicant.aiBreakdown.ratingScore} color="#eab308" />
                        <div className="flex items-center justify-between pt-1 border-t border-purple-50 mt-1">
                          <span className="text-xs text-purple-600" style={{ fontWeight: 700 }}>Tổng điểm AI</span>
                          <span className="text-purple-600" style={{ fontWeight: 800 }}>{pct(applicant.aiScore ?? 0)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {!manualPicked && isActive && (
                      <button onClick={() => handleManualMatch(applicant.workerId)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-orange-500 hover:bg-orange-600 text-white transition" style={{ fontWeight: 600 }}>
                        Chọn ngay
                      </button>
                    )}
                    <button
                      onClick={() => setProfileWorkerId(applicant.workerId)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 transition flex items-center justify-center gap-1"
                      style={{ fontWeight: 600 }}
                    >
                      <User className="w-3 h-3" /> Hồ sơ
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Worker profile modals */}
        {job.applicants.map(applicant => (
          <UserProfileModal
            key={applicant.workerId}
            isOpen={profileWorkerId === applicant.workerId}
            onClose={() => setProfileWorkerId(null)}
            profile={{
              type: 'worker',
              id: applicant.workerId,
              name: applicant.name,
              avatar: applicant.avatar,
              rating: applicant.rating,
              reviewCount: Math.max(3, Math.floor(applicant.completedJobs * 0.6)),
              completedJobs: applicant.completedJobs,
              skills: applicant.skills,
              bio: `Có ${applicant.completedJobs} việc đã hoàn thành với đánh giá ${applicant.rating}/5. Luôn đúng giờ và tận tâm với công việc được giao.`,
              responseTime: '< 5 phút',
              satisfactionRate: 98,
              distance: applicant.distance,
              bidPrice: applicant.bidPrice,
              priceMin: job.priceMin,
              priceMax: job.priceMax,
              area: 'TP.HCM',
              verified: true,
              recentReviews: [
                { name: 'Nguyễn Thanh Tâm', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${applicant.workerId}a`, rating: 5, text: 'Làm việc nhanh, cẩn thận, đúng giờ. Chắc chắn thuê lại!', date: '20/02/2026' },
                { name: 'Phạm Hồng Nhung', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${applicant.workerId}b`, rating: 4, text: 'Thái độ tốt, hoàn thành đúng yêu cầu đặt ra.', date: '15/02/2026' },
                { name: 'Trần Văn Khoa',   avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${applicant.workerId}c`, rating: 5, text: 'Xuất sắc! Vượt mong đợi. Highly recommended!', date: '10/02/2026' },
              ],
            } as WorkerProfileData}
          />
        ))}

        {/* Confirm complete for matched state */}
        {isMatched && !manualPicked && !completed && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-blue-700 text-sm" style={{ fontWeight: 700 }}>
                  {aiWinner?.name} đang thực hiện
                </p>
                <p className="text-blue-500 text-xs">Giá chốt: <strong>{fmt(job.price)}</strong></p>
              </div>
            </div>
            <button onClick={handleComplete}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
              style={{ fontWeight: 600 }}>
              <CheckCircle2 className="w-5 h-5" /> Xác nhận hoàn thành — Thanh toán
            </button>
            {walletError && (
              <p className="text-red-500 text-xs mt-2">{walletError}</p>
            )}
          </div>
        )}
      </div>

      {/* AI Algorithm Explanation */}
      {job.applicants.length > 0 && (
        <div className="mt-4 bg-gradient-to-r from-gray-50 to-purple-50 border border-purple-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-purple-500" />
            <span className="text-purple-700 text-xs" style={{ fontWeight: 700 }}>Thuật toán AI Matching</span>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed">
            Điểm = <strong className="text-purple-600">45%</strong> × (1 − khoảng cách chuẩn hóa) + <strong className="text-orange-500">35%</strong> × (1 − giá thầu chuẩn hóa) + <strong className="text-yellow-600">20%</strong> × đánh giá chuẩn hóa.
            Người có điểm cao nhất được chọn khi bạn nhấn "Chốt phiên".
          </p>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  ENTRY
// ═════════════════════════════════════════════════════════════
export default function JobDetail() {
  const { currentUser } = useApp();
  return currentUser.role === 'worker' ? <WorkerJobDetailView /> : <HirerJobDetailView />;
}