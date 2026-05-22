import { useState, useRef, useEffect } from 'react';
import {
  Navigation, MapPin, Star, Award, Loader2, X, Send,
  CheckCircle2, Search, Clock, AlertCircle, Briefcase, Flame, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useApp, CATEGORIES, haversineDistance, DEMO_WORKER, type Worker } from '../context/AppContext';
import { JobCard } from '../components/JobCard';
import { MapPicker } from '../components/MapPicker';
import { CountdownTimer } from '../components/CountdownTimer';

// ── Nominatim reverse geocode ──────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`,
      { headers: { 'User-Agent': 'SnapOn-App/1.0' } }
    );
    const data = await res.json();
    if (data.display_name) return data.display_name.split(', ').slice(0, 4).join(', ');
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
}

// ── Address search (Nominatim) ─────────────────────────
interface NominatimResult { place_id: number; display_name: string; lat: string; lon: string; }

function LocationSearchBox({ onSelect }: { onSelect: (loc: { lat: number; lng: number; address: string }) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (q: string) => {
    if (q.trim().length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&accept-language=vi&limit=5&countrycodes=vn`,
        { headers: { 'User-Agent': 'SnapOn-App/1.0' } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch { setResults([]); }
    setLoading(false);
  };

  const handleChange = (v: string) => {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(v), 500);
  };

  const handleSelect = (r: NominatimResult) => {
    const parts = r.display_name.split(', ');
    const address = parts.slice(0, 4).join(', ');
    onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), address });
    setQuery(address);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-orange-300 focus-within:border-transparent">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Tìm địa chỉ... (vd: Quận 1, TP.HCM)"
          className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-400"
        />
        {loading && <Loader2 className="w-4 h-4 text-orange-400 animate-spin flex-shrink-0" />}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {results.map(r => (
              <button
                key={r.place_id}
                onClick={() => handleSelect(r)}
                className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-orange-50 transition text-left border-b border-gray-50 last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 leading-snug">
                  {r.display_name.split(', ').slice(0, 4).join(', ')}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function WorkerDashboard() {
  const { jobs, applyToJob, workerStatus, workerCurrentJobId } = useApp();

  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number; address: string }>({
    lat: DEMO_WORKER.lat,
    lng: DEMO_WORKER.lng,
    address: 'Quận 1, TP. Hồ Chí Minh',
  });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'price' | 'newest'>('distance');
  const [showMap, setShowMap] = useState(false);

  // Apply modal
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [applyNote, setApplyNote] = useState('');
  const [applyBid, setApplyBid] = useState(0);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [applySuccess, setApplySuccess] = useState(false);
  const [sending, setSending] = useState(false);

  const currentJob = workerCurrentJobId ? jobs.find(j => j.id === workerCurrentJobId) : null;
  const isOnJob = workerStatus === 'on_job';

  const activeJobs = jobs.filter(j => j.status === 'active' && j.expiresAt > Date.now());

  const jobsWithDistance = activeJobs
    .map(job => ({
      job,
      distance: haversineDistance(myLocation.lat, myLocation.lng, job.location.lat, job.location.lng),
    }))
    .filter(({ distance }) => distance <= radiusKm)
    .filter(({ job }) => !activeCategory || job.category === activeCategory);

  const sortedJobs = [...jobsWithDistance].sort((a, b) => {
    if (sortBy === 'distance') return a.distance - b.distance;
    if (sortBy === 'price') return b.job.price - a.job.price;
    return b.job.postedAt - a.job.postedAt;
  });

  const useGPS = () => {
    if (!navigator.geolocation) {
      setGeoError('Trình duyệt không hỗ trợ GPS. Hãy tìm kiếm địa chỉ bên dưới.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const address = await reverseGeocode(lat, lng);
        setMyLocation({ lat, lng, address });
        setGeoLoading(false);
        setGeoError(null);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoError('GPS bị chặn trong môi trường này (permissions policy). Hãy tìm địa chỉ bằng ô tìm kiếm bên dưới.');
        } else if (err.code === 2) {
          setGeoError('Không xác định được vị trí. Hãy tìm địa chỉ thủ công.');
        } else {
          setGeoError('Hết thời gian chờ GPS. Hãy tìm địa chỉ thủ công.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const openApply = (jobId: string) => {
    if (isOnJob) return;
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      const mid = Math.round((job.priceMin + job.priceMax) / 2 / 10000) * 10000;
      setApplyBid(mid);
    }
    setApplyingJobId(jobId);
    setApplyNote('');
  };

  const confirmApply = () => {
    if (!applyingJobId || sending) return;
    setSending(true);
    setTimeout(() => {
      const workerWithLoc: Worker = { ...DEMO_WORKER, lat: myLocation.lat, lng: myLocation.lng };
      applyToJob(applyingJobId, workerWithLoc, applyNote || 'Tôi sẵn sàng làm ngay!', applyBid);
      setAppliedJobs(prev => new Set([...prev, applyingJobId]));
      setApplyingJobId(null);
      setApplyNote('');
      setSending(false);
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 3500);
    }, 600);
  };

  const applyingJob = applyingJobId ? jobs.find(j => j.id === applyingJobId) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">

      {/* Success toast */}
      <AnimatePresence>
        {applySuccess && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-green-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span style={{ fontWeight: 600 }}>Apply thành công! Đợi kết quả nhé 🎉</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply modal — redesigned bottom sheet */}
      <AnimatePresence>
        {applyingJobId && applyingJob && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setApplyingJobId(null)}
              className="fixed inset-0 bg-black/60 z-[9998] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }}
              className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-1/2 md:-translate-x-1/2 z-[9999] w-full md:max-w-md"
            >
              <div className="bg-white md:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden">
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-1 md:hidden">
                  <div className="w-10 h-1 rounded-full bg-gray-200" />
                </div>

                {/* Header */}
                <div className={`px-5 py-4 flex items-center justify-between ${
                  applyingJob.applicants.length === 0
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500'
                }`}>
                  <div>
                    <p className="text-white/80 text-xs">Ứng tuyển</p>
                    <h3 className="text-white" style={{ fontWeight: 700 }}>{applyingJob.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {applyingJob.applicants.length === 0 ? (
                        <span className="flex items-center gap-1 text-green-200 text-xs" style={{ fontWeight: 600 }}>
                          <Flame className="w-3 h-3" /> Chưa ai apply — cơ hội tốt!
                        </span>
                      ) : (
                        <span className="text-white/70 text-xs">{applyingJob.applicants.length} người đã apply</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setApplyingJobId(null)}
                    className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="px-5 pt-5 pb-2 space-y-4">
                  {/* Job quick info */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <span className="text-2xl">{applyingJob.categoryIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-500 text-xs">{applyingJob.duration}h</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-blue-500 text-xs" style={{ fontWeight: 600 }}>
                          📍 {haversineDistance(myLocation.lat, myLocation.lng, applyingJob.location.lat, applyingJob.location.lng).toFixed(1)} km
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs truncate mt-0.5">{applyingJob.location.address}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-400">Khoảng giá</div>
                      <div className="text-orange-500 text-xs" style={{ fontWeight: 700 }}>
                        {(applyingJob.priceMin/1000).toFixed(0)}K–{(applyingJob.priceMax/1000).toFixed(0)}K₫
                      </div>
                    </div>
                  </div>

                  {/* ── Bid price slider ── */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-700 text-sm" style={{ fontWeight: 700 }}>💰 Giá chào của bạn</span>
                      <motion.div key={applyBid}
                        initial={{ scale: 1.15, color: '#2563eb' }}
                        animate={{ scale: 1, color: '#1d4ed8' }}
                        className="bg-blue-600 text-white px-3 py-1 rounded-full"
                        style={{ fontWeight: 800, fontSize: '1rem' }}>
                        {applyBid.toLocaleString('vi-VN')}₫
                      </motion.div>
                    </div>

                    {/* Custom slider */}
                    <div className="relative mb-3">
                      <input
                        type="range"
                        min={applyingJob.priceMin}
                        max={applyingJob.priceMax}
                        step={10000}
                        value={applyBid}
                        onChange={e => setApplyBid(Number(e.target.value))}
                        className="w-full accent-blue-600"
                        style={{ cursor: 'pointer', height: '20px' }}
                      />
                      {/* Track labels */}
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-green-600" style={{ fontWeight: 600 }}>
                          {(applyingJob.priceMin/1000).toFixed(0)}K₫ min
                        </span>
                        <span className="text-orange-500" style={{ fontWeight: 600 }}>
                          {(applyingJob.priceMax/1000).toFixed(0)}K₫ max
                        </span>
                      </div>
                    </div>

                    {/* Competitiveness pill */}
                    {(() => {
                      const ratio = (applyBid - applyingJob.priceMin) / (applyingJob.priceMax - applyingJob.priceMin || 1);
                      const tier = ratio < 0.25
                        ? { label: '🔥 Rất cạnh tranh', bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500', w: '90%' }
                        : ratio < 0.55
                        ? { label: '✅ Cạnh tranh tốt', bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500', w: '60%' }
                        : { label: '⚖️ Trung bình', bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-400', w: '35%' };
                      return (
                        <div className={`${tier.bg} rounded-xl p-3`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs ${tier.text}`} style={{ fontWeight: 700 }}>{tier.label}</span>
                            <span className="text-gray-400 text-xs">AI ưu tiên 35% giá thầu</span>
                          </div>
                          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                            <motion.div animate={{ width: tier.w }} transition={{ duration: 0.4 }}
                              className={`h-full ${tier.bar} rounded-full`} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Worker info + note */}
                  <div className="flex items-center gap-3">
                    <img src={DEMO_WORKER.avatar} className="w-10 h-10 rounded-full border-2 border-orange-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ fontWeight: 600 }}>{DEMO_WORKER.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                        {DEMO_WORKER.rating} · {DEMO_WORKER.completedJobs} việc đã hoàn thành
                      </div>
                    </div>
                  </div>

                  <textarea
                    value={applyNote}
                    onChange={e => setApplyNote(e.target.value)}
                    placeholder="Lời nhắn ngắn (vd: Tôi đến được trong 15 phút, có đủ dụng cụ...)"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder-gray-400"
                  />
                </div>

                {/* Action buttons */}
                <div className="px-5 pb-6 pt-2 flex gap-3">
                  <button onClick={() => setApplyingJobId(null)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition"
                    style={{ fontWeight: 500 }}>
                    Huỷ
                  </button>
                  <motion.button
                    onClick={confirmApply}
                    disabled={sending}
                    whileHover={{ scale: sending ? 1 : 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    className={`flex-1 py-3 rounded-xl text-white text-sm flex items-center justify-center gap-2 transition shadow-lg ${
                      sending ? 'bg-orange-400' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                    }`}
                    style={{ fontWeight: 700 }}>
                    {sending ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Gửi — {applyBid.toLocaleString('vi-VN')}₫
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── ON-JOB STATUS CARD ── */}
      <AnimatePresence>
        {isOnJob && currentJob && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 mb-6 text-white shadow-xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white" style={{ fontWeight: 700 }}>Đang nhận công việc</p>
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/20" style={{ fontWeight: 600 }}>
                    🔒 Đang bận
                  </span>
                </div>
                <p className="text-green-100 text-sm mt-0.5 truncate">{currentJob.title}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <div className="text-white text-sm" style={{ fontWeight: 700 }}>{currentJob.price.toLocaleString('vi-VN')}₫</div>
                <div className="text-green-200 text-xs">Thù lao</div>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <div className="text-white text-sm" style={{ fontWeight: 700 }}>{currentJob.duration}h</div>
                <div className="text-green-200 text-xs">Thời gian</div>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <div className="text-white text-sm truncate" style={{ fontWeight: 700 }}>{currentJob.hirerName.split(' ').slice(-1)[0]}</div>
                <div className="text-green-200 text-xs">Người thuê</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 mb-4">
              <MapPin className="w-3.5 h-3.5 text-green-200 flex-shrink-0" />
              <span className="text-green-100 text-xs truncate">{currentJob.location.address}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-green-100 text-xs">
                ⏳ Thời gian còn lại: <CountdownTimer expiresAt={currentJob.expiresAt} size="sm" />
              </div>
              <Link
                to={`/job/${currentJob.id}`}
                className="bg-white text-green-600 text-xs px-4 py-2 rounded-full hover:bg-green-50 transition"
                style={{ fontWeight: 700 }}
              >
                Xem chi tiết →
              </Link>
            </div>

            <div className="mt-3 flex items-center gap-2 bg-amber-400/30 border border-amber-300/30 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 text-amber-200 flex-shrink-0" />
              <p className="text-amber-100 text-xs">Bạn đang bận. Không thể nhận việc mới cho đến khi người thuê xác nhận hoàn thành.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WORKER PROFILE CARD ── */}
      <div className={`bg-gradient-to-r ${isOnJob ? 'from-gray-600 to-gray-700' : 'from-blue-600 to-indigo-600'} rounded-2xl p-5 mb-6 text-white transition-colors duration-500`}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={DEMO_WORKER.avatar} className="w-14 h-14 rounded-full border-2 border-white/40 bg-blue-400" />
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-blue-600 ${isOnJob ? 'bg-amber-400' : 'bg-green-400'}`} />
          </div>
          <div className="flex-1">
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{DEMO_WORKER.name}</h2>
            <p className="text-blue-200 text-sm">{DEMO_WORKER.bio}</p>
            <div className="flex items-center gap-3 mt-1.5 text-sm">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-300" fill="currentColor" />
                <span style={{ fontWeight: 700 }}>{DEMO_WORKER.rating}</span>
              </span>
              <span className="flex items-center gap-1 text-blue-200">
                <Award className="w-3.5 h-3.5" />{DEMO_WORKER.completedJobs} việc
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isOnJob ? 'bg-amber-400/30 text-amber-200' : 'bg-green-400/30 text-green-200'}`} style={{ fontWeight: 600 }}>
                {isOnJob ? '🔒 Đang bận' : '✅ Sẵn sàng'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MY LOCATION ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-700" style={{ fontWeight: 600 }}>
            <MapPin className="w-4 h-4 inline mr-1 text-orange-500" />Vị trí của tôi
          </h3>
          <button
            onClick={useGPS}
            disabled={geoLoading}
            className="flex items-center gap-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-full transition disabled:opacity-50"
            style={{ fontWeight: 500 }}
          >
            {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            {geoLoading ? 'Đang lấy...' : 'GPS'}
          </button>
        </div>

        {/* GPS error + address search fallback */}
        <AnimatePresence>
          {geoError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-amber-700 mb-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{geoError}</span>
              </div>
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1.5" style={{ fontWeight: 500 }}>🔍 Tìm kiếm địa chỉ thủ công:</p>
                <LocationSearchBox onSelect={(loc) => { setMyLocation(loc); setGeoError(null); }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current address display */}
        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-sm text-gray-600 mb-3">
          📍 {myLocation.address}
        </div>

        {/* Radius */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm text-gray-500">Bán kính:</span>
          <div className="flex gap-2">
            {[2, 5, 10, 20].map(r => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${radiusKm === r ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'}`}
                style={{ fontWeight: radiusKm === r ? 600 : 400 }}
              >{r} km</button>
            ))}
          </div>
        </div>

        {showMap && (
          <div className="mt-3">
            <MapPicker value={myLocation} onChange={setMyLocation} height="240px" />
          </div>
        )}
        <button onClick={() => setShowMap(!showMap)} className="mt-1 text-xs text-blue-500 hover:text-blue-600">
          {showMap ? '▲ Ẩn bản đồ' : '▼ Chọn trên bản đồ'}
        </button>
      </div>

      {/* ── CATEGORIES ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 text-sm px-4 py-2 rounded-full border transition ${!activeCategory ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
          style={{ fontWeight: !activeCategory ? 600 : 400 }}
        >Tất cả</button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border transition ${activeCategory === cat.id ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
            style={{ fontWeight: activeCategory === cat.id ? 600 : 400 }}
          >{cat.icon} {cat.label.split('/')[0].trim()}</button>
        ))}
      </div>

      {/* ── SORT ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-gray-700" style={{ fontWeight: 600 }}>
          {sortedJobs.length} việc
          <span className="text-gray-400 text-sm" style={{ fontWeight: 400 }}> trong bán kính {radiusKm}km</span>
        </p>
        <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
          {[{ key: 'distance', label: '📍 Gần nhất' }, { key: 'price', label: '💰 Giá cao' }, { key: 'newest', label: '🕐 Mới nhất' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key as any)}
              className={`text-xs px-3 py-1.5 rounded-full transition ${sortBy === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              style={{ fontWeight: sortBy === key ? 600 : 400 }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* ── JOB LIST ── */}
      {sortedJobs.length > 0 ? (
        <div className="space-y-4">
          {sortedJobs.map(({ job, distance }, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative ${isOnJob ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <JobCard job={job} workerDistance={distance} isWorker />

              {isOnJob ? (
                <div className="absolute bottom-4 right-4 bg-gray-500/90 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm" style={{ fontWeight: 600 }}>
                  🔒 Đang bận
                </div>
              ) : appliedJobs.has(job.id) ? (
                <div className="absolute bottom-4 right-4 bg-green-500 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md" style={{ fontWeight: 600 }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã apply
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => openApply(job.id)}
                  className="absolute bottom-4 right-4 bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-1.5 rounded-full transition shadow-lg shadow-orange-200 flex items-center gap-1.5"
                  style={{ fontWeight: 700 }}
                >
                  <Briefcase className="w-3.5 h-3.5" /> Apply ⚡
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-500" style={{ fontWeight: 500 }}>Không có việc trong bán kính {radiusKm}km</p>
          <p className="text-gray-400 text-sm mt-1">Thử tăng bán kính hoặc thay đổi địa chỉ</p>
          <button onClick={() => setRadiusKm(20)} className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-full text-sm hover:bg-orange-600 transition" style={{ fontWeight: 500 }}>
            Mở rộng ra 20km
          </button>
        </div>
      )}
    </div>
  );
}