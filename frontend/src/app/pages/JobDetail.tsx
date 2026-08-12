import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ChevronLeft, MapPin, Clock, Users, Star, Sparkles, CheckCircle2,
  Bot, MessageCircle, Briefcase, Send, Lock, AlertCircle,
  ShieldCheck, ArrowRight, Zap, Target, Edit3, Trash2, Check,
  ChevronRight, X, Maximize2, Image as ImageIcon, Phone, Hash,
  Calendar, GraduationCap, Award, UserCheck, Layers, BadgeCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { taskService } from '../../services/taskService';
import { applicationService } from '../../services/applicationService';
import { profileService } from '../../services/profileService';
import { Task, TaskApplication, PublicProfile } from '../../types';
import { CountdownTimer } from '../components/CountdownTimer';
import { UserProfileModal } from '../components/UserProfileModal';

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; gradient: string; bannerBg: string; icon: string }> = {
  errands: { bg: 'bg-orange-50', text: 'text-orange-600', gradient: 'from-orange-500 to-amber-500', bannerBg: 'from-orange-500/20 via-amber-500/10 to-orange-500/5', icon: '🏃' },
  content: { bg: 'bg-pink-50', text: 'text-pink-600', gradient: 'from-pink-500 to-rose-500', bannerBg: 'from-pink-500/20 via-rose-500/10 to-pink-500/5', icon: '✍️' },
  design: { bg: 'bg-purple-50', text: 'text-purple-600', gradient: 'from-purple-500 to-indigo-500', bannerBg: 'from-purple-500/20 via-indigo-500/10 to-purple-500/5', icon: '🎨' },
  tech: { bg: 'bg-cyan-50', text: 'text-cyan-600', gradient: 'from-cyan-500 to-blue-500', bannerBg: 'from-cyan-500/20 via-blue-500/10 to-cyan-500/5', icon: '💻' },
  carrying: { bg: 'bg-indigo-50', text: 'text-indigo-600', gradient: 'from-indigo-500 to-purple-500', bannerBg: 'from-indigo-500/20 via-purple-500/10 to-indigo-500/5', icon: '📦' },
  photography: { bg: 'bg-rose-50', text: 'text-rose-600', gradient: 'from-rose-500 to-pink-500', bannerBg: 'from-rose-500/20 via-pink-500/10 to-rose-500/5', icon: '📸' },
  research: { bg: 'bg-teal-50', text: 'text-teal-600', gradient: 'from-teal-500 to-emerald-500', bannerBg: 'from-teal-500/20 via-emerald-500/10 to-teal-500/5', icon: '🔍' },
  manager: { bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-500 to-yellow-500', bannerBg: 'from-amber-500/20 via-yellow-500/10 to-amber-500/5', icon: '📋' },
  entertainment: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', gradient: 'from-fuchsia-500 to-pink-500', bannerBg: 'from-fuchsia-500/20 via-pink-500/10 to-fuchsia-500/5', icon: '🎭' },
  study: { bg: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-500 to-indigo-500', bannerBg: 'from-blue-500/20 via-indigo-500/10 to-blue-500/5', icon: '📚' },
  others: { bg: 'bg-slate-50', text: 'text-slate-600', gradient: 'from-slate-500 to-zinc-500', bannerBg: 'from-slate-500/20 via-zinc-500/10 to-slate-500/5', icon: '⚡' },
};

const EXPERIENCE_MAP: Record<string, string> = {
  NO_EXPERIENCE: 'Không yêu cầu',
  LESS_THAN_1_YEAR: 'Dưới 1 năm',
  FROM_1_TO_2_YEARS: '1 - 2 năm',
  FROM_2_TO_3_YEARS: '2 - 3 năm',
  MORE_THAN_3_YEARS: 'Trên 3 năm',
};

const EDUCATION_MAP: Record<string, string> = {
  NONE: 'Không yêu cầu',
  HIGH_SCHOOL: 'Tốt nghiệp THPT',
  VOCATIONAL: 'Trung cấp / Nghề',
  COLLEGE: 'Cao đẳng',
  UNIVERSITY: 'Đại học / Cao học',
};

const GENDER_MAP: Record<string, string> = {
  ANY: 'Không yêu cầu',
  MALE: 'Nam',
  FEMALE: 'Nữ',
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, firebaseUser } = useApp();

  const [task, setTask] = useState<Task | null>(null);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [myApplication, setMyApplication] = useState<TaskApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Image gallery & Lightbox state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Apply form state
  const [bidPrice, setBidPrice] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  // Profile modal
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const isPoster = Boolean(currentUser?.id && task?.posterId === currentUser.id);

  const loadTaskDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const taskData = await taskService.getTaskById(id);
      setTask(taskData);
      setActiveImageIndex(0);
      setBidPrice(Math.round((taskData.budgetMin + taskData.budgetMax) / 2 / 10000) * 10000);

      // 🔒 ONLY fetch application list if current user is the poster
      if (currentUser.id && taskData.posterId === currentUser.id) {
        try {
          const apps = await applicationService.getApplicationsByTask(id);
          setApplications(apps);
        } catch {}
      } else if (firebaseUser) {
        // If worker/visitor, only fetch their own application
        try {
          const myApp = await applicationService.getMyApplicationForTask(id);
          setMyApplication(myApp);
        } catch {}
      }
    } catch (err: any) {
      console.error('Error loading task detail:', err);
      setError(err.response?.data?.message || 'Không tìm thấy công việc.');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser.id, firebaseUser]);

  useEffect(() => {
    loadTaskDetails();
  }, [loadTaskDetails]);

  // Lightbox keyboard listener
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (!task?.images || task.images.length === 0) return;
      if (e.key === 'ArrowRight') {
        setActiveImageIndex(prev => (prev + 1) % task.images.length);
      }
      if (e.key === 'ArrowLeft') {
        setActiveImageIndex(prev => (prev - 1 + task.images.length) % task.images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, task?.images]);

  const handleApply = async () => {
    if (!id || !task) return;
    if (!firebaseUser) {
      navigate('/login');
      return;
    }

    setIsApplying(true);
    setApplyError('');
    try {
      const app = await applicationService.createApplication(id, {
        bid_price: bidPrice,
        estimated_time: '1-2 ngày',
        message: note,
      });
      setMyApplication(app);
      setApplySuccess(true);
      await loadTaskDetails();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể gửi đơn ứng tuyển. Vui lòng thử lại sau.';
      setApplyError(msg);
    } finally {
      setIsApplying(false);
    }
  };

  const handleWithdraw = async () => {
    if (!myApplication?.id) return;
    try {
      await applicationService.withdrawApplication(myApplication.id);
      setMyApplication(null);
      await loadTaskDetails();
    } catch (err) {
      console.error('Error withdrawing application:', err);
    }
  };

  const handleManualMatch = async (appId: string) => {
    if (!id) return;
    try {
      await applicationService.manualMatch(id, appId);
      await loadTaskDetails();
    } catch (err) {
      console.error('Error manual matching:', err);
    }
  };

  const handleAutoMatch = async () => {
    if (!id) return;
    try {
      await applicationService.autoMatch(id);
      await loadTaskDetails();
    } catch (err) {
      console.error('Error auto matching:', err);
    }
  };

  const handleCloseRecruitment = async () => {
    if (!id) return;
    try {
      await taskService.closeRecruitment(id);
      await loadTaskDetails();
    } catch (err) {
      console.error('Error closing recruitment:', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!id) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
      try {
        await taskService.deleteTask(id);
        navigate(-1);
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  const openUserProfile = async (userId: string, type: 'hirer' | 'worker') => {
    try {
      const pub = await profileService.getPublicProfile(userId);
      setSelectedProfile({
        type,
        id: pub.id,
        name: pub.fullName,
        avatar: pub.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + pub.id,
        rating: pub.ratingAverage,
        reviewCount: pub.reviewCount,
        memberSince: new Date(pub.joinedAt).toLocaleDateString('vi-VN'),
        jobsPosted: pub.postedJobsCount,
        jobsCompleted: pub.completedJobsCount,
        completedJobs: pub.completedJobsCount,
        skills: pub.skills,
        bio: pub.bio,
        area: 'TP. Hồ Chí Minh',
        verified: pub.isVerified,
      });
      setProfileModalOpen(true);
    } catch (err) {
      console.error('Error opening user profile:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm font-medium">Đang tải chi tiết công việc...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-gray-900 font-bold text-lg mb-2">Không tìm thấy công việc</h2>
        <p className="text-gray-500 text-sm mb-6">{error || 'Công việc này không tồn tại hoặc đã bị xóa.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-block bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-600 transition"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  const images = Array.isArray(task.images) ? task.images.filter(Boolean) : [];
  const hasImages = images.length > 0;
  const catSlug = task.field?.slug || task.categoryId || 'others';
  const catStyle = CATEGORY_STYLES[catSlug] || CATEGORY_STYLES.others;

  const unitLabel =
    task.salaryUnit === 'PER_HOUR' ? '/giờ' :
    task.salaryUnit === 'PER_DAY' ? '/ngày' :
    task.salaryUnit === 'PER_MONTH' ? '/tháng' : '/công việc';

  const workModeLabel =
    task.workMode === 'REMOTE' ? '🌐 Online / Từ xa' :
    task.workMode === 'ONSITE' ? '📍 Làm việc tại chỗ' : '🤝 Linh hoạt / Thỏa thuận';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 pb-24">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-orange-500 transition px-3.5 py-2 rounded-2xl bg-white border border-gray-200 shadow-sm cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>

        {isPoster && (
          <div className="flex items-center gap-2">
            {task.status === 'OPEN' && (
              <button
                onClick={handleCloseRecruitment}
                className="text-xs font-bold px-3.5 py-2 rounded-2xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm cursor-pointer"
              >
                Đóng nhận hồ sơ
              </button>
            )}
            <button
              onClick={handleDeleteTask}
              className="text-xs font-bold px-3.5 py-2 rounded-2xl border border-red-200 text-red-600 bg-white hover:bg-red-50 transition flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa bài đăng
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── MAIN COLUMN (8 cols) ── */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm overflow-hidden">
            {/* Visual Header: Photography Carousel OR Fallback Illustrated Banner */}
            {hasImages ? (
              <div className="mb-6">
                <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-gray-950 border border-gray-100 group">
                  <img
                    src={images[activeImageIndex]}
                    alt={`Ảnh công việc ${activeImageIndex + 1}`}
                    onClick={() => setLightboxOpen(true)}
                    className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full pointer-events-none">
                    {activeImageIndex + 1} / {images.length}
                  </div>
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-xl shadow-lg transition opacity-0 group-hover:opacity-100"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImageIndex(prev => (prev - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md transition"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setActiveImageIndex(prev => (prev + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition ${
                          activeImageIndex === idx ? 'border-orange-500 shadow-md scale-95' : 'border-gray-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Illustrated Category Motif Banner when no uploaded images */
              <div className={`mb-6 w-full h-44 rounded-2xl bg-gradient-to-br ${catStyle.bannerBg} flex flex-col items-center justify-center relative overflow-hidden border border-orange-100`}>
                <div className="w-20 h-20 rounded-3xl bg-white/90 backdrop-blur-md shadow-lg border border-white flex items-center justify-center text-4xl mb-2">
                  <span>{task.categoryIcon || catStyle.icon}</span>
                </div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-orange-600">
                  {task.categoryName || task.field?.name || 'SnapOn Task'}
                </span>
              </div>
            )}

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${catStyle.bg} ${catStyle.text}`}>
                {task.categoryName || task.field?.name || 'Việc vặt'}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                task.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                task.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                task.status === 'COMPLETED' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-500'
              }`}>
                {task.status === 'OPEN' ? '🟢 Đang mở tuyển' :
                 task.status === 'IN_PROGRESS' ? '🔵 Đang thực hiện' :
                 task.status === 'COMPLETED' ? '🟣 Đã hoàn thành' : 'Đã đóng'}
              </span>
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {workModeLabel}
              </span>
              {task.postType === 'SERVICE_OFFER' ? (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Thợ tự do
                </span>
              ) : (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Tuyển người làm
                </span>
              )}
            </div>

            <h1 className="text-gray-950 font-black text-2xl md:text-3xl leading-tight mb-4">
              {task.title}
            </h1>

            {/* Price Banner */}
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-2xl p-5 border border-orange-200/80 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mức thù lao {unitLabel}</p>
                <p className="text-orange-600 font-black text-2xl md:text-3xl">
                  {fmt(task.budgetMin)} – {fmt(task.budgetMax)}
                </p>
              </div>
              {task.applicationDeadline && task.status === 'OPEN' && (
                <div className="sm:text-right">
                  <p className="text-xs font-medium text-gray-500 mb-1">Thời hạn nhận đơn</p>
                  <CountdownTimer expiresAt={task.applicationDeadline} size="md" />
                </div>
              )}
            </div>

            {/* ── GRID SUMMARY (LIKE MOBILE APP) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-orange-500 text-xs font-bold mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Hạn nhận hồ sơ</span>
                </div>
                <p className="font-extrabold text-gray-900 text-xs truncate">
                  {task.applicationDeadline ? new Date(task.applicationDeadline).toLocaleDateString('vi-VN') : 'Không thời hạn'}
                </p>
              </div>

              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-blue-500 text-xs font-bold mb-1">
                  <MapPin className="w-4 h-4" />
                  <span>Hình thức</span>
                </div>
                <p className="font-extrabold text-gray-900 text-xs truncate">
                  {task.workMode === 'REMOTE' ? 'Online' : task.workMode === 'ONSITE' ? 'Tại chỗ' : 'Linh hoạt'}
                </p>
              </div>

              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-purple-500 text-xs font-bold mb-1">
                  <Users className="w-4 h-4" />
                  <span>Số lượng tuyển</span>
                </div>
                <p className="font-extrabold text-gray-900 text-xs truncate">
                  {task.peopleNeeded || 1} người
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-gray-900 font-extrabold text-base mb-2">Mô tả công việc chi tiết</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line bg-gray-50/60 p-4 rounded-2xl border border-gray-100">
                {task.description}
              </p>
            </div>

            {/* ── REQUIREMENTS SECTION (LIKE MOBILE APP) ── */}
            <div className="mb-6">
              <h3 className="text-gray-900 font-extrabold text-base mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-500" />
                <span>{task.postType === 'SERVICE_OFFER' ? 'Thông tin kỹ năng & kinh nghiệm' : 'Yêu cầu đối với ứng viên'}</span>
              </h3>

              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden bg-white text-xs">
                <div className="flex items-center justify-between p-3.5 bg-gray-50/40">
                  <span className="text-gray-500 font-medium">Kinh nghiệm yêu cầu</span>
                  <span className="font-bold text-gray-900">{EXPERIENCE_MAP[task.experienceLevel || ''] || 'Không yêu cầu'}</span>
                </div>
                <div className="flex items-center justify-between p-3.5">
                  <span className="text-gray-500 font-medium">Trình độ học vấn</span>
                  <span className="font-bold text-gray-900">{EDUCATION_MAP[task.educationLevel || ''] || 'Không yêu cầu'}</span>
                </div>
                {task.postType !== 'SERVICE_OFFER' && (
                  <>
                    <div className="flex items-center justify-between p-3.5 bg-gray-50/40">
                      <span className="text-gray-500 font-medium">Giới tính</span>
                      <span className="font-bold text-gray-900">{GENDER_MAP[task.genderRequirement || ''] || 'Không yêu cầu'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-gray-500 font-medium">Độ tuổi</span>
                      <span className="font-bold text-gray-900">
                        {task.minAge && task.maxAge ? `${task.minAge} – ${task.maxAge} tuổi` : 'Không yêu cầu'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Hashtags */}
            {task.hashtags && task.hashtags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2 items-center">
                <Hash className="w-4 h-4 text-gray-400" />
                {task.hashtags.map((tag, i) => (
                  <span key={i} className="text-xs bg-orange-50 text-orange-600 font-bold px-3 py-1 rounded-xl">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Location & Contact Meta */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
              {task.locations && task.locations[0] && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span>{task.locations[0].address}</span>
                </div>
              )}
              {task.contactPhone && (
                <div className="flex items-center gap-2 text-gray-700 font-bold">
                  <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Liên hệ: {task.contactPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* 🔒 STRICT PRIVACY: Only the HIRER / POSTER sees the full applicant list */}
          {isPoster && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 font-extrabold text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  <span>Danh sách ứng viên ({applications.length})</span>
                </h3>

                {task.status === 'OPEN' && applications.length > 0 && (
                  <button
                    onClick={handleAutoMatch}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> AI Auto-Match
                  </button>
                )}
              </div>

              {applications.length > 0 ? (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openUserProfile(app.taskerId, 'worker')}
                          className="hover:opacity-80 transition flex-shrink-0"
                        >
                          <img
                            src={app.taskerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.taskerId}`}
                            alt=""
                            className="w-12 h-12 rounded-xl bg-white border border-gray-200"
                          />
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{app.taskerName}</span>
                            <span className="text-xs font-bold text-yellow-500 flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-current" /> {app.taskerRating || 5.0}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 font-medium">{app.message || 'Sẵn sàng nhận việc!'}</p>
                          <p className="text-xs font-bold text-orange-600 mt-1">Đề xuất: {fmt(app.bidPrice)}</p>
                        </div>
                      </div>

                      {task.status === 'OPEN' && (
                        <button
                          onClick={() => handleManualMatch(app.id)}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow whitespace-nowrap self-end sm:self-center"
                        >
                          Chọn thợ này ✅
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs text-center py-6">Chưa có ai ứng tuyển. Hãy chờ một chút nhé!</p>
              )}
            </div>
          )}
        </div>

        {/* ── SIDEBAR COLUMN (4 cols) ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Hirer Profile Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm text-center">
            <button
              onClick={() => task.posterId && openUserProfile(task.posterId, 'hirer')}
              className="group w-full"
            >
              <div className="relative inline-block mx-auto mb-3">
                <img
                  src={task.poster?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.posterName || 'Hirer'}`}
                  alt=""
                  className="w-20 h-20 rounded-3xl mx-auto bg-orange-100 border-2 border-white shadow-md group-hover:scale-105 transition"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white text-white">
                  <BadgeCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <h4 className="font-extrabold text-gray-900 text-lg group-hover:text-orange-600 transition">
                {task.posterName || 'Người tuyển dụng'}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">Người đăng bài tuyển dụng</p>
            </button>
          </div>

          {/* Action Box for Non-Poster / Worker */}
          {!isPoster && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm">
              <h3 className="font-extrabold text-gray-900 text-base mb-4">Nộp hồ sơ ứng tuyển</h3>

              {myApplication ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-sm text-gray-900">Bạn đã gửi đơn ứng tuyển</p>
                  <p className="text-xs text-gray-500 font-medium">Giá đề xuất: <strong className="text-orange-600">{fmt(myApplication.bidPrice)}</strong></p>
                  <button
                    onClick={handleWithdraw}
                    className="text-xs text-red-500 font-bold hover:underline cursor-pointer"
                  >
                    Rút lại đơn ứng tuyển
                  </button>
                </div>
              ) : task.status === 'OPEN' ? (
                <div className="space-y-4">
                  {applyError && <p className="text-xs text-red-500 font-medium">{applyError}</p>}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mức thù lao mong muốn (VNĐ)</label>
                    <input
                      type="number"
                      step={10000}
                      value={bidPrice}
                      onChange={e => setBidPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tin nhắn giới thiệu</label>
                    <textarea
                      rows={3}
                      placeholder="Nêu ngắn gọn kinh nghiệm và thời gian bạn có thể hoàn thành..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-500 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition shadow text-sm cursor-pointer"
                  >
                    {isApplying ? 'Đang gửi...' : 'Gửi đơn ứng tuyển ngay 🚀'}
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 text-xs text-center py-4">Công việc này đã đóng nhận hồ sơ.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── LIGHTBOX MODAL ── */}
      <AnimatePresence>
        {lightboxOpen && hasImages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <div className="flex items-center justify-between text-white p-2" onClick={e => e.stopPropagation()}>
              <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                Ảnh {activeImageIndex + 1} / {images.length}
              </span>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center relative p-2" onClick={e => e.stopPropagation()}>
              <img
                src={images[activeImageIndex]}
                alt=""
                className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(prev => (prev - 1 + images.length) % images.length);
                    }}
                    className="absolute left-4 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition"
                  >
                    <ChevronLeft className="w-7 h-7" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(prev => (prev + 1) % images.length);
                    }}
                    className="absolute right-4 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition"
                  >
                    <ChevronRight className="w-7 h-7" />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex items-center justify-center gap-2 p-2 overflow-x-auto" onClick={e => e.stopPropagation()}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                      activeImageIndex === idx ? 'border-orange-500 scale-105' : 'border-white/30 opacity-60'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      {selectedProfile && (
        <UserProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          profile={selectedProfile}
        />
      )}
    </div>
  );
}