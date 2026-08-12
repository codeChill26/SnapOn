import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  PlusCircle, ChevronLeft, Clock, FileText, MapPin, CheckCircle,
  Sparkles, Phone, DollarSign, Image as ImageIcon, Briefcase,
  Upload, X, Hash, AlertCircle, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { taskService } from '../../services/taskService';
import { MapPicker } from '../components/MapPicker';

interface FormData {
  title: string;
  description: string;
  category: string;
  categoryIcon: string;
  duration: number;
  priceMin: number;
  priceMax: number;
  workMode: 'REMOTE' | 'ONSITE' | 'NEGOTIABLE';
  salaryUnit: 'PER_JOB' | 'PER_HOUR' | 'PER_DAY';
  employmentType: 'ONE_TIME' | 'PART_TIME' | 'FULL_TIME' | 'CONTRACT' | 'FREELANCE';
  peopleNeeded: number;
  contactPhone: string;
  location: { lat: number; lng: number; address: string } | null;
  images: string[]; // Base64 or uploaded URLs
  hashtags: string[];
}

const PRICE_PRESETS: Array<{ label: string; min: number; max: number }> = [
  { label: '50K–100K', min: 50000, max: 100000 },
  { label: '100K–200K', min: 100000, max: 200000 },
  { label: '200K–400K', min: 200000, max: 400000 },
  { label: '300K–600K', min: 300000, max: 600000 },
  { label: '500K–1tr', min: 500000, max: 1000000 },
  { label: '1tr–3tr', min: 1000000, max: 3000000 },
];

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}

export default function PostJob() {
  const navigate = useNavigate();
  const { addJob, currentUser, setUserRole, categories } = useApp();

  useEffect(() => {
    if (currentUser.role !== 'hirer') {
      setUserRole('hirer');
    }
  }, [currentUser.role, setUserRole]);

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [newJobId, setNewJobId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    category: categories[0]?.slug || 'errands',
    categoryIcon: categories[0]?.icon || '🏃',
    duration: 1,
    priceMin: 150000,
    priceMax: 300000,
    workMode: 'REMOTE',
    salaryUnit: 'PER_JOB',
    employmentType: 'ONE_TIME',
    peopleNeeded: 1,
    contactPhone: currentUser.phone || '',
    location: { lat: 10.7769, lng: 106.7009, address: 'Làm việc Online (Toàn quốc)' },
    images: [],
    hashtags: [],
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.category) {
      e.category = 'Vui lòng chọn danh mục';
    }

    if (!form.title.trim()) {
      e.title = 'Vui lòng nhập tiêu đề';
    } else if (form.title.trim().length < 5) {
      e.title = 'Tiêu đề phải từ 5 ký tự trở lên';
    }

    if (!form.description.trim()) {
      e.description = 'Vui lòng mô tả công việc';
    } else if (form.description.trim().length < 10) {
      e.description = 'Mô tả công việc phải từ 10 ký tự trở lên';
    }

    if (form.priceMin >= form.priceMax) {
      e.price = 'Giá tối thiểu phải nhỏ hơn giá tối đa';
    }

    if (form.workMode === 'ONSITE' && !form.location?.address) {
      e.location = 'Vui lòng chọn địa điểm làm việc';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - form.images.length;
    if (remainingSlots <= 0) {
      alert('Bạn chỉ có thể tải lên tối đa 5 hình ảnh.');
      return;
    }

    const filesToRead = Array.from(files).slice(0, remainingSlots);
    filesToRead.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`Ảnh ${file.name} vượt quá dung lượng cho phép (5MB).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setForm(f => ({ ...f, images: [...f.images, reader.result as string] }));
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setForm(f => ({
      ...f,
      images: f.images.filter((_, i) => i !== index),
    }));
  };

  const handleAddHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !form.hashtags.includes(tag) && form.hashtags.length < 5) {
      setForm(f => ({ ...f, hashtags: [...f.hashtags, tag] }));
      setHashtagInput('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setForm(f => ({ ...f, hashtags: f.hashtags.filter(t => t !== tag) }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      // 1. Upload base64 images to Cloudinary if needed
      let finalImageUrls: string[] = [];
      if (form.images.length > 0) {
        const base64List = form.images.filter(img => img.startsWith('data:image'));
        const existingUrls = form.images.filter(img => !img.startsWith('data:image'));

        if (base64List.length > 0) {
          try {
            const uploaded = await taskService.uploadTaskImages(base64List);
            finalImageUrls = [...existingUrls, ...uploaded];
          } catch (uploadErr) {
            console.warn('Image upload fallback to direct URLs:', uploadErr);
            finalImageUrls = existingUrls;
          }
        } else {
          finalImageUrls = existingUrls;
        }
      }

      const cat = categories.find(c => c.slug === form.category || c.id === form.category);
      const id = await addJob({
        title: form.title,
        description: form.description,
        category: form.category,
        categoryIcon: cat?.icon || '⚡',
        duration: form.duration,
        price: form.priceMin,
        priceMin: form.priceMin,
        priceMax: form.priceMax,
        postType: 'RECRUITMENT',
        workMode: form.workMode,
        salaryUnit: form.salaryUnit,
        employmentType: form.employmentType,
        peopleNeeded: form.peopleNeeded,
        contactPhone: form.contactPhone || currentUser.phone || '0900000000',
        location: form.location || { lat: 10.7769, lng: 106.7009, address: 'Làm việc Online (Toàn quốc)' },
        images: finalImageUrls,
        hashtags: form.hashtags,
      });

      setNewJobId(id);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting job:', err);
      const msg = err.response?.data?.message || 'Không thể đăng công việc. Vui lòng thử lại sau.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-green-500" />
          </motion.div>
          <h2 className="text-gray-900 font-extrabold text-2xl mb-2">Đăng công việc thành công! 🎉</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            Ngân sách <strong className="text-orange-500">{fmt(form.priceMin)} – {fmt(form.priceMax)}</strong> đã được công khai trên nền tảng SnapOn.
          </p>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-center gap-2 mb-2 font-bold text-orange-700 text-sm">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Matching thông minh:</span>
            </div>
            <p className="text-orange-600 text-xs leading-relaxed">
              Các thợ phù hợp kỹ năng và khoảng giá sẽ nhận được thông báo ngay lập tức và gửi hồ sơ ứng tuyển tới bạn.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/job/${newJobId}`)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-xl transition shadow"
            >
              Xem chi tiết & Ứng viên ⏱️
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-24 min-h-screen">
      <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)}
          className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition border border-gray-100 bg-white shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-gray-900 font-extrabold text-xl md:text-2xl">Đăng công việc mới</h1>
          <p className="text-gray-400 text-xs font-medium">Bước {step} / 2: {step === 1 ? 'Thông tin & Hình ảnh' : 'Ngân sách & Địa điểm'}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        {[1, 2].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? 'bg-orange-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      {submitError && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
          {submitError}
        </div>
      )}

      {/* ── STEP 1: Job Info & Images ── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Category */}
          <div>
            <label className="block text-gray-800 font-bold text-sm mb-3">Danh mục công việc *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
              {categories.map(cat => (
                <button
                  key={cat.slug || cat.id}
                  type="button"
                  onClick={() => {
                    setForm(f => ({ ...f, category: cat.slug, categoryIcon: cat.icon || '⚡' }));
                    setErrors(e => ({ ...e, category: undefined }));
                  }}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                    form.category === cat.slug
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                  }`}
                >
                  <span className="text-xl">{cat.icon || '⚡'}</span>
                  <span className="text-xs font-semibold truncate">{cat.name}</span>
                </button>
              ))}
            </div>
            {errors.category && <p className="text-red-500 text-xs mt-1.5">{errors.category}</p>}
          </div>

          {/* Work Mode */}
          <div>
            <label className="block text-gray-800 font-bold text-sm mb-2">Hình thức làm việc</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'REMOTE', label: '🌐 Online / Từ xa' },
                { key: 'ONSITE', label: '📍 Trực tiếp (Tại chỗ)' },
                { key: 'NEGOTIABLE', label: '🤝 Linh hoạt' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, workMode: key as any }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                    form.workMode === key
                      ? 'bg-orange-50 text-orange-600 border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-gray-800 font-bold text-sm mb-2">Tiêu đề công việc *</label>
            <input
              type="text"
              placeholder="VD: Cần thiết kế banner quảng cáo Facebook trong ngày"
              value={form.title}
              onChange={e => {
                setForm(f => ({ ...f, title: e.target.value }));
                setErrors(er => ({ ...er, title: undefined }));
              }}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1.5">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-800 font-bold text-sm mb-2">Mô tả chi tiết *</label>
            <textarea
              rows={4}
              placeholder="Mô tả cụ thể yêu cầu công việc, thời gian hoàn thành, kết quả mong đợi..."
              value={form.description}
              onChange={e => {
                setForm(f => ({ ...f, description: e.target.value }));
                setErrors(er => ({ ...er, description: undefined }));
              }}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1.5">{errors.description}</p>}
          </div>

          {/* ── Image Upload Section ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-gray-800 font-bold text-sm flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                <span>Hình ảnh công việc (Tối đa 5 ảnh)</span>
              </label>
              <span className="text-xs text-gray-400">{form.images.length}/5 ảnh</span>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              multiple
              accept="image/*"
              className="hidden"
            />

            {/* Images Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {form.images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group bg-gray-100">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white p-1 rounded-full transition shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {form.images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50/50 flex flex-col items-center justify-center text-gray-400 hover:text-orange-500 transition gap-1"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-[11px] font-semibold">Thêm ảnh</span>
                </button>
              )}
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-gray-800 font-bold text-sm mb-2">Hashtag / Từ khóa (Tối đa 5)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="VD: photoshop, urgent, online"
                value={hashtagInput}
                onChange={e => setHashtagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddHashtag(); } }}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={handleAddHashtag}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
              >
                + Thêm
              </button>
            </div>
            {form.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.hashtags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600 font-semibold px-2.5 py-1 rounded-lg">
                    #{tag}
                    <button type="button" onClick={() => handleRemoveHashtag(tag)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (validate()) setStep(2);
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition shadow"
          >
            Tiếp tục: Ngân sách & Địa điểm →
          </button>
        </div>
      )}

      {/* ── STEP 2: Budget & Location ── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Price presets */}
          <div>
            <label className="block text-gray-800 font-bold text-sm mb-2">Khoảng thù lao (VNĐ) *</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PRICE_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priceMin: p.min, priceMax: p.max }))}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    form.priceMin === p.min && form.priceMax === p.max
                      ? 'bg-orange-50 border-orange-500 text-orange-600'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Tối thiểu</label>
                <input
                  type="number"
                  step={10000}
                  value={form.priceMin}
                  onChange={e => setForm(f => ({ ...f, priceMin: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Tối đa</label>
                <input
                  type="number"
                  step={10000}
                  value={form.priceMax}
                  onChange={e => setForm(f => ({ ...f, priceMax: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 outline-none focus:border-orange-500"
                />
              </div>
            </div>
            {errors.price && <p className="text-red-500 text-xs mt-1.5">{errors.price}</p>}
          </div>

          {/* People Needed */}
          <div>
            <label className="block text-gray-800 font-bold text-sm mb-2">Số lượng người cần tuyển</label>
            <input
              type="number"
              min={1}
              max={50}
              value={form.peopleNeeded}
              onChange={e => setForm(f => ({ ...f, peopleNeeded: parseInt(e.target.value) || 1 }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-500"
            />
          </div>

          {/* Contact phone */}
          <div>
            <label className="block text-gray-800 font-bold text-sm mb-2">Số điện thoại liên hệ</label>
            <input
              type="tel"
              placeholder="0901234567"
              value={form.contactPhone}
              onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-500"
            />
          </div>

          {/* Location picker if onsite */}
          {form.workMode === 'ONSITE' && (
            <div>
              <label className="block text-gray-800 font-bold text-sm mb-2">Địa điểm làm việc trực tiếp *</label>
              <MapPicker
                location={form.location || { lat: 10.7769, lng: 106.7009, address: 'TP. Hồ Chí Minh' }}
                onChange={loc => setForm(f => ({ ...f, location: loc }))}
              />
              {errors.location && <p className="text-red-500 text-xs mt-1.5">{errors.location}</p>}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 rounded-xl border border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              ← Quay lại
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng việc...</span>
                </>
              ) : (
                <span>Hoàn tất & Đăng việc 🚀</span>
              )}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}