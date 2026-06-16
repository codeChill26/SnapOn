import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { PlusCircle, TrendingUp, Shield, Zap, Star, ArrowRight, CheckCircle, MapPin } from 'lucide-react';
import { motion, AnimatePresence, useInView, animate } from 'motion/react';
import { useApp, CATEGORIES } from '../context/AppContext';
import { JobCard } from '../components/JobCard';

// ─── Images ────────────────────────────────────────────────
const IMG_ERRANDS = 'https://images.unsplash.com/photo-1659634082994-36a7107e5178?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_CONTENT = 'https://images.unsplash.com/photo-1565665532830-0dfd1facb1a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_DESIGN = 'https://images.unsplash.com/photo-1512645592367-97ba8a9d4035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_TECH = 'https://images.unsplash.com/photo-1769085794153-54fd3d57efaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_CARRYING = 'https://images.unsplash.com/photo-1642756457381-930fdc1e2e2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_PHOTOGRAPHY = 'https://images.unsplash.com/photo-1559847580-a4ea81d30549?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_RESEARCH = 'https://images.unsplash.com/photo-1761558794306-466448dab4bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_MANAGER = 'https://images.unsplash.com/photo-1712903276023-f969c7a890bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_ENTERTAINMENT = 'https://images.unsplash.com/photo-1771191057577-e216395637a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_STUDY = 'https://images.unsplash.com/photo-1758525861793-9258e09708e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_OTHERS = 'https://images.unsplash.com/photo-1563048976-b053d7e31a11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

// ─── Slide data ─────────────────────────────────────────────
const SLIDES = [
  {
    id: 0, img: IMG_ERRANDS,
    gradient: 'from-orange-700/80 via-orange-600/60 to-transparent', accent: '#f97316',
    label: '🏃 Errands', title: 'Việc vặt xong ngay\ntrong tích tắc',
    sub: 'Mua đồ, nộp hồ sơ, xếp hàng — có người làm thay bạn.',
    price: '80,000₫', priceLabel: 'Từ',
    worker: { name: 'Nguyễn Thị Mai', rating: 4.9, jobs: 214, dist: '0.8 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NTMai' },
    matchTime: '3 phút 12 giây', color: 'orange',
  },
  {
    id: 1, img: IMG_CONTENT,
    gradient: 'from-indigo-800/80 via-indigo-600/60 to-transparent', accent: '#6366f1',
    label: '✍️ Content / Translate', title: 'Viết bài & dịch thuật\nchuyên nghiệp',
    sub: 'Copywriting, dịch Anh-Việt, viết blog — giao bài trong vài giờ.',
    price: '200,000₫', priceLabel: 'Từ',
    worker: { name: 'Trần Văn Hùng', rating: 4.7, jobs: 389, dist: '1.2 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TVHung' },
    matchTime: '1 phút 45 giây', color: 'indigo',
  },
  {
    id: 2, img: IMG_DESIGN,
    gradient: 'from-pink-800/80 via-pink-600/60 to-transparent', accent: '#ec4899',
    label: '🎨 Design', title: 'Thiết kế sáng tạo\ntheo ý bạn',
    sub: 'Logo, banner, poster, social media — designer online sẵn sàng.',
    price: '300,000₫', priceLabel: 'Từ',
    worker: { name: 'Lê Hoàng Nam', rating: 4.8, jobs: 156, dist: '2.0 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LHNam' },
    matchTime: '4 phút 30 giây', color: 'pink',
  },
  {
    id: 3, img: IMG_TECH,
    gradient: 'from-cyan-800/80 via-cyan-700/60 to-transparent', accent: '#06b6d4',
    label: '💻 Tech', title: 'Hỗ trợ kỹ thuật\nnhanh chóng',
    sub: 'Sửa máy tính, cài đặt phần mềm, fix bug website.',
    price: '250,000₫', priceLabel: 'Từ',
    worker: { name: 'Phan Quốc Bảo', rating: 4.9, jobs: 312, dist: '1.5 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PQB' },
    matchTime: '2 phút 20 giây', color: 'cyan',
  },
  {
    id: 4, img: IMG_CARRYING,
    gradient: 'from-amber-800/80 via-amber-600/60 to-transparent', accent: '#f59e0b',
    label: '📦 Carrying', title: 'Khuân vác & vận chuyển\nan toàn',
    sub: 'Chuyển nhà, khuân đồ nặng, dọn kho — có người hỗ trợ ngay.',
    price: '150,000₫', priceLabel: 'Từ',
    worker: { name: 'Võ Minh Tuấn', rating: 4.6, jobs: 178, dist: '0.5 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VMT' },
    matchTime: '2 phút 50 giây', color: 'amber',
  },
  {
    id: 5, img: IMG_PHOTOGRAPHY,
    gradient: 'from-violet-800/80 via-violet-600/60 to-transparent', accent: '#8b5cf6',
    label: '📸 Photography / Media', title: 'Chụp ảnh & quay video\nchuyên nghiệp',
    sub: 'Sự kiện, sản phẩm, TikTok content — photographer gần bạn.',
    price: '500,000₫', priceLabel: 'Từ',
    worker: { name: 'Đặng Thu Hà', rating: 4.9, jobs: 95, dist: '3.0 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DTH' },
    matchTime: '5 phút 15 giây', color: 'violet',
  },
  {
    id: 6, img: IMG_RESEARCH,
    gradient: 'from-teal-800/80 via-teal-600/60 to-transparent', accent: '#14b8a6',
    label: '🔍 Research', title: 'Nghiên cứu & khảo sát\nchi tiết',
    sub: 'Thu thập dữ liệu, khảo sát thị trường, tổng hợp tài liệu.',
    price: '200,000₫', priceLabel: 'Từ',
    worker: { name: 'Bùi Thanh Hương', rating: 4.7, jobs: 64, dist: '2.5 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BTH' },
    matchTime: '3 phút 40 giây', color: 'teal',
  },
  {
    id: 7, img: IMG_MANAGER,
    gradient: 'from-slate-800/80 via-slate-600/60 to-transparent', accent: '#64748b',
    label: '📋 Manager', title: 'Quản lý sự kiện\n& dự án',
    sub: 'Lên kế hoạch, điều phối nhân sự, giám sát tiến độ.',
    price: '400,000₫', priceLabel: 'Từ',
    worker: { name: 'Hoàng Minh Đức', rating: 4.8, jobs: 42, dist: '1.8 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HMD' },
    matchTime: '6 phút 10 giây', color: 'slate',
  },
  {
    id: 8, img: IMG_ENTERTAINMENT,
    gradient: 'from-rose-800/80 via-rose-600/60 to-transparent', accent: '#f43f5e',
    label: '🎭 Entertainment', title: 'Giải trí & biểu diễn\nsôi động',
    sub: 'MC, ca sĩ, ảo thuật, nhạc sống — cho mọi sự kiện.',
    price: '600,000₫', priceLabel: 'Từ',
    worker: { name: 'Trịnh Khánh Linh', rating: 4.9, jobs: 73, dist: '4.0 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TKL' },
    matchTime: '7 phút 00 giây', color: 'rose',
  },
  {
    id: 9, img: IMG_STUDY,
    gradient: 'from-blue-800/80 via-blue-600/60 to-transparent', accent: '#3b82f6',
    label: '📚 Study Help', title: 'Gia sư & hỗ trợ\nhọc tập',
    sub: 'Toán, Lý, Hóa, Anh văn — gia sư giỏi gần bạn nhất.',
    price: '150,000₫', priceLabel: 'Từ',
    worker: { name: 'Ngô Quang Huy', rating: 4.8, jobs: 128, dist: '1.0 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NQH' },
    matchTime: '2 phút 55 giây', color: 'blue',
  },
  {
    id: 10, img: IMG_OTHERS,
    gradient: 'from-emerald-800/80 via-emerald-600/60 to-transparent', accent: '#10b981',
    label: '⚡ Others', title: 'Mọi việc khác\ncũng có người làm',
    sub: 'Bất kỳ công việc ngắn hạn nào — đăng lên và tìm người ngay.',
    price: '100,000₫', priceLabel: 'Từ',
    worker: { name: 'Phan Thị Lan', rating: 4.6, jobs: 98, dist: '3.5 km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PTLan' },
    matchTime: '5 phút 08 giây', color: 'green',
  },
];

const SLIDE_DURATION = 5000; // ms per slide

// ─── Animated counter ───────────────────────────────────────
function CountStat({ target, suffix, label, delay = 0 }: { target: number; suffix: string; label: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const ctrl = animate(0, target, { duration: 1.8, ease: 'easeOut', onUpdate: v => setValue(Math.floor(v)) });
    return () => ctrl.stop();
  }, [inView, target]);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5 }} className="text-center">
      <div className="text-white" style={{ fontWeight: 800, fontSize: '1.6rem' }}>{value.toLocaleString()}{suffix}</div>
      <div className="text-orange-200 text-xs mt-0.5">{label}</div>
    </motion.div>
  );
}

// ─── Hero Slideshow ─────────────────────────────────────────
function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { jobs, currentUser, firebaseUser } = useApp();
  const navigate = useNavigate();
  const isLoggedIn = !!firebaseUser;

  const handleSelectNow = () => {
    if (!isLoggedIn) {
      navigate('/login');
    } else if (currentUser.role === 'worker') {
      navigate('/worker');
    } else {
      navigate('/post');
    }
  };

  const activeCount = jobs.filter(j => j.status === 'active').length;

  const startTimers = () => {
    // Progress bar
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) return 0;
        return p + (100 / (SLIDE_DURATION / 50));
      });
    }, 50);
    // Slide advance
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % SLIDES.length);
      setProgress(0);
    }, SLIDE_DURATION);
  };

  useEffect(() => {
    startTimers();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const goTo = (idx: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setCurrent(idx);
    setProgress(0);
    startTimers();
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50; // pixels
    if (info.offset.x < -swipeThreshold) {
      // Swiped left -> next slide
      goTo((current + 1) % SLIDES.length);
    } else if (info.offset.x > swipeThreshold) {
      // Swiped right -> prev slide
      goTo((current - 1 + SLIDES.length) % SLIDES.length);
    }
  };

  const slide = SLIDES[current];

  return (
    <section className="relative overflow-hidden w-full select-none" style={{ minHeight: '600px' }}>

      {/* ── Sliding background with Ken Burns ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${slide.id}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          {/* Ken Burns image */}
          <motion.img
            key={`img-${slide.id}`}
            src={slide.img}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ scale: 1 }}
            animate={{ scale: 1.05 }}
            transition={{ duration: SLIDE_DURATION / 1000 + 1, ease: 'linear' }}
          />
          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* ── Slide content with Drag Support ── */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragEnd={handleDragEnd}
        className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 flex flex-col justify-between cursor-grab active:cursor-grabbing"
        style={{ minHeight: '600px' }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-10">

          {/* Left: text */}
          <div className="flex-1 max-w-xl">
            {/* Label pill */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`label-${slide.id}`}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 text-white text-xs md:text-sm px-4 py-2 rounded-full mb-6 backdrop-blur-md border border-white/30 shadow-lg"
                style={{ fontWeight: 700, background: `linear-gradient(135deg, ${slide.accent}77, ${slide.accent}33)` }}
              >
                <motion.span
                  animate={{ rotate: [0, 20, -15, 0] }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-base"
                >
                  {slide.label.split(' ')[0]}
                </motion.span>
                <span className="tracking-wider uppercase">{slide.label.split(' ').slice(1).join(' ')}</span>
                <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80] animate-pulse" />
              </motion.div>
            </AnimatePresence>

            {/* Title */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={`title-${slide.id}`}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-white mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] font-extrabold tracking-tight"
                style={{ fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', lineHeight: 1.15, whiteSpace: 'pre-line' }}
              >
                {slide.title}
              </motion.h1>
            </AnimatePresence>

            {/* Subtitle */}
            <AnimatePresence mode="wait">
              <motion.p
                key={`sub-${slide.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-white/90 mb-8 max-w-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] font-medium"
                style={{ fontSize: '1.05rem', lineHeight: 1.7 }}
              >
                {slide.sub}
              </motion.p>
            </AnimatePresence>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex flex-wrap gap-4"
            >
              <Link
                to="/post"
                className="flex items-center gap-2 bg-white text-gray-900 hover:bg-orange-50 px-6 py-3.5 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300"
                style={{ fontWeight: 800 }}
              >
                <PlusCircle className="w-5 h-5 text-orange-500" />
                Đăng việc ngay
              </Link>
              <Link
                to="/worker"
                className="flex items-center gap-2 bg-white/10 text-white border border-white/20 hover:bg-white/20 px-6 py-3.5 rounded-2xl backdrop-blur-md hover:border-white/40 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] transition-all duration-300"
                style={{ fontWeight: 700 }}
              >
                Tìm việc <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Live count */}
            {activeCount > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 flex items-center gap-2.5 text-white/85 text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
              >
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]"
                />
                <span><strong className="text-white font-semibold">{activeCount} việc</strong> đang tuyển ngay lúc này</span>
              </motion.div>
            )}
          </div>

          {/* Right: animated worker card */}
          <div className="hidden md:flex flex-col gap-4 flex-shrink-0 w-80 relative" style={{ minHeight: '340px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`cardgroup-${slide.id}`}
                initial={{ opacity: 0, y: 30, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.5, type: 'spring', bounce: 0.25 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-white/40">
                  {/* AI Match header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100/60">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md" style={{ background: slide.accent }}>
                      <Zap className="w-4 h-4 text-white" fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-gray-900 text-xs font-bold uppercase tracking-wider">AI Match</p>
                      <p className="text-gray-500 text-[10px] font-medium">Tìm được trong {slide.matchTime}</p>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="ml-auto w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                    />
                  </div>

                  {/* Worker info */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="relative">
                      <img src={slide.worker.avatar} alt={slide.worker.name}
                        className="w-14 h-14 rounded-2xl border-2 bg-gray-50 shadow-sm transition-transform duration-300 hover:scale-105"
                        style={{ borderColor: slide.accent }} />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-[9px] shadow-sm">⚡</span>
                    </div>
                    <div>
                      <p className="text-gray-950 text-base font-extrabold">{slide.worker.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.floor(slide.worker.rating) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" />
                        ))}
                        <span className="text-gray-700 text-xs ml-1 font-bold">{slide.worker.rating}</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1 font-medium">{slide.worker.jobs} việc đã làm</p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-3 text-center transition-all hover:bg-gray-50">
                      <div className="flex items-center justify-center gap-1.5 text-blue-500 mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{slide.worker.dist}</span>
                      </div>
                      <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Khoảng cách</p>
                    </div>
                    <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-3 text-center transition-all hover:bg-gray-50">
                      <div className="text-xs font-extrabold mb-1" style={{ color: slide.accent }}>
                        {slide.priceLabel} {slide.price}
                      </div>
                      <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Thù lao</p>
                    </div>
                  </div>

                  {/* Accept button */}
                  <motion.button
                    onClick={handleSelectNow}
                    whileHover={{ scale: 1.03, boxShadow: `0 10px 20px ${slide.accent}50`, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full mt-4 py-3 rounded-2xl text-white text-sm transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${slide.accent}, ${slide.accent}dd)`, fontWeight: 700 }}
                  >
                    <span>✅ Chọn ngay</span>
                  </motion.button>
                </div>

                {/* Incoming notification card */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3.5 shadow-xl border border-white/40 flex items-center gap-3.5"
                >
                  <motion.div
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 1 }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base shadow-sm"
                    style={{ background: `${slide.accent}22` }}
                  >
                    {slide.label.split(' ')[0]}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-950 text-xs font-bold">Ứng viên mới!</p>
                    <p className="text-gray-500 truncate text-[11px] font-medium mt-0.5">
                      {slide.worker.name} vừa apply · {slide.worker.dist}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full flex-shrink-0 animate-ping" style={{ background: slide.accent }} />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Slide controls ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mt-8">
          {/* Dots + progress */}
          <div className="flex items-center gap-2.5">
            {SLIDES.map((s, i) => (
              <button key={i} onClick={() => goTo(i)} className="relative flex items-center p-1 cursor-pointer">
                {i === current ? (
                  <div className="relative h-2 rounded-full overflow-hidden shadow-inner" style={{ width: 48, background: 'rgba(255,255,255,0.2)' }}>
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: slide.accent, width: `${progress}%` }}
                    />
                  </div>
                ) : (
                  <div
                    className="w-2.5 h-2.5 rounded-full transition-all duration-300 hover:scale-125"
                    style={{ background: i < current ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Slide labels - scrollable horizontal list */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 max-w-full sm:max-w-[70%] py-1.5 px-1 scroll-smooth -mr-4 pr-4 sm:mr-0 sm:pr-0">
            {SLIDES.map((s, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="text-xs px-4 py-2 rounded-full transition-all shrink-0 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md cursor-pointer"
                style={{
                  background: i === current ? `${s.accent}` : 'rgba(255,255,255,0.12)',
                  color: 'white',
                  fontWeight: i === current ? 700 : 500,
                  backdropFilter: 'blur(12px)',
                  border: i === current ? `1px solid rgba(255,255,255,0.4)` : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: i === current ? `0 0 15px ${s.accent}60` : 'none',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats bar */}
      <div className="relative bg-black/45 backdrop-blur-md border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <CountStat target={12400} suffix="+" label="Việc đã hoàn thành" delay={0} />
          <CountStat target={3200} suffix="+" label="Người lao động" delay={0.1} />
          <CountStat target={98} suffix="%" label="Tỷ lệ hài lòng" delay={0.2} />
          <CountStat target={5} suffix=" phút" label="Matching trung bình" delay={0.3} />
        </div>
      </div>
    </section>
  );
}

// ─── Service showcase card ───────────────────────────────────
function ServiceCard({ icon, title, price, img, delay }: { icon: string; title: string; price: string; img: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5, type: 'spring', bounce: 0.3 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer border border-gray-100 group"
    >
      <div className="h-36 overflow-hidden relative">
        <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 left-3 text-2xl">{icon}</div>
      </div>
      <div className="p-3">
        <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{title}</p>
        <p className="text-orange-500 text-xs mt-0.5" style={{ fontWeight: 600 }}>Từ {price}</p>
      </div>
    </motion.div>
  );
}

// ─── Main component ──────────────────────────────────────────
export default function Home() {
  const { jobs, currentUser, firebaseUser } = useApp();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'matched'>('all');
  const isLoggedIn = !!firebaseUser;

  const isWorker = currentUser.role === 'worker';

  const filteredJobs = jobs.filter(j => {
    if (activeCategory && j.category !== activeCategory) return false;
    if (filter === 'active') return j.status === 'active';
    if (filter === 'matched') return j.status === 'matched';
    return true;
  });

  const HOW_IT_WORKS = [
    { step: '01', icon: '📝', title: 'Đăng việc trong 2 phút', desc: 'Mô tả công việc, chọn địa điểm trên bản đồ, đặt thù lao phù hợp.' },
    { step: '02', icon: '🤖', title: 'AI tìm người gần nhất', desc: 'Hệ thống AI phân tích khoảng cách, kỹ năng, đánh giá để matching tốt nhất.' },
    { step: '03', icon: '⚡', title: 'Xác nhận trong 5 phút', desc: 'Người lao động apply, bạn xem hồ sơ và xác nhận. Xong trong vài phút!' },
  ];

  const TESTIMONIALS = [
    { name: 'Trần Anh Tuấn', role: 'Doanh nhân', text: 'Tuyệt vời! Tôi đăng việc dọn nhà lúc 9h, có người đến lúc 9h45. Nhanh hơn nhiều so với gọi điện tìm người.', rating: 5, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TAT' },
    { name: 'Nguyễn Bích Liên', role: 'Nội trợ', text: 'Chị giúp việc qua SnapOn làm rất cẩn thận, có rating 4.9 nên tôi rất yên tâm.', rating: 5, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NBL' },
    { name: 'Phạm Quốc Bảo', role: 'Sinh viên', text: 'Mỗi tuần tôi kiếm thêm 1-2 triệu từ các việc nhỏ qua app. Linh hoạt giờ giấc!', rating: 5, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PQB' },
  ];

  return (
    <div className="pb-20 md:pb-0 overflow-x-hidden">

      {/* ── ANIMATED HERO SLIDESHOW ── */}
      <HeroSlideshow />

      {/* ── SERVICES ── */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5 }} className="text-center mb-8">
          <h2 className="text-gray-900 mb-2" style={{ fontWeight: 800, fontSize: '1.6rem' }}>Mọi việc, giao ngay hôm nay</h2>
          <p className="text-gray-400 text-sm">Hơn 20 loại dịch vụ sẵn sàng trong bán kính 5km</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: '🏃', title: 'Errands', price: '80,000₫', img: IMG_ERRANDS, delay: 0 },
            { icon: '✍️', title: 'Content / Translate', price: '200,000₫', img: IMG_CONTENT, delay: 0.05 },
            { icon: '🎨', title: 'Design', price: '300,000₫', img: IMG_DESIGN, delay: 0.1 },
            { icon: '💻', title: 'Tech', price: '250,000₫', img: IMG_TECH, delay: 0.15 },
            { icon: '📦', title: 'Carrying', price: '150,000₫', img: IMG_CARRYING, delay: 0.2 },
            { icon: '📸', title: 'Photography', price: '500,000₫', img: IMG_PHOTOGRAPHY, delay: 0.25 },
            { icon: '🔍', title: 'Research', price: '200,000₫', img: IMG_RESEARCH, delay: 0.3 },
            { icon: '📋', title: 'Manager', price: '400,000₫', img: IMG_MANAGER, delay: 0.35 },
            { icon: '🎭', title: 'Entertainment', price: '600,000₫', img: IMG_ENTERTAINMENT, delay: 0.4 },
            { icon: '📚', title: 'Study Help', price: '150,000₫', img: IMG_STUDY, delay: 0.45 },
            { icon: '⚡', title: 'Others', price: '100,000₫', img: IMG_OTHERS, delay: 0.5 },
          ].map(s => <ServiceCard key={s.title} {...s} />)}
        </div>

        {/* Category pills */}
        <div className="mt-6 grid grid-cols-4 sm:grid-cols-6 gap-2">
          {CATEGORIES.map((cat, i) => (
            <motion.button key={cat.id}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, type: 'spring', bounce: 0.4 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${activeCategory === cat.id ? 'bg-orange-500 border-orange-500 shadow-md' : 'bg-white border-gray-100 hover:border-orange-200 hover:bg-orange-50'
                }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className={`text-xs text-center leading-tight ${activeCategory === cat.id ? 'text-white' : 'text-gray-600'}`}
                style={{ fontWeight: activeCategory === cat.id ? 600 : 400 }}>
                {cat.label.split('/')[0].trim()}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── JOB LISTINGS ── */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.2rem' }}>
            {activeCategory
              ? `${CATEGORIES.find(c => c.id === activeCategory)?.icon} ${CATEGORIES.find(c => c.id === activeCategory)?.label}`
              : isWorker ? '🔍 Việc gần bạn' : '🔥 Việc đang tuyển'}
            <span className="ml-2 text-sm text-gray-400" style={{ fontWeight: 400 }}>({filteredJobs.length})</span>
          </motion.h2>
          <div className="flex items-center bg-gray-100 rounded-full p-1">
            {[{ key: 'all', label: 'Tất cả' }, { key: 'active', label: '🟢 Đang tuyển' }, { key: 'matched', label: '✅ Đã khớp' }].map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key as any)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all ${filter === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                style={{ fontWeight: filter === key ? 600 : 400 }}>{label}</button>
            ))}
          </div>
        </div>

        {filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job, i) => (
              <motion.div key={job.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.07, duration: 0.4, type: 'spring', bounce: 0.2 }}>
                <JobCard job={job} isWorker={isWorker} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-500" style={{ fontWeight: 500 }}>Không có việc nào</p>
            <Link to="/post" className="mt-4 inline-flex items-center gap-2 text-orange-500 text-sm" style={{ fontWeight: 500 }}>
              <PlusCircle className="w-4 h-4" /> Đăng việc đầu tiên
            </Link>
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-gray-900 py-16 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-white mb-2" style={{ fontWeight: 800, fontSize: '1.6rem' }}>Hoạt động thế nào?</h2>
            <p className="text-gray-400 text-sm">3 bước đơn giản · Nhanh như chớp</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-orange-500/30 via-orange-500 to-orange-500/30" />
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div key={item.step}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }} className="text-center">
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: 'spring', stiffness: 300 }}
                  className="w-16 h-16 bg-orange-500/20 border border-orange-500/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                  {item.icon}
                </motion.div>
                <div className="text-orange-400 text-xs mb-2" style={{ fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Bước {item.step}</div>
                <h3 className="text-white mb-2" style={{ fontWeight: 700, fontSize: '1rem' }}>{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-10">
          <h2 className="text-gray-900 mb-2" style={{ fontWeight: 800, fontSize: '1.6rem' }}>Người dùng nói gì?</h2>
          <p className="text-gray-400 text-sm">Hơn 12,000 lượt đánh giá 5 sao</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.12 }} whileHover={{ y: -4 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-yellow-400" fill="currentColor" />)}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full bg-gray-100" />
                <div>
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-gradient-to-br from-orange-50 to-amber-50 py-14">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-10">
            <h2 className="text-gray-900 mb-2" style={{ fontWeight: 800, fontSize: '1.6rem' }}>Tại sao chọn SnapOn?</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: <Zap className="w-6 h-6 text-orange-500" />, title: 'AI Matching thông minh', desc: 'Tự động tìm người gần nhất với kỹ năng phù hợp nhất trong vài giây.', bg: 'bg-orange-100' },
              { icon: <Shield className="w-6 h-6 text-blue-500" />, title: 'Đánh giá & Xác minh', desc: 'Mọi người lao động đều xác minh danh tính với hệ thống đánh giá minh bạch.', bg: 'bg-blue-100' },
              { icon: <TrendingUp className="w-6 h-6 text-green-500" />, title: 'Thanh toán bảo vệ', desc: 'Tiền được giữ an toàn cho đến khi công việc được xác nhận hoàn thành.', bg: 'bg-green-100' },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>{f.icon}</div>
                <h3 className="text-gray-900 mb-2" style={{ fontWeight: 700 }}>{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-r from-orange-500 to-amber-500 py-14">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <h2 className="text-white mb-3" style={{ fontWeight: 800, fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>
              Sẵn sàng bắt đầu chưa?
            </h2>
            <p className="text-orange-100 mb-7 text-sm">Miễn phí đăng ký · Không cần thẻ tín dụng · Tìm người trong 5 phút</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {!isLoggedIn ? (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 bg-white text-gray-900 hover:bg-orange-50 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    style={{ fontWeight: 700 }}
                  >
                    Đăng nhập / Đăng ký
                  </Link>
                  <Link to="/worker" className="flex items-center gap-2 bg-white/20 text-white border border-white/30 px-7 py-3.5 rounded-xl hover:bg-white/30 hover:-translate-y-0.5 transition-all backdrop-blur-sm" style={{ fontWeight: 600 }}>
                    Tìm việc làm thêm <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              ) : isWorker ? (
                <Link
                  to="/worker"
                  className="flex items-center gap-2 bg-white text-gray-900 hover:bg-orange-50 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  style={{ fontWeight: 700 }}
                >
                  Tìm việc làm thêm <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/post"
                  className="flex items-center gap-2 bg-white text-gray-900 hover:bg-orange-50 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  style={{ fontWeight: 700 }}
                >
                  <PlusCircle className="w-5 h-5 text-orange-500" />
                  Đăng việc ngay
                </Link>
              )}
            </div>
            <div className="flex items-center justify-center gap-5 mt-6 text-orange-100 text-xs">
              {['Đã xác minh danh tính', 'Bảo đảm thanh toán', 'Hỗ trợ 24/7'].map(t => (
                <span key={t} className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-300" /> {t}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}