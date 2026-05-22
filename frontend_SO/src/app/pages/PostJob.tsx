import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PlusCircle, ChevronLeft, Clock, FileText, MapPin, CheckCircle, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp, CATEGORIES } from '../context/AppContext';
import { MapPicker } from '../components/MapPicker';

interface FormData {
  title: string;
  description: string;
  category: string;
  categoryIcon: string;
  duration: number;
  priceMin: number;
  priceMax: number;
  location: { lat: number; lng: number; address: string } | null;
}

// Preset price range pairs [min, max]
const PRICE_PRESETS: Array<{ label: string; min: number; max: number }> = [
  { label: '50K–100K', min: 50000,  max: 100000 },
  { label: '100K–200K', min: 100000, max: 200000 },
  { label: '150K–300K', min: 150000, max: 300000 },
  { label: '200K–400K', min: 200000, max: 400000 },
  { label: '300K–600K', min: 300000, max: 600000 },
  { label: '500K–1tr',  min: 500000, max: 1000000 },
];

const DURATION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];

const TITLE_SUGGESTIONS: Record<string, string[]> = {
  errands: ['Đi chợ hộ', 'Xếp hàng hộ mua đồ', 'Đi in tài liệu hộ', 'Mua thuốc hộ'],
  content: ['Viết bài Facebook quảng cáo', 'Dịch tài liệu Anh-Việt', 'Viết content marketing', 'Đăng bài lên các nền tảng'],
  design: ['Thiết kế UI app mobile', 'Design banner quảng cáo', 'Làm logo thương hiệu', 'Chỉnh sửa ảnh sản phẩm'],
  tech: ['Sửa lỗi website', 'Cài đặt phần mềm', 'Setup mạng wifi', 'Hỗ trợ IT từ xa'],
  carrying: ['Chuyển đồ nội thành', 'Chuyển phòng trọ', 'Bốc vác đồ nặng', 'Vận chuyển bàn ghế'],
  photography: ['Chụp ảnh sản phẩm', 'Quay video ngắn TikTok', 'Edit video sự kiện', 'Chụp ảnh chân dung'],
  research: ['Thu thập dữ liệu khảo sát', 'Khảo sát thị trường', 'Nhập liệu Excel', 'Tổng hợp thông tin'],
  manager: ['Quản lý sự kiện nhỏ', 'Điều phối nhân sự', 'Giám sát công việc', 'Hỗ trợ quản lý kho'],
  entertainment: ['MC sự kiện nhỏ', 'Biểu diễn âm nhạc', 'Tổ chức trò chơi', 'Hỗ trợ sự kiện'],
  study: ['Gia sư toán cấp 2', 'Hỗ trợ làm bài tập', 'Dạy kèm tiếng Anh', 'Hướng dẫn sử dụng phần mềm'],
  others: ['Việc khác cần hỗ trợ', 'Công việc đặc biệt', 'Hỗ trợ cá nhân', 'Việc vặt tổng hợp'],
};

function fmt(n: number) { return n.toLocaleString('vi-VN') + '₫'; }

export default function PostJob() {
  const navigate = useNavigate();
  const { addJob } = useApp();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [newJobId, setNewJobId] = useState('');
  const [form, setForm] = useState<FormData>({
    title: '', description: '', category: '', categoryIcon: '',
    duration: 1, priceMin: 150000, priceMax: 300000, location: null,
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (step === 1) {
      if (!form.category)          e.category    = 'Vui lòng chọn danh mục';
      if (!form.title.trim())      e.title       = 'Vui lòng nhập tiêu đề';
      if (!form.description.trim())e.description = 'Vui lòng mô tả công việc';
      if (form.priceMin >= form.priceMax) e.price = 'Giá tối thiểu phải nhỏ hơn tối đa';
    }
    if (step === 2) {
      if (!form.location) e.location = 'Vui lòng chọn địa điểm';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!form.location) return;
    const cat = CATEGORIES.find(c => c.id === form.category)!;
    const id = addJob({
      title: form.title,
      description: form.description,
      category: form.category,
      categoryIcon: cat.icon,
      duration: form.duration,
      price: form.priceMin,
      priceMin: form.priceMin,
      priceMax: form.priceMax,
      location: form.location,
    });
    setNewJobId(id);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </motion.div>
          <h2 className="text-gray-900 mb-2" style={{ fontWeight: 800, fontSize: '1.5rem' }}>Đăng việc thành công! 🎉</h2>
          <p className="text-gray-500 mb-6 leading-relaxed text-sm">
            Khoảng giá <strong className="text-orange-500">{fmt(form.priceMin)} – {fmt(form.priceMax)}</strong> đã được công khai.
            Người lao động sẽ đặt giá trong khoảng này. Khi bạn sẵn sàng, nhấn <strong>"Chốt phiên"</strong> để AI chọn người tốt nhất.
          </p>
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span className="text-orange-600 text-sm" style={{ fontWeight: 600 }}>Thuật toán AI sẽ ưu tiên:</span>
            </div>
            <div className="text-orange-500 text-xs space-y-1 ml-7">
              <div>📍 45% — Khoảng cách (người gần nhất)</div>
              <div>💰 35% — Giá thầu (thấp hơn = điểm cao hơn)</div>
              <div>⭐ 20% — Đánh giá chất lượng</div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate(`/job/${newJobId}`)}
              className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-xl transition" style={{ fontWeight: 600 }}>
              Xem danh sách ứng viên ⏱️
            </button>
            <button onClick={() => navigate('/')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-xl transition" style={{ fontWeight: 500 }}>
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.25rem' }}>Đăng việc làm</h1>
          <p className="text-gray-400 text-sm">Bước {step} / 3</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1,2,3].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? 'bg-orange-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* ── STEP 1: Job details ── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Category */}
          <div>
            <label className="block text-gray-700 mb-3" style={{ fontWeight: 600 }}>Danh mục công việc *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map(cat => (
                <button key={cat.id} type="button"
                  onClick={() => { setForm(f => ({ ...f, category: cat.id, categoryIcon: cat.icon })); setErrors(e => ({ ...e, category: undefined })); }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    form.category === cat.id ? 'bg-orange-500 border-orange-500 shadow-md' : 'bg-white border-gray-200 hover:border-orange-300'
                  }`}>
                  <span className="text-2xl">{cat.icon}</span>
                  <span className={`text-xs text-center leading-tight ${form.category === cat.id ? 'text-white' : 'text-gray-600'}`}
                    style={{ fontWeight: form.category === cat.id ? 600 : 400 }}>
                    {cat.label.split('/')[0].trim()}
                  </span>
                </button>
              ))}
            </div>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-gray-700 mb-2" style={{ fontWeight: 600 }}>
              <FileText className="w-4 h-4 inline mr-1" />Tiêu đề *
            </label>
            <input value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(er => ({ ...er, title: undefined })); }}
              placeholder="VD: Lau dọn căn hộ 2 phòng ngủ"
              className={`w-full border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 transition ${errors.title ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            {form.category && TITLE_SUGGESTIONS[form.category] && (
              <div className="flex flex-wrap gap-2 mt-2">
                {TITLE_SUGGESTIONS[form.category].map(s => (
                  <button key={s} type="button" onClick={() => setForm(f => ({ ...f, title: s }))}
                    className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full border border-orange-200 hover:bg-orange-100 transition">{s}</button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 mb-2" style={{ fontWeight: 600 }}>Mô tả công việc *</label>
            <textarea value={form.description}
              onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setErrors(er => ({ ...er, description: undefined })); }}
              placeholder="Mô tả chi tiết: số phòng, diện tích, yêu cầu đặc biệt..." rows={4}
              className={`w-full border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 transition resize-none ${errors.description ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-gray-700 mb-3" style={{ fontWeight: 600 }}>
              <Clock className="w-4 h-4 inline mr-1" />Thời gian dự kiến (tối đa 3 giờ)
            </label>
            <div className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.map(d => (
                <button key={d} type="button" onClick={() => setForm(f => ({ ...f, duration: d }))}
                  className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                    form.duration === d ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                  }`} style={{ fontWeight: form.duration === d ? 600 : 400 }}>
                  {d}h
                </button>
              ))}
            </div>
          </div>

          {/* ── PRICE RANGE ── */}
          <div>
            <label className="block text-gray-700 mb-1" style={{ fontWeight: 600 }}>
              💰 Khoảng giá thầu (VNĐ) *
            </label>
            <p className="text-gray-400 text-xs mb-3">
              Người lao động sẽ đặt giá trong khoảng này. AI ưu tiên giá thấp hơn khi các yếu tố khác tương đương.
            </p>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PRICE_PRESETS.map(p => {
                const active = form.priceMin === p.min && form.priceMax === p.max;
                return (
                  <button key={p.label} type="button"
                    onClick={() => setForm(f => ({ ...f, priceMin: p.min, priceMax: p.max }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      active ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }`} style={{ fontWeight: active ? 600 : 400 }}>
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Min/Max inputs */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1" style={{ fontWeight: 500 }}>
                    <TrendingDown className="w-3.5 h-3.5 text-green-500" /> Giá tối thiểu
                  </label>
                  <div className="relative">
                    <input type="number" value={form.priceMin}
                      onChange={e => setForm(f => ({ ...f, priceMin: Number(e.target.value) }))}
                      className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 pr-6"
                      min={20000} step={10000} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₫</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1" style={{ fontWeight: 500 }}>
                    <TrendingUp className="w-3.5 h-3.5 text-orange-500" /> Giá tối đa
                  </label>
                  <div className="relative">
                    <input type="number" value={form.priceMax}
                      onChange={e => setForm(f => ({ ...f, priceMax: Number(e.target.value) }))}
                      className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 pr-6"
                      min={form.priceMin + 10000} step={10000} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₫</span>
                  </div>
                </div>
              </div>

              {/* Visual range bar */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-green-600" style={{ fontWeight: 600 }}>{fmt(form.priceMin)}</span>
                <div className="flex-1 h-2 bg-white rounded-full overflow-hidden border border-orange-200">
                  <div className="h-full bg-gradient-to-r from-green-400 to-orange-500 rounded-full" style={{ width: '100%' }} />
                </div>
                <span className="text-xs text-orange-600" style={{ fontWeight: 600 }}>{fmt(form.priceMax)}</span>
              </div>
              <p className="text-center text-xs text-gray-500 mt-2">
                Chênh lệch: <strong className="text-orange-500">{fmt(form.priceMax - form.priceMin)}</strong> — khoảng đặt giá cho người lao động
              </p>
            </div>
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>
        </div>
      )}

      {/* ── STEP 2: Location ── */}
      {step === 2 && (
        <div>
          <div className="mb-4">
            <h2 className="text-gray-900 mb-1" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              <MapPin className="w-5 h-5 inline mr-1 text-orange-500" />Địa điểm làm việc
            </h2>
            <p className="text-gray-500 text-sm">Tìm địa chỉ hoặc nhấn thẳng vào bản đồ để chọn vị trí.</p>
          </div>
          <MapPicker
            value={form.location || undefined}
            onChange={loc => { setForm(f => ({ ...f, location: loc })); setErrors(e => ({ ...e, location: undefined })); }}
            height="350px"
          />
          {errors.location && <p className="text-red-500 text-sm mt-2">{errors.location}</p>}
        </div>
      )}

      {/* ── STEP 3: Preview ── */}
      {step === 3 && (
        <div>
          <h2 className="text-gray-900 mb-4" style={{ fontWeight: 700, fontSize: '1.1rem' }}>Xem trước bài đăng</h2>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl">
                  {CATEGORIES.find(c => c.id === form.category)?.icon}
                </div>
                <div>
                  <h3 className="text-gray-900" style={{ fontWeight: 700 }}>{form.title}</h3>
                  <p className="text-gray-400 text-sm">{CATEGORIES.find(c => c.id === form.category)?.label}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">{form.description}</p>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-gray-700" style={{ fontWeight: 700 }}>{form.duration}h</div>
                  <div className="text-xs text-gray-400">Thời gian</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-green-600 text-xs" style={{ fontWeight: 700 }}>{fmt(form.priceMin)}</div>
                  <div className="text-xs text-gray-400">Giá tối thiểu</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-orange-600 text-xs" style={{ fontWeight: 700 }}>{fmt(form.priceMax)}</div>
                  <div className="text-xs text-gray-400">Giá tối đa</div>
                </div>
              </div>

              {/* Price range visual */}
              <div className="bg-orange-50 rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Khoảng giá thầu</span>
                  <span className="text-xs text-orange-600" style={{ fontWeight: 600 }}>{fmt(form.priceMin)} – {fmt(form.priceMax)}</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-orange-500 rounded-full w-full" />
                </div>
              </div>

              {form.location && (
                <div className="flex items-start gap-2 bg-orange-50 rounded-xl p-3">
                  <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">{form.location.address}</span>
                </div>
              )}
            </div>
            <div className="bg-orange-50 border-t border-orange-100 px-5 py-3">
              <div className="flex items-center gap-2 text-orange-600 text-sm">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs">AI chấm điểm: <strong>45% khoảng cách + 35% giá thầu + 20% đánh giá</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto p-4 bg-white md:bg-transparent border-t border-gray-100 md:border-0 md:mt-6">
        {step < 3 ? (
          <button onClick={() => { if (validate()) setStep(s => s + 1); }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl transition"
            style={{ fontWeight: 700, fontSize: '1rem' }}>
            Tiếp theo →
          </button>
        ) : (
          <button onClick={handleSubmit}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl transition flex items-center justify-center gap-2"
            style={{ fontWeight: 700, fontSize: '1rem' }}>
            <PlusCircle className="w-5 h-5" /> Đăng việc ngay!
          </button>
        )}
      </div>
    </div>
  );
}