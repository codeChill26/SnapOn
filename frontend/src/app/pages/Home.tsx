import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { PlusCircle, TrendingUp, Shield, Zap, Star, ArrowRight, CheckCircle, MapPin } from 'lucide-react';
import { motion, useInView, animate } from 'motion/react';
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

const HERO_IMG = IMG_ERRANDS;

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

// ─── Hero Section ────────────────────────────────────────────
function HeroSection() {
  const { jobs, firebaseUser } = useApp();
  const navigate = useNavigate();
  const isLoggedIn = !!firebaseUser;
  const activeCount = jobs.filter(j => j.status === 'active').length;

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '580px' }}>
      <div className="absolute inset-0">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-orange-700/80 via-orange-600/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 flex flex-col justify-between" style={{ minHeight: '580px' }}>
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 text-white text-sm px-3 py-1.5 rounded-full mb-5 backdrop-blur-sm border border-white/20 bg-orange-500/30" style={{ fontWeight: 600 }}>
            <span>⚡</span> SnapOn - Việc gần, xong nhanh
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>

          <h1 className="text-white mb-4" style={{ fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.1 }}>
            Việc vặt xong ngay<br />trong tích tắc
          </h1>

          <p className="text-white/80 mb-7" style={{ fontSize: '1rem', lineHeight: 1.7 }}>
            Mua đồ, dọn nhà, sửa chữa, giao hàng — có người làm thay bạn trong bán kính 5km.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/post" className="flex items-center gap-2 bg-white text-gray-900 hover:bg-orange-50 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" style={{ fontWeight: 700 }}>
              <PlusCircle className="w-5 h-5 text-orange-500" />
              Đăng việc ngay
            </Link>
            <Link to="/worker" className="flex items-center gap-2 bg-white/15 text-white border border-white/25 hover:bg-white/25 px-6 py-3 rounded-xl backdrop-blur-sm hover:-translate-y-0.5 transition-all" style={{ fontWeight: 600 }}>
              Tìm việc <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {activeCount > 0 && (
            <div className="mt-5 flex items-center gap-2 text-white/70 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span><strong className="text-white">{activeCount} việc</strong> đang tuyển ngay lúc này</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative bg-black/30 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
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



  return (
    <div className="pb-20 md:pb-0 overflow-x-hidden">

      {/* ── HERO SECTION ── */}
      <HeroSection />

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