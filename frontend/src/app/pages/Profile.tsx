import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router';
import {
  UserCircle, Mail, Phone, MapPin, Camera, Star, Briefcase,
  ChevronRight, Edit3, LogOut, Sparkles, Plus, X,
  BadgeCheck, Landmark, RefreshCw, Wallet, Check,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp, Job } from '../context/AppContext';
import { authService } from '../../services/authService';
import { profileService } from '../../services/profileService';
import { applicationService } from '../../services/applicationService';
import { PublicProfile, Task, ProfileReview, TaskApplication } from '../../types';
import { JobCard } from '../components/JobCard';
import { WalletModal } from '../components/WalletModal';
import { BankSelectModal } from '../components/BankSelectModal';

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920';

function mapTaskToJob(task: Task): Job {
  const isExpired = task.applicationDeadline ? new Date(task.applicationDeadline).getTime() < Date.now() : false;
  const status: Job['status'] =
    task.status === 'COMPLETED' ? 'completed' :
    task.status === 'IN_PROGRESS' || task.status === 'ACCEPTED' ? 'matched' :
    task.status === 'CANCELLED' || isExpired ? 'expired' : 'active';

  const loc = task.locations && task.locations.length > 0 ? task.locations[0] : null;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.field?.slug || task.categoryId || 'others',
    categoryIcon: task.categoryIcon || '⚡',
    duration: 60,
    price: task.budgetMin,
    priceMin: task.budgetMin,
    priceMax: task.budgetMax,
    location: {
      lat: loc?.lat ?? 10.7769,
      lng: loc?.lng ?? 106.7009,
      address: loc?.address ?? 'TP. Hồ Chí Minh',
    },
    postedAt: task.createdAt ? new Date(task.createdAt).getTime() : Date.now(),
    expiresAt: task.applicationDeadline ? new Date(task.applicationDeadline).getTime() : Date.now() + 86400000,
    status,
    hirerName: task.posterName || task.poster?.fullName || 'Người dùng',
    hirerAvatar: task.poster?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.posterId || 'Hirer'}`,
    hirerId: task.posterId,
    applicants: [],
    rawTask: task,
  };
}

export default function Profile() {
  const {
    currentUser,
    firebaseUser,
    updateProfile,
    setUserRole,
    logout,
    fetchProfile,
    hirerWallet,
    workerWallet,
  } = useApp();

  // Tab: 0 = Overview, 1 = Recruitment Posts, 2 = Service Offers, 3 = Reviews, 4 = Settings
  const [activeTab, setActiveTab] = useState<0 | 1 | 2 | 3 | 4>(0);

  // Profile data from backend
  const [publicData, setPublicData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [recruitmentJobs, setRecruitmentJobs] = useState<Job[]>([]);
  const [serviceOfferJobs, setServiceOfferJobs] = useState<Job[]>([]);
  const [myApplications, setMyApplications] = useState<TaskApplication[]>([]);

  // Modals
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  // Form states for profile editing
  const [fullName, setFullName] = useState(currentUser.name || '');
  const [headline, setHeadline] = useState(currentUser.headline || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [skills, setSkills] = useState<string[]>(currentUser.skills || []);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [bankName, setBankName] = useState(currentUser.bankName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(currentUser.bankAccountNumber || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // File upload refs
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Sync state when currentUser updates
  useEffect(() => {
    setFullName(currentUser.name || '');
    setHeadline(currentUser.headline || '');
    setBio(currentUser.bio || '');
    setPhone(currentUser.phone || '');
    setSkills(currentUser.skills || []);
    setBankName(currentUser.bankName || '');
    setBankAccountNumber(currentUser.bankAccountNumber || '');
  }, [currentUser]);

  // Load public profile, reviews, applications, and posts directly from API
  const loadProfileData = async () => {
    if (!currentUser.id) return;
    setLoading(true);
    try {
      const [pubRes, revRes, recruitRes, serviceRes, appRes] = await Promise.all([
        profileService.getPublicProfile(currentUser.id).catch(() => null),
        profileService.getPublicReviews(currentUser.id, 1, 20).catch(() => ({ data: [] })),
        profileService.getPublicPosts(currentUser.id, 'RECRUITMENT', 1, 20).catch(() => ({ data: [] })),
        profileService.getPublicPosts(currentUser.id, 'SERVICE_OFFER', 1, 20).catch(() => ({ data: [] })),
        applicationService.getMyApplications().catch(() => []),
      ]);

      if (pubRes) setPublicData(pubRes);
      if (revRes && revRes.data) setReviews(revRes.data);
      if (Array.isArray(revRes)) setReviews(revRes);
      if (Array.isArray(appRes)) setMyApplications(appRes);

      if (recruitRes && recruitRes.data) {
        setRecruitmentJobs(recruitRes.data.map((t: Task) => mapTaskToJob(t)));
      }
      if (serviceRes && serviceRes.data) {
        setServiceOfferJobs(serviceRes.data.map((t: Task) => mapTaskToJob(t)));
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [currentUser.id]);

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const updated = await authService.uploadAvatar(reader.result);
          if (updated) {
            await fetchProfile();
            await loadProfileData();
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading avatar:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  };

  // Handle cover upload
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const updated = await authService.uploadCover(reader.result);
          if (updated) {
            await fetchProfile();
            await loadProfileData();
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading cover:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (coverFileRef.current) coverFileRef.current.value = '';
    }
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const ok = await updateProfile({
        fullName,
        headline,
        bio,
        phone,
        skills,
        bankName,
        bankAccountNumber,
      });
      if (ok) {
        setSaveSuccess(true);
        setEditingProfile(false);
        setTimeout(() => setSaveSuccess(false), 3000);
        await fetchProfile();
        await loadProfileData();
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = () => {
    const s = newSkillInput.trim();
    if (s && !skills.includes(s) && skills.length < 15) {
      setSkills([...skills, s]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const allMyJobs = useMemo(() => {
    return [...recruitmentJobs, ...serviceOfferJobs];
  }, [recruitmentJobs, serviceOfferJobs]);

  const isWorker = currentUser.role === 'worker';

  // Computed stats
  const postedCount = publicData?.postedJobsCount || allMyJobs.length;
  const completedCount = publicData?.completedJobsCount || allMyJobs.filter(j => j.status === 'completed').length;
  const ratingAvg = publicData?.ratingAverage || (reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 5.0);

  return (
    <div className="min-h-screen pb-28 bg-slate-100/70 font-sans">
      {/* ── HERO COVER & IDENTITY SECTION (FACEBOOK / LINKEDIN STYLE) ── */}
      <div className="bg-white border-b border-gray-200/80 shadow-sm w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-4">
          {/* Cover Photo Container */}
          <div className="relative w-full h-56 sm:h-72 md:h-88 rounded-3xl overflow-hidden bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 shadow-inner group">
            <img
              src={currentUser.coverUrl || publicData?.coverUrl || DEFAULT_COVER}
              alt="Cover"
              className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

            {/* Change Cover Button */}
            <input
              type="file"
              ref={coverFileRef}
              onChange={handleCoverChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => coverFileRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-white/20 transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Chỉnh sửa ảnh bìa</span>
            </button>
          </div>

          {/* Profile Identity & Action Bar */}
          <div className="relative px-2 sm:px-6 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left: Overlapping Avatar + Names */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
                {/* Avatar with Camera Button (Only avatar overlaps the cover) */}
                <div className="relative group -mt-16 sm:-mt-20 flex-shrink-0">
                  <img
                    src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name || 'SnapOn'}`}
                    alt={currentUser.name}
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl border-4 border-white shadow-xl bg-orange-100 object-cover"
                  />
                  <input
                    type="file"
                    ref={avatarFileRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute bottom-1 right-1 bg-orange-500 hover:bg-orange-600 text-white p-2.5 rounded-2xl border-2 border-white shadow-lg transition cursor-pointer"
                    title="Đổi ảnh đại diện"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Identity Name & Badges (Positioned cleanly below cover on white background) */}
                <div className="pt-2 sm:pt-3.5">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h1 className="text-gray-950 font-black text-2xl sm:text-3xl leading-tight">
                      {currentUser.name || 'Người dùng SnapOn'}
                    </h1>
                    <div className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-xs font-bold border border-blue-200" title="Tài khoản đã xác minh">
                      <BadgeCheck className="w-4 h-4 text-blue-600" />
                      <span>Xác minh</span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm font-semibold mt-1">
                    {currentUser.headline || (isWorker ? '🛠️ Người làm việc tự do' : '💼 Nhà tuyển dụng & Đối tác')}
                  </p>

                  <div className="flex items-center justify-center sm:justify-start gap-3.5 mt-2 text-xs text-gray-500 font-medium flex-wrap">
                    <span className="flex items-center gap-1 text-yellow-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" /> {ratingAvg.toFixed(1)}
                      <span className="text-gray-400 font-normal">({reviews.length} đánh giá)</span>
                    </span>
                    <span>•</span>
                    <span className="text-gray-500">
                      Tham gia {publicData?.joinedAt ? new Date(publicData.joinedAt).toLocaleDateString('vi-VN') : '2026'}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {completedCount} việc hoàn tất
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Action Buttons Toolbar */}
              <div className="flex items-center justify-center sm:justify-end gap-2.5 flex-wrap pt-2 md:pt-0">
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:-translate-y-0.5 transition cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Ví: {fmt(currentUser.role === 'worker' ? workerWallet : hirerWallet)}</span>
                </button>

                <button
                  onClick={() => {
                    const next = currentUser.role === 'worker' ? 'hirer' : 'worker';
                    setUserRole(next);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-orange-500" />
                  <span>Chuyển sang: {currentUser.role === 'worker' ? 'Người thuê' : 'Người làm'}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab(4);
                    setEditingProfile(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar (Facebook / LinkedIn Style) */}
            <div className="flex items-center gap-1 mt-6 border-t border-gray-100 pt-1 overflow-x-auto no-scrollbar">
              {[
                { id: 0, label: '📊 Tổng quan', badge: null },
                { id: 1, label: `💼 Bài tuyển dụng`, badge: recruitmentJobs.length },
                { id: 2, label: `🛠️ Dịch vụ thợ`, badge: serviceOfferJobs.length },
                { id: 3, label: `⭐ Đánh giá & Phản hồi`, badge: reviews.length },
                { id: 4, label: '⚙️ Cài đặt tài khoản', badge: null },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-4 py-3 text-xs md:text-sm font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'text-orange-600'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== null && tab.badge > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="profileTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN MODERN SOCIAL PROFILE LAYOUT ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── LEFT COLUMN (3-4 COLS - STICKY SIDEBAR) ── */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            {/* Card 1: Giới thiệu & Bio */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-950 font-black text-base flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-orange-500" />
                  <span>Giới thiệu</span>
                </h3>
                <button
                  onClick={() => { setActiveTab(4); setEditingProfile(true); }}
                  className="text-xs text-orange-600 font-bold hover:underline cursor-pointer"
                >
                  Sửa
                </button>
              </div>

              {currentUser.bio ? (
                <p className="text-gray-700 text-xs leading-relaxed italic bg-orange-50/40 p-3.5 rounded-2xl border border-orange-100 mb-4">
                  "{currentUser.bio}"
                </p>
              ) : (
                <p className="text-gray-400 text-xs italic mb-4">Chưa có lời giới thiệu bản thân.</p>
              )}

              {/* Skills tags */}
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Kỹ năng & Chuyên môn</p>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => (
                      <span key={s} className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-800 text-xs font-semibold">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs">Chưa thêm kỹ năng nào.</p>
                )}
              </div>
            </div>

            {/* Card 2: Thông tin chi tiết */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm space-y-3.5 text-xs text-gray-600">
              <h3 className="text-gray-950 font-black text-base mb-2">Thông tin tài khoản</h3>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Số điện thoại</p>
                  <p className="font-bold text-gray-900">{currentUser.phone || 'Chưa cập nhật'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Địa chỉ Email</p>
                  <p className="font-bold text-gray-900 truncate max-w-[200px]">{currentUser.email || 'Chưa cập nhật'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Khu vực hoạt động</p>
                  <p className="font-bold text-gray-900">TP. Hồ Chí Minh (Toàn quốc)</p>
                </div>
              </div>
            </div>

            {/* Card 3: Tài khoản Ngân hàng & Rút tiền */}
            <div className="bg-gradient-to-br from-slate-900 to-gray-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" /> Liên kết ngân hàng
                </span>
                <button
                  onClick={() => setBankModalOpen(true)}
                  className="text-xs text-orange-300 hover:text-white font-bold underline cursor-pointer"
                >
                  Đổi
                </button>
              </div>

              {currentUser.bankName && currentUser.bankAccountNumber ? (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-4">
                  <p className="text-xs text-gray-300 font-medium">{currentUser.bankName}</p>
                  <p className="font-mono font-black text-lg tracking-wider text-white mt-0.5">
                    {currentUser.bankAccountNumber}
                  </p>
                  <p className="text-[11px] text-orange-200 mt-1 uppercase">{currentUser.name}</p>
                </div>
              ) : (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4 text-center">
                  <p className="text-xs text-gray-400 mb-2">Chưa liên kết tài khoản ngân hàng nhận tiền</p>
                  <button
                    onClick={() => setBankModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    + Liên kết ngay
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition text-center shadow cursor-pointer"
                >
                  Rút / Nạp tiền
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (8-9 COLS - MAIN CONTENT) ── */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {/* ── TAB 0: TỔNG QUAN / OVERVIEW ── */}
            {activeTab === 0 && (
              <div className="space-y-6">
                {/* 4 KPI Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">ĐÃ ĐĂNG</p>
                    <p className="text-2xl font-black text-gray-900">{postedCount}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Tổng bài đăng</p>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">HOÀN TẤT</p>
                    <p className="text-2xl font-black text-emerald-600">{completedCount}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Đã hoàn thành</p>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">ĐÁNH GIÁ</p>
                    <p className="text-2xl font-black text-yellow-500 flex items-center gap-1">
                      <Star className="w-5 h-5 fill-current" /> {ratingAvg.toFixed(1)}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{reviews.length} lượt đánh giá</p>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">THÀNH CÔNG</p>
                    <p className="text-2xl font-black text-blue-600">100%</p>
                    <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Tỷ lệ tin cậy</p>
                  </div>
                </div>

                {/* Recent Tasks Showcase */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-950 font-extrabold text-base flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-orange-500" />
                      <span>Bài đăng công việc gần đây ({allMyJobs.length})</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab(1)}
                      className="text-xs text-orange-600 font-bold hover:underline cursor-pointer"
                    >
                      Xem tất cả →
                    </button>
                  </div>

                  {allMyJobs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                      {allMyJobs.slice(0, 6).map(job => (
                        <JobCard key={job.id} job={job} isWorker={isWorker} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      <p>Bạn chưa đăng công việc nào.</p>
                      <Link to="/post" className="text-orange-500 font-bold hover:underline mt-1 inline-block">
                        + Đăng việc đầu tiên ngay
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 1: BÀI ĐĂNG TUYỂN DỤNG ── */}
            {activeTab === 1 && (
              <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h3 className="text-gray-950 font-black text-lg">
                    Bài đăng tuyển dụng ({recruitmentJobs.length})
                  </h3>
                  <Link
                    to="/post"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow"
                  >
                    <Plus className="w-4 h-4" /> Đăng việc mới
                  </Link>
                </div>

                {recruitmentJobs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                    {recruitmentJobs.map(job => (
                      <JobCard key={job.id} job={job} isWorker={isWorker} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    Chưa có bài đăng tuyển dụng nào.
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: DỊCH VỤ CUNG CẤP ── */}
            {activeTab === 2 && (
              <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h3 className="text-gray-950 font-black text-lg">
                    Dịch vụ thợ cung cấp ({serviceOfferJobs.length})
                  </h3>
                  <Link
                    to="/post"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow"
                  >
                    <Plus className="w-4 h-4" /> Đăng dịch vụ mới
                  </Link>
                </div>

                {serviceOfferJobs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                    {serviceOfferJobs.map(job => (
                      <JobCard key={job.id} job={job} isWorker={isWorker} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    Chưa có dịch vụ nào được đăng.
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: ĐÁNH GIÁ & PHẢN HỒI ── */}
            {activeTab === 3 && (
              <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm space-y-6">
                <h3 className="text-gray-950 font-black text-lg">
                  Đánh giá từ đối tác ({reviews.length})
                </h3>

                {/* Big Score Summary */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-orange-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Điểm đánh giá trung bình</p>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl md:text-5xl font-black text-gray-900">{ratingAvg.toFixed(1)}</span>
                      <div>
                        <div className="flex items-center text-yellow-400">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-medium">{reviews.length} đánh giá được xác thực</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map(rev => (
                      <div key={rev.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={rev.reviewerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rev.reviewerName}`}
                              alt=""
                              className="w-9 h-9 rounded-full bg-white border border-gray-200"
                            />
                            <div>
                              <p className="font-bold text-gray-900 text-xs">{rev.reviewerName}</p>
                              <p className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-yellow-400 text-xs font-bold">
                            <Star className="w-3.5 h-3.5 fill-current mr-1" /> {rev.rating}
                          </div>
                        </div>
                        <p className="text-gray-700 text-xs leading-relaxed">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    Chưa có đánh giá nào được gửi tới bạn.
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: CÀI ĐẶT TÀI KHOẢN ── */}
            {activeTab === 4 && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-gray-950 font-black text-xl">Chỉnh sửa hồ sơ cá nhân</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Thông tin của bạn sẽ hiển thị công khai trên SnapOn</p>
                  </div>
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Đã lưu thành công!
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Họ và tên *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-bold text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Tiêu đề nghề nghiệp / Chức danh</label>
                    <input
                      type="text"
                      placeholder="VD: Chuyên gia thiết kế đồ họa & Video Editor"
                      value={headline}
                      onChange={e => setHeadline(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-medium text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Số điện thoại liên hệ</label>
                    <input
                      type="tel"
                      placeholder="0901234567"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-bold text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Giới thiệu bản thân (Bio)</label>
                    <textarea
                      rows={3}
                      placeholder="Chia sẻ kinh nghiệm làm việc, phong cách làm việc và dịch vụ bạn cung cấp..."
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
                    />
                  </div>

                  {/* Skills Tag Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Kỹ năng chuyên môn</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="VD: Photoshop, Illustrator, Dịch tiếng Anh"
                        value={newSkillInput}
                        onChange={e => setNewSkillInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                        className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-xs outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition"
                      >
                        + Thêm
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => (
                        <span key={s} className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 font-bold px-3 py-1 rounded-xl">
                          {s}
                          <button type="button" onClick={() => handleRemoveSkill(s)} className="hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bank Account */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-700">Tài khoản ngân hàng nhận tiền</label>
                      <button
                        type="button"
                        onClick={() => setBankModalOpen(true)}
                        className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                      >
                        {bankName ? 'Đổi ngân hàng' : '+ Chọn ngân hàng'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          readOnly
                          placeholder="Tên ngân hàng"
                          value={bankName}
                          onClick={() => setBankModalOpen(true)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold cursor-pointer"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Số tài khoản ngân hàng"
                          value={bankAccountNumber}
                          onChange={e => setBankAccountNumber(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                    <button
                      onClick={logout}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>

                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold px-6 py-3 rounded-2xl shadow-md transition cursor-pointer"
                    >
                      {isSaving ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Modal */}
      <WalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        mode={currentUser.role === 'worker' ? 'worker' : 'hirer'}
      />

      {/* Bank Select Modal */}
      <BankSelectModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        selectedBank={bankName}
        onSelect={(bank) => {
          setBankName(bank.name);
          setBankModalOpen(false);
        }}
      />
    </div>
  );
}
