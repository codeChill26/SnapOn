import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  PlusCircle, TrendingUp, Shield, Zap, Star, ArrowRight, CheckCircle,
  MapPin, Sparkles, Search, X, SlidersHorizontal, ArrowUpDown,
  ChevronLeft, ChevronRight, Filter, Flame, DollarSign, Briefcase,
  Layers, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence, useInView, animate } from 'motion/react';
import { useApp } from '../context/AppContext';
import { JobCard } from '../components/JobCard';
import { bannerService } from '../../services/bannerService';
import { HomeBanner, Category, Skill } from '../../types';
import { useScrollRestore } from '../hooks/useScrollRestore';

// ─── Fallback images ────────────────────────────────────────
const IMG_ERRANDS = 'https://images.unsplash.com/photo-1659634082994-36a7107e5178?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_CONTENT = 'https://images.unsplash.com/photo-1565665532830-0dfd1facb1a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_DESIGN = 'https://images.unsplash.com/photo-1512645592367-97ba8a9d4035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_TECH = 'https://images.unsplash.com/photo-1769085794153-54fd3d57efaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const IMG_CARRYING = 'https://images.unsplash.com/photo-1642756457381-930fdc1e2e2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

const DEFAULT_SLIDES = [
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
];

const SLIDE_DURATION = 5000;
const ITEMS_PER_PAGE = 9;

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
      <div className="text-white font-extrabold text-2xl md:text-3xl">{value.toLocaleString()}{suffix}</div>
      <div className="text-orange-200 text-xs mt-0.5 font-medium">{label}</div>
    </motion.div>
  );
}

function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { jobs, currentUser, firebaseUser } = useApp();
  const navigate = useNavigate();
  const isLoggedIn = !!firebaseUser;

  const slides = DEFAULT_SLIDES;

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
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) return 0;
        return p + (100 / (SLIDE_DURATION / 50));
      });
    }, 50);

    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
      setProgress(0);
    }, SLIDE_DURATION);
  };

  useEffect(() => {
    startTimers();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [slides.length]);

  const goTo = (idx: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setCurrent(idx);
    setProgress(0);
    startTimers();
  };

  const slide = slides[current] || slides[0];

  return (
    <section className="relative overflow-hidden w-full select-none min-h-[560px] md:min-h-[620px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${slide.id}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          <motion.img
            key={`img-${slide.id}`}
            src={slide.img}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ scale: 1 }}
            animate={{ scale: 1.05 }}
            transition={{ duration: SLIDE_DURATION / 1000 + 1, ease: 'linear' }}
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-16 md:py-20 flex flex-col justify-between min-h-[560px] md:min-h-[620px]">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-10">
          {/* Left Text Info */}
          <div className="flex-1 max-w-xl">
            <AnimatePresence mode="wait">
              <motion.span
                key={`badge-${slide.id}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-white/20 backdrop-blur-md border border-white/30 mb-4 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                {slide.label}
              </motion.span>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.h1
                key={`title-${slide.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="text-white font-extrabold text-3xl md:text-5xl leading-tight mb-4 drop-shadow-md whitespace-pre-line"
              >
                {slide.title}
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.p
                key={`sub-${slide.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="text-white/90 text-sm md:text-base leading-relaxed mb-8 drop-shadow"
              >
                {slide.sub}
              </motion.p>
            </AnimatePresence>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              <Link
                to="/post"
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all font-bold text-sm md:text-base"
              >
                <PlusCircle className="w-5 h-5" />
                Đăng việc ngay
              </Link>
              <Link
                to="/worker"
                className="flex items-center gap-2 bg-white/15 text-white border border-white/30 hover:bg-white/25 px-6 py-3.5 rounded-2xl backdrop-blur-md hover:-translate-y-0.5 transition-all font-bold text-sm md:text-base"
              >
                Tìm việc <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Live active job count */}
            {activeCount > 0 && (
              <div className="mt-6 flex items-center gap-2 text-white/90 text-sm font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
                <span><strong className="text-white">{activeCount} việc</strong> đang tuyển trực tiếp</span>
              </div>
            )}
          </div>

          {/* Right Card: AI Match preview */}
          <div className="hidden md:flex flex-col gap-4 flex-shrink-0 w-80">
            <AnimatePresence mode="wait">
              <motion.div
                key={`card-${slide.id}`}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4 }}
                className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-white/50"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: slide.accent }}>
                      ⚡
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">AI MATCHING</p>
                      <p className="text-[10px] text-gray-500">Khớp sau {slide.matchTime}</p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <img src={slide.worker.avatar} alt="" className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{slide.worker.name}</p>
                    <div className="flex items-center gap-1 text-xs text-yellow-500 font-bold mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{slide.worker.rating}</span>
                      <span className="text-gray-400 font-normal">({slide.worker.jobs} việc)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center mb-4">
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-900">{slide.worker.dist}</p>
                    <p className="text-[10px] text-gray-400">Khoảng cách</p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-orange-600">{slide.price}</p>
                    <p className="text-[10px] text-gray-400">Thù lao</p>
                  </div>
                </div>

                <button
                  onClick={handleSelectNow}
                  className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition shadow"
                  style={{ background: slide.accent }}
                >
                  Khám phá ngay
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Slide navigation pills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8">
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${i === current ? 'w-8 bg-orange-400' : 'w-2 bg-white/40 hover:bg-white/60'}`}
              />
            ))}
          </div>

          <div className="flex overflow-x-auto gap-2 max-w-full py-1">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`text-xs px-3.5 py-1.5 rounded-full transition whitespace-nowrap ${
                  i === current
                    ? 'bg-white text-gray-900 font-bold shadow'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 backdrop-blur'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats counter bar */}
      <div className="relative bg-black/50 backdrop-blur-md border-t border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <CountStat target={12400} suffix="+" label="Việc đã hoàn thành" delay={0} />
          <CountStat target={3200} suffix="+" label="Người lao động" delay={0.1} />
          <CountStat target={98} suffix="%" label="Tỷ lệ hài lòng" delay={0.2} />
          <CountStat target={5} suffix=" phút" label="Khớp lệnh trung bình" delay={0.3} />
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { jobs, categories, currentUser } = useApp();
  useScrollRestore('/', jobs.length > 0);

  // ── FILTER STATES (Aligned with Mobile App) ──
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState<'ALL' | 'RECRUITMENT' | 'SERVICE_OFFER'>('ALL');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [workModeFilter, setWorkModeFilter] = useState<'ALL' | 'REMOTE' | 'ONSITE' | 'NEGOTIABLE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [priceRangeFilter, setPriceRangeFilter] = useState<'ALL' | 'UNDER_200' | '200_500' | '500_1000' | 'ABOVE_1000'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'hot' | 'price_desc' | 'price_asc' | 'urgent'>('newest');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const jobListRef = useRef<HTMLDivElement>(null);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset subcategory when category changes
  const handleCategorySelect = (slug: string | null) => {
    setSelectedCategorySlug(slug);
    setSelectedSubcategoryId(null);
    setCurrentPage(1);
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setPostTypeFilter('ALL');
    setSelectedCategorySlug(null);
    setSelectedSubcategoryId(null);
    setWorkModeFilter('ALL');
    setStatusFilter('ALL');
    setPriceRangeFilter('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const activeCategoryObj = useMemo(() => {
    return categories.find(c => c.slug === selectedCategorySlug || c.id === selectedCategorySlug);
  }, [categories, selectedCategorySlug]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      debouncedSearch ||
      postTypeFilter !== 'ALL' ||
      selectedCategorySlug ||
      selectedSubcategoryId ||
      workModeFilter !== 'ALL' ||
      statusFilter !== 'ALL' ||
      priceRangeFilter !== 'ALL' ||
      sortBy !== 'newest'
    );
  }, [debouncedSearch, postTypeFilter, selectedCategorySlug, selectedSubcategoryId, workModeFilter, statusFilter, priceRangeFilter, sortBy]);

  // ── FILTERING LOGIC ──
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const raw = job.rawTask;

      // 1. Search Query
      if (debouncedSearch) {
        const titleMatch = job.title.toLowerCase().includes(debouncedSearch);
        const descMatch = job.description.toLowerCase().includes(debouncedSearch);
        const posterMatch = job.hirerName.toLowerCase().includes(debouncedSearch);
        const hashtagMatch = raw?.hashtags?.some(h => h.toLowerCase().includes(debouncedSearch));
        if (!titleMatch && !descMatch && !posterMatch && !hashtagMatch) return false;
      }

      // 2. Post Type
      if (postTypeFilter !== 'ALL') {
        const pType = raw?.postType || 'RECRUITMENT';
        if (pType !== postTypeFilter) return false;
      }

      // 3. Category
      if (selectedCategorySlug && job.category !== selectedCategorySlug) {
        return false;
      }

      // 4. Subcategory / Skill
      if (selectedSubcategoryId && raw?.skillId && raw.skillId !== selectedSubcategoryId) {
        return false;
      }

      // 5. Work Mode
      if (workModeFilter !== 'ALL') {
        const wMode = raw?.workMode || 'REMOTE';
        if (wMode !== workModeFilter) return false;
      }

      // 6. Status
      if (statusFilter !== 'ALL') {
        const s = raw?.status || (job.status === 'active' ? 'OPEN' : job.status === 'matched' ? 'IN_PROGRESS' : 'COMPLETED');
        if (s !== statusFilter) return false;
      }

      // 7. Price Range
      if (priceRangeFilter !== 'ALL') {
        const minP = job.priceMin;
        const maxP = job.priceMax;
        if (priceRangeFilter === 'UNDER_200' && minP >= 200000) return false;
        if (priceRangeFilter === '200_500' && (maxP < 200000 || minP > 500000)) return false;
        if (priceRangeFilter === '500_1000' && (maxP < 500000 || minP > 1000000)) return false;
        if (priceRangeFilter === 'ABOVE_1000' && maxP < 1000000) return false;
      }

      return true;
    });
  }, [jobs, debouncedSearch, postTypeFilter, selectedCategorySlug, selectedSubcategoryId, workModeFilter, statusFilter, priceRangeFilter]);

  // ── SORTING LOGIC ──
  const sortedJobs = useMemo(() => {
    const list = [...filteredJobs];
    if (sortBy === 'hot') {
      return list.sort((a, b) => b.applicants.length - a.applicants.length);
    }
    if (sortBy === 'price_desc') {
      return list.sort((a, b) => b.priceMax - a.priceMax);
    }
    if (sortBy === 'price_asc') {
      return list.sort((a, b) => a.priceMin - b.priceMin);
    }
    if (sortBy === 'urgent') {
      return list.sort((a, b) => {
        const aExp = a.expiresAt || Infinity;
        const bExp = b.expiresAt || Infinity;
        return aExp - bExp;
      });
    }
    // Default newest
    return list.sort((a, b) => b.postedAt - a.postedAt);
  }, [filteredJobs, sortBy]);

  // ── PAGINATION LOGIC ──
  const totalPages = Math.ceil(sortedJobs.length / ITEMS_PER_PAGE) || 1;
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedJobs.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedJobs, currentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    jobListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isWorker = currentUser.role === 'worker';

  return (
    <div className="pb-24 overflow-x-hidden min-h-screen bg-slate-50/60">
      {/* ── HERO BANNER SLIDESHOW ── */}
      <HeroSlideshow />

      {/* ── DYNAMIC CATEGORY EXPLORER ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-12 pb-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-extrabold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Khám phá dịch vụ</span>
            </div>
            <h2 className="text-gray-950 font-black text-2xl md:text-3xl">Danh mục công việc</h2>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5">Chọn danh mục để tìm kiếm nhanh các nhiệm vụ phù hợp</p>
          </div>

          {selectedCategorySlug && (
            <button
              onClick={() => handleCategorySelect(null)}
              className="text-xs text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Bỏ chọn danh mục
            </button>
          )}
        </div>

        {/* Category Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {categories.map((cat, i) => {
            const isSelected = selectedCategorySlug === cat.slug;
            return (
              <motion.button
                key={cat.id || cat.slug}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.02 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleCategorySelect(isSelected ? null : cat.slug)}
                className={`flex flex-col items-center gap-2 p-4 rounded-3xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-500 shadow-lg shadow-orange-500/25 scale-[1.02]'
                    : 'bg-white border-gray-200/80 text-gray-800 hover:border-orange-300 hover:bg-orange-50/40 shadow-sm'
                }`}
              >
                <span className="text-3xl filter drop-shadow-sm">{cat.icon || '⚡'}</span>
                <span className={`text-xs font-bold text-center truncate w-full ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                  {cat.name}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Subcategories (Skills) Strip if primary category has subcategories */}
        {activeCategoryObj && activeCategoryObj.subcategories && activeCategoryObj.subcategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 rounded-2xl bg-white border border-orange-100 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar"
          >
            <span className="text-xs font-bold text-gray-500 whitespace-nowrap flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-orange-500" /> Kỹ năng:
            </span>
            <button
              onClick={() => { setSelectedSubcategoryId(null); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                !selectedSubcategoryId ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            {activeCategoryObj.subcategories.map(sub => (
              <button
                key={sub.id}
                onClick={() => { setSelectedSubcategoryId(selectedSubcategoryId === sub.id ? null : sub.id); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedSubcategoryId === sub.id ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </motion.div>
        )}
      </section>

      {/* ── ADVANCED FILTER & JOBS SECTION ── */}
      <section ref={jobListRef} className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-6 pb-16">
        {/* Section Heading with Pulse & Results count */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-gray-950 font-black text-2xl md:text-3xl flex items-center gap-2">
                {isWorker ? 'Tìm kiếm việc làm' : 'Bảng tin công việc'}
              </h2>
              <span className="text-xs font-extrabold px-3 py-1 bg-orange-100 text-orange-700 rounded-full border border-orange-200">
                {filteredJobs.length} việc
              </span>
            </div>
            <p className="text-gray-500 text-xs md:text-sm">
              Cập nhật liên tục các yêu cầu tuyển dụng và dịch vụ mới nhất
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, người đăng, hashtag..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-medium text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 shadow-sm transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── FILTER TOOLBAR (ALIGNED WITH MOBILE) ── */}
        <div className="bg-white rounded-3xl p-4 md:p-5 border border-gray-200/80 shadow-sm mb-6 space-y-4">
          {/* Row 1: Post Type Tabs + Sort dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            {/* Post Type (Role Tabs) */}
            <div className="flex items-center bg-gray-100 p-1 rounded-2xl self-start">
              {[
                { key: 'ALL', label: 'Tất cả bài đăng' },
                { key: 'RECRUITMENT', label: '💼 Cần thuê người' },
                { key: 'SERVICE_OFFER', label: '🛠️ Cung cấp DV' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setPostTypeFilter(key as any); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    postTypeFilter === key
                      ? 'bg-white text-gray-950 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" /> Sắp xếp:
              </span>
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white outline-none focus:border-orange-500"
              >
                <option value="newest">🕒 Mới nhất</option>
                <option value="hot">🔥 Nhiều ứng viên (Hot)</option>
                <option value="urgent">⚡ Sắp hết hạn</option>
                <option value="price_desc">💰 Thù lao cao nhất</option>
                <option value="price_asc">💰 Thù lao thấp nhất</option>
              </select>
            </div>
          </div>

          {/* Row 2: Secondary Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Work Mode filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-400 mr-1">Hình thức:</span>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'REMOTE', label: '🌐 Online' },
                { key: 'ONSITE', label: '📍 Tại chỗ' },
                { key: 'NEGOTIABLE', label: '🤝 Linh hoạt' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setWorkModeFilter(key as any); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                    workModeFilter === key
                      ? 'bg-orange-50 border-orange-500 text-orange-600 font-bold'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-gray-200 mx-2 hidden sm:block" />

            {/* Price Presets filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-400 mr-1">Thù lao:</span>
              {[
                { key: 'ALL', label: 'Mọi mức giá' },
                { key: 'UNDER_200', label: '< 200K' },
                { key: '200_500', label: '200K–500K' },
                { key: '500_1000', label: '500K–1M' },
                { key: 'ABOVE_1000', label: '> 1M' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setPriceRangeFilter(key as any); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                    priceRangeFilter === key
                      ? 'bg-amber-50 border-amber-500 text-amber-700 font-bold'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-gray-200 mx-2 hidden sm:block" />

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-400 mr-1">Trạng thái:</span>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'OPEN', label: '🟢 Đang tuyển' },
                { key: 'IN_PROGRESS', label: '🔵 Đang làm' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setStatusFilter(key as any); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                    statusFilter === key
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Active Filters Tag Strip */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-gray-400">Đang lọc:</span>

                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-orange-100 text-orange-800">
                    Từ khóa: "{debouncedSearch}"
                    <button onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></button>
                  </span>
                )}

                {postTypeFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800">
                    {postTypeFilter === 'RECRUITMENT' ? 'Cần thuê' : 'Cung cấp DV'}
                    <button onClick={() => setPostTypeFilter('ALL')}><X className="w-3 h-3" /></button>
                  </span>
                )}

                {selectedCategorySlug && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800">
                    Danh mục: {activeCategoryObj?.name || selectedCategorySlug}
                    <button onClick={() => handleCategorySelect(null)}><X className="w-3 h-3" /></button>
                  </span>
                )}

                {workModeFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-800">
                    {workModeFilter === 'REMOTE' ? 'Online' : workModeFilter === 'ONSITE' ? 'Tại chỗ' : 'Linh hoạt'}
                    <button onClick={() => setWorkModeFilter('ALL')}><X className="w-3 h-3" /></button>
                  </span>
                )}

                {priceRangeFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800">
                    Giá: {priceRangeFilter}
                    <button onClick={() => setPriceRangeFilter('ALL')}><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>

              <button
                onClick={handleResetAllFilters}
                className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline transition ml-auto"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* ── JOB CARDS GRID ── */}
        {paginatedJobs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {paginatedJobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <JobCard job={job} isWorker={isWorker} />
                </motion.div>
              ))}
            </div>

            {/* ── PAGINATION CONTROLS ── */}
            {totalPages > 1 && (
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
                <p className="text-xs font-semibold text-gray-500">
                  Hiển thị <span className="font-bold text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> –{' '}
                  <span className="font-bold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, sortedJobs.length)}</span> trên{' '}
                  <span className="font-bold text-orange-600">{sortedJobs.length}</span> công việc
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    <ChevronLeft className="w-4 h-4" /> Trước
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition ${
                        currentPage === page
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105'
                          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    Sau <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-sm max-w-md mx-auto my-8">
            <div className="w-20 h-20 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center text-4xl mx-auto mb-4 border border-orange-100 shadow-inner">
              🔍
            </div>
            <h3 className="text-gray-950 font-extrabold text-lg mb-1">Không tìm thấy công việc nào</h3>
            <p className="text-gray-500 text-xs mb-6 leading-relaxed">
              Không có bài đăng nào khớp với các tiêu chí tìm kiếm hiện tại. Hãy thử xóa bớt bộ lọc hoặc tìm với từ khóa khác.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={handleResetAllFilters}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition"
              >
                Xóa tất cả bộ lọc ↺
              </button>
              <Link
                to="/post"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-5 py-2.5 rounded-xl transition"
              >
                Đăng bài mới ngay +
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}