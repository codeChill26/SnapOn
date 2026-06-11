import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../../services/api';

export interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryIcon: string;
  duration: number;
  price: number;         // Final/accepted price (updated when matched)
  priceMin: number;      // Minimum budget set by hirer
  priceMax: number;      // Maximum budget set by hirer
  location: { lat: number; lng: number; address: string };
  postedAt: number;
  expiresAt: number;
  status: 'active' | 'matched' | 'completed' | 'expired';
  hirerName: string;
  hirerAvatar: string;
  hirerId?: string;
  applicants: Applicant[];
  aiMatchId?: string;
}

export interface Applicant {
  id?: string;           // Database application ID
  workerId: string;
  name: string;
  avatar: string;
  lat: number;
  lng: number;
  distance: number;
  rating: number;
  completedJobs: number;
  skills: string[];
  appliedAt: number;
  note: string;
  bidPrice: number;      // Worker's proposed price (within priceMin..priceMax)
  aiScore?: number;      // Computed by closeBidding (0–1)
  aiBreakdown?: {        // Score components for transparency
    distScore: number;
    priceScore: number;
    ratingScore: number;
  };
}

export interface Worker {
  id: string;
  name: string;
  avatar: string;
  lat: number;
  lng: number;
  skills: string[];
  rating: number;
  completedJobs: number;
  bio: string;
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const CATEGORIES = [
  { id: 'errands', label: 'Errands', icon: '🏃' },
  { id: 'content', label: 'Content / Translate', icon: '✍️' },
  { id: 'design', label: 'Design', icon: '🎨' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'carrying', label: 'Carrying', icon: '📦' },
  { id: 'photography', label: 'Photography / Media', icon: '📸' },
  { id: 'research', label: 'Research', icon: '🔍' },
  { id: 'manager', label: 'Manager', icon: '📋' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎭' },
  { id: 'study', label: 'Study Help', icon: '📚' },
  { id: 'others', label: 'Others', icon: '⚡' },
];

export const MOCK_WORKERS: Worker[] = [
  { id: 'w1', name: 'Nguyễn Văn An', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenVanAn', lat: 10.7769, lng: 106.7009, skills: ['Dọn dẹp', 'Làm vườn'], rating: 4.9, completedJobs: 87, bio: 'Chuyên dọn dẹp, làm vườn. Có kinh nghiệm 3 năm.' },
  { id: 'w2', name: 'Trần Thị Bình', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TranThiBinh', lat: 10.7890, lng: 106.7120, skills: ['Giao hàng', 'Mua sắm'], rating: 4.7, completedJobs: 54, bio: 'Chạy xe máy quen thuộc mọi tuyến đường TP.HCM.' },
  { id: 'w3', name: 'Lê Hoàng Cường', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LeHoangCuong', lat: 10.7552, lng: 106.6634, skills: ['Sửa chữa', 'Kỹ thuật'], rating: 4.8, completedJobs: 112, bio: 'Thợ sửa chữa điện, nước, đồ gia dụng.' },
  { id: 'w4', name: 'Phạm Minh Đức', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PhamMinhDuc', lat: 10.8028, lng: 106.7121, skills: ['Chuyển đồ', 'Bốc vác'], rating: 4.6, completedJobs: 63, bio: 'Có xe tải nhỏ, chuyển đồ nhanh chóng.' },
  { id: 'w5', name: 'Hoàng Thị Em', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HoangThiEm', lat: 10.7998, lng: 106.6785, skills: ['Dọn dẹp', 'Trông thú cưng'], rating: 4.9, completedJobs: 145, bio: 'Yêu thú cưng, có kinh nghiệm chăm sóc chó mèo.' },
  { id: 'w6', name: 'Võ Thành Phong', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VoThanhPhong', lat: 10.8390, lng: 106.6655, skills: ['Làm vườn', 'Tỉa cây'], rating: 4.5, completedJobs: 38, bio: 'Có kinh nghiệm làm vườn, cắt tỉa cây cảnh.' },
  { id: 'w7', name: 'Đặng Văn Giang', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DangVanGiang', lat: 10.8010, lng: 106.6520, skills: ['Mua sắm', 'Giao hàng'], rating: 4.7, completedJobs: 79, bio: 'Mua hộ đồ, giao hàng nhanh trong ngày.' },
  { id: 'w8', name: 'Bùi Thị Hương', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BuiThiHuong', lat: 10.7323, lng: 106.7220, skills: ['Dọn dẹp', 'Mua sắm'], rating: 4.8, completedJobs: 93, bio: 'Tận tâm, cẩn thận, làm việc đúng giờ.' },
  { id: 'w9', name: 'Ngô Quốc Hùng', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NgoQuocHung', lat: 10.8464, lng: 106.7741, skills: ['Kỹ thuật', 'Sửa chữa'], rating: 4.6, completedJobs: 41, bio: 'Kỹ thuật viên máy tính, setup mạng LAN.' },
  { id: 'w10', name: 'Phan Thị Lan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PhanThiLan', lat: 10.7680, lng: 106.6890, skills: ['Dọn dẹp', 'Nấu ăn'], rating: 4.9, completedJobs: 201, bio: 'Chuyên dọn nhà, giặt ủi, nấu ăn theo yêu cầu.' },
];

export const DEMO_WORKER: Worker = {
  id: 'demo',
  name: 'Minh (Demo Tìm Việc)',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoWorker2024',
  lat: 10.7769,
  lng: 106.7009,
  skills: ['Dọn dẹp', 'Giao hàng'],
  rating: 4.5,
  completedJobs: 12,
  bio: 'Năng động, chăm chỉ, làm việc đúng giờ.',
};

// ─── AI Matching Algorithm ────────────────────────────────────
// Weights: Distance 45% (SnapOn = quick & nearby), Price 35% (lower bid = better for hirer), Rating 20%
const W_DIST   = 0.45;
const W_PRICE  = 0.35;
const W_RATING = 0.20;

export function scoreApplicants(job: Job): Applicant[] {
  if (job.applicants.length === 0) return [];
  if (job.applicants.length === 1) {
    return [{
      ...job.applicants[0],
      aiScore: 1,
      aiBreakdown: { distScore: 1, priceScore: 1, ratingScore: 1 },
    }];
  }

  const bids    = job.applicants.map(a => a.bidPrice);
  const dists   = job.applicants.map(a => a.distance);
  const ratings = job.applicants.map(a => a.rating);

  const minBid    = Math.min(...bids),    maxBid    = Math.max(...bids);
  const minDist   = Math.min(...dists),   maxDist   = Math.max(...dists);
  const minRating = Math.min(...ratings), maxRating = Math.max(...ratings);

  const bidRange    = maxBid    - minBid    || 1;
  const distRange   = maxDist   - minDist   || 1;
  const ratingRange = maxRating - minRating || 1;

  const scored = job.applicants.map(a => {
    // Lower bid → higher priceScore (hirer pays less = better)
    const priceScore  = 1 - (a.bidPrice - minBid)    / bidRange;
    // Closer distance → higher distScore
    const distScore   = 1 - (a.distance - minDist)   / distRange;
    // Higher rating → higher ratingScore
    const ratingScore = (a.rating - minRating) / ratingRange;

    const aiScore = W_DIST * distScore + W_PRICE * priceScore + W_RATING * ratingScore;

    return {
      ...a,
      aiScore: Math.round(aiScore * 1000) / 1000,
      aiBreakdown: {
        distScore:   Math.round(distScore   * 100) / 100,
        priceScore:  Math.round(priceScore  * 100) / 100,
        ratingScore: Math.round(ratingScore * 100) / 100,
      },
    };
  });

  // Sort by score desc (winner first)
  return scored.sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));
}

// ─── Initial mock data ─────────────────────────────────────────
const now = Date.now();

const INITIAL_JOBS: Job[] = [
  {
    id: 'j1', title: 'Lau dọn căn hộ 60m²',
    description: 'Cần người dọn dẹp nhà sau khi thuê. Bao gồm lau sàn, lau bàn ghế, dọn nhà vệ sinh. Nhà 2 phòng ngủ tại quận 1.',
    category: 'errands', categoryIcon: '🏃',
    duration: 2, price: 200000, priceMin: 150000, priceMax: 300000,
    location: { lat: 10.7769, lng: 106.7009, address: '15 Nguyễn Huệ, Quận 1, TP.HCM' },
    postedAt: now - 120000, expiresAt: now + 480000, status: 'active',
    hirerName: 'Nguyễn Thanh Tâm', hirerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NTT',
    applicants: [
      { workerId: 'w1', name: 'Nguyễn Văn An', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenVanAn', lat: 10.7769, lng: 106.7009, distance: 0.5, rating: 4.9, completedJobs: 87, skills: ['Dọn dẹp'], appliedAt: now - 60000, note: 'Tôi sẵn sàng làm ngay, có đầy đủ dụng cụ.', bidPrice: 200000 },
      { workerId: 'w10', name: 'Phan Thị Lan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PhanThiLan', lat: 10.7680, lng: 106.6890, distance: 1.2, rating: 4.9, completedJobs: 201, skills: ['Dọn dẹp'], appliedAt: now - 30000, note: 'Chuyên dọn nhà 5 năm kinh nghiệm.', bidPrice: 180000 },
    ],
    aiMatchId: 'w1',
  },
  {
    id: 'j2', title: 'Tỉa cây sân vườn và dọn lá',
    description: 'Cần người tỉa cây cảnh, cắt cỏ và dọn sạch sân vườn nhà phố. Diện tích khoảng 30m². Bình Thạnh.',
    category: 'errands', categoryIcon: '🏃',
    duration: 3, price: 250000, priceMin: 200000, priceMax: 400000,
    location: { lat: 10.8028, lng: 106.7121, address: '45 Đinh Bộ Lĩnh, Bình Thạnh, TP.HCM' },
    postedAt: now - 60000, expiresAt: now + 540000, status: 'active',
    hirerName: 'Trần Văn Khoa', hirerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TVK',
    applicants: [
      { workerId: 'w6', name: 'Võ Thành Phong', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VoThanhPhong', lat: 10.8390, lng: 106.6655, distance: 3.8, rating: 4.5, completedJobs: 38, skills: ['Làm vườn'], appliedAt: now - 20000, note: 'Tôi có đầy đủ dụng cụ cắt tỉa.', bidPrice: 250000 },
    ],
    aiMatchId: 'w6',
  },
  {
    id: 'j3', title: 'Chuyển đồ từ quận 3 → quận 7',
    description: 'Cần vận chuyển 5-6 thùng đồ + 1 tủ nhỏ từ Quận 3 sang Quận 7. Ưu tiên có xe tải nhỏ.',
    category: 'carrying', categoryIcon: '📦',
    duration: 2, price: 450000, priceMin: 350000, priceMax: 600000,
    location: { lat: 10.7845, lng: 106.6810, address: '123 Võ Văn Tần, Quận 3, TP.HCM' },
    postedAt: now - 300000, expiresAt: now - 60000, status: 'matched',
    hirerName: 'Lê Thị Mai', hirerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LTM',
    applicants: [
      { workerId: 'w4', name: 'Phạm Minh Đức', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PhamMinhDuc', lat: 10.8028, lng: 106.7121, distance: 2.1, rating: 4.6, completedJobs: 63, skills: ['Chuyển đồ'], appliedAt: now - 250000, note: 'Tôi có xe tải 500kg.', bidPrice: 450000 },
    ],
    aiMatchId: 'w4',
  },
  {
    id: 'j4', title: 'Mua sắm siêu thị hộ',
    description: 'Cần mua khoảng 15 món đồ tại Vinmart (danh sách sẽ gửi sau khi nhận). Giao về nhà tại quận Gò Vấp.',
    category: 'errands', categoryIcon: '🏃',
    duration: 1.5, price: 130000, priceMin: 100000, priceMax: 200000,
    location: { lat: 10.8390, lng: 106.6655, address: '78 Lê Đức Thọ, Gò Vấp, TP.HCM' },
    postedAt: now - 30000, expiresAt: now + 570000, status: 'active',
    hirerName: 'Phạm Hồng Nhung', hirerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PHN',
    applicants: [],
  },
  {
    id: 'j5', title: 'Sửa vòi nước bị rò rỉ',
    description: 'Vòi nước nhà bếp bị rò, cần thợ sửa ngay hôm nay. Chung cư Quận 7, tầng 8.',
    category: 'tech', categoryIcon: '💻',
    duration: 1, price: 180000, priceMin: 150000, priceMax: 300000,
    location: { lat: 10.7323, lng: 106.7220, address: '201 Nguyễn Thị Thập, Quận 7, TP.HCM' },
    postedAt: now - 90000, expiresAt: now + 510000, status: 'active',
    hirerName: 'Hoàng Văn Tuấn', hirerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HVT',
    applicants: [
      { workerId: 'w3', name: 'Lê Hoàng Cường', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LeHoangCuong', lat: 10.7552, lng: 106.6634, distance: 4.2, rating: 4.8, completedJobs: 112, skills: ['Sửa chữa'], appliedAt: now - 40000, note: 'Thợ sửa nước chuyên nghiệp.', bidPrice: 180000 },
    ],
    aiMatchId: 'w3',
  },
];

// ─── Context types ─────────────────────────────────────────────
interface AppContextType {
  jobs: Job[];
  workers: Worker[];
  currentUser: { id: string; name: string; avatar: string; email?: string; phone?: string; role: 'hirer' | 'worker' | 'admin' };
  workerStatus: 'available' | 'on_job';
  workerCurrentJobId: string | null;
  hirerWallet: number;
  workerWallet: number;
  addJob: (job: Omit<Job, 'id' | 'postedAt' | 'expiresAt' | 'status' | 'applicants' | 'hirerName' | 'hirerAvatar'>) => string;
  applyToJob: (jobId: string, worker: Worker, note: string, bidPrice: number) => void;
  matchJob: (jobId: string, workerId: string) => void;
  closeBidding: (jobId: string) => void;
  completeJob: (jobId: string) => void;
  setUserRole: (role: 'hirer' | 'worker' | 'admin') => void;
  topUpWallet: (role: 'hirer' | 'worker', amount: number) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (fields: { fullName?: string; phone?: string; avatarUrl?: string }) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);

  // Load tasks on mount
  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      const data = res.data;
      if (data.success && Array.isArray(data.data)) {
        // Map tasks to frontend format
        const mappedJobs = data.data.map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          category: task.category_slug || 'others',
          categoryIcon: CATEGORIES.find(c => c.id === task.category_slug)?.icon || '⚡',
          duration: task.duration || 2,
          price: parseFloat(task.final_price || task.budget_min || 0),
          priceMin: parseFloat(task.budget_min || 0),
          priceMax: parseFloat(task.budget_max || 0),
          location: task.locations && task.locations[0] ? {
            lat: parseFloat(task.locations[0].latitude || 10.7769),
            lng: parseFloat(task.locations[0].longitude || 106.7009),
            address: task.locations[0].address || 'Hồ Chí Minh'
          } : { lat: 10.7769, lng: 106.7009, address: 'Hồ Chí Minh' },
          postedAt: new Date(task.created_at || Date.now()).getTime(),
          expiresAt: new Date(task.deadline_end || (Date.now() + 2 * 3600 * 1000)).getTime(),
          status: task.status === 'OPEN' ? 'active' : task.status === 'IN_PROGRESS' ? 'matched' : task.status === 'COMPLETED' ? 'completed' : 'expired',
          hirerName: task.poster_name || 'Người dùng',
          hirerAvatar: task.poster_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=HirerUser',
          hirerId: task.poster_id,
          applicants: []
        }));
        
        const jobsWithApps = await Promise.all(mappedJobs.map(async (job: any) => {
          try {
            const appRes = await api.get(`/tasks/${job.id}/applications`);
            const appData = appRes.data;
            if (appData.success && Array.isArray(appData.data)) {
              job.applicants = appData.data.map((app: any) => ({
                  id: app.id,
                  workerId: app.tasker_id,
                  name: app.tasker_name || 'Tasker',
                  avatar: app.tasker_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=TaskerUser',
                  lat: parseFloat(app.latitude || 10.7769),
                  lng: parseFloat(app.longitude || 106.7009),
                  distance: parseFloat(app.distance || 0),
                  rating: parseFloat(app.average_rating || 5.0),
                  completedJobs: parseInt(app.completed_jobs || 0),
                  skills: app.skills || [],
                  appliedAt: new Date(app.created_at).getTime(),
                  note: app.message || '',
                  bidPrice: parseFloat(app.bid_price || 0)
                }));
                if (job.status === 'matched') {
                  job.aiMatchId = job.applicants[0]?.workerId;
                }
              }
          } catch (e) {
            console.error('Error fetching applications for task:', job.id, e);
          }
          return job;
        }));

        setJobs(jobsWithApps);
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  const [hirerUser] = useState({ name: 'Nguyễn Thị Hoa', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NguoiDung1' });
  const [adminUser] = useState({ name: 'Admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminUser2024' });
  
  const [dbUser, setDbUser] = useState<any>(() => {
    const saved = localStorage.getItem('appUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [userRole, _setUserRole] = useState<'hirer' | 'worker' | 'admin'>(() => {
    const saved = localStorage.getItem('appUser');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.role) {
        return parsed.role === 'tasker' ? 'worker' : parsed.role === 'admin' ? 'admin' : 'hirer';
      }
    }
    return 'hirer';
  });

  const [workerStatus, setWorkerStatus] = useState<'available' | 'on_job'>('available');
  const [workerCurrentJobId, setWorkerCurrentJobId] = useState<string | null>(null);
  const [hirerWallet, setHirerWallet] = useState(500000);
  const [workerWallet, setWorkerWallet] = useState(500000);

  const currentUser = userRole === 'hirer'
    ? {
        id: dbUser?.id || 'demo-hirer-id',
        name: dbUser?.full_name || dbUser?.fullName || hirerUser.name,
        avatar: dbUser?.avatar_url || dbUser?.avatarUrl || hirerUser.avatar,
        email: dbUser?.email || 'hoa.nguyen@gmail.com',
        phone: dbUser?.phone || '0912 345 678',
        role: 'hirer' as const
      }
    : userRole === 'admin'
    ? {
        id: 'admin-id',
        name: adminUser.name,
        avatar: adminUser.avatar,
        email: 'admin@snapon.vn',
        role: 'admin' as const
      }
    : {
        id: dbUser?.id || DEMO_WORKER.id,
        name: dbUser?.full_name || dbUser?.fullName || DEMO_WORKER.name,
        avatar: dbUser?.avatar_url || dbUser?.avatarUrl || DEMO_WORKER.avatar,
        email: dbUser?.email || 'minh.demo@snapon.vn',
        phone: dbUser?.phone || '0901 234 567',
        role: 'worker' as const
      };

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) {
        setDbUser(null);
        _setUserRole('hirer');
        setHirerWallet(500000);
        setWorkerWallet(500000);
        return;
      }

      const res = await api.get('/users/profile');
      const data = res.data;
      if (data.success && data.user) {
        setDbUser(data.user);
        localStorage.setItem('appUser', JSON.stringify(data.user));
        const dbRole = data.user.role;
        const mappedRole = dbRole === 'tasker' ? 'worker' : dbRole === 'admin' ? 'admin' : 'hirer';
        _setUserRole(mappedRole);

        // Fetch wallet balance from database
        try {
          const walletRes = await api.get('/wallet/me');
          const walletData = walletRes.data;
          if (walletData.success && walletData.data) {
            const balance = parseFloat(walletData.data.available_balance || walletData.data.balance || 0);
            setHirerWallet(balance);
            setWorkerWallet(balance);
          }
        } catch (walletErr) {
          console.error('Error fetching wallet balance:', walletErr);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  }, []);

  // Sync profile and wallet balance from database on mount (e.g., after page refresh)
  useEffect(() => {
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      fetchProfile();
    }
  }, [fetchProfile]);

  const updateProfile = useCallback(async (fields: { fullName?: string; phone?: string; avatarUrl?: string }) => {
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) return false;

      const res = await api.put('/users/profile', fields);
      const data = res.data;
      if (data.success && data.user) {
        setDbUser(data.user);
        localStorage.setItem('appUser', JSON.stringify(data.user));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating user profile:', err);
      return false;
    }
  }, []);

  const setUserRole = useCallback(async (role: 'hirer' | 'worker' | 'admin') => {
    _setUserRole(role);
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      try {
        const dbRole = role === 'worker' ? 'tasker' : role;
        const res = await api.put('/users/role', { role: dbRole });
        const data = res.data;
        if (data.success && data.user) {
          setDbUser(data.user);
          localStorage.setItem('appUser', JSON.stringify(data.user));
        }
        // Refresh wallet balance when switching roles to ensure consistency
        await fetchProfile();
      } catch (err) {
        console.error('Error updating database role:', err);
      }
    }
  }, [fetchProfile]);

  const addJob = useCallback((jobData: Omit<Job, 'id' | 'postedAt' | 'expiresAt' | 'status' | 'applicants' | 'hirerName' | 'hirerAvatar'>) => {
    const id = 'j' + Date.now();

    // Call backend API in background to save
    api.post('/tasks', {
      title: jobData.title,
      description: jobData.description,
      category_id: jobData.category,
      task_type: 'OFFLINE',
      budget_min: jobData.priceMin,
      budget_max: jobData.priceMax,
      location: {
        location_type: 'TASK_LOCATION',
        address: jobData.location.address,
        latitude: jobData.location.lat,
        longitude: jobData.location.lng,
      }
    })
    .then(res => {
      if (res.data.success) {
        console.log('Task saved to backend database:', res.data.data);
        fetchJobs();
      }
    })
    .catch(err => console.error('Error saving task to backend:', err));

    const postedAt = Date.now();
    const countdownMins = Math.floor(Math.random() * 6) + 5;
    const newJob: Job = {
      ...jobData,
      id,
      postedAt,
      expiresAt: postedAt + countdownMins * 60 * 1000,
      status: 'active',
      hirerName: currentUser.name || hirerUser.name,
      hirerAvatar: currentUser.avatar || hirerUser.avatar,
      hirerId: currentUser.id,
      applicants: [],
    };
    setJobs(prev => [newJob, ...prev]);
    simulateApplicants(id, jobData.location.lat, jobData.location.lng, jobData.priceMin, jobData.priceMax);
    return id;
  }, [currentUser, hirerUser, fetchJobs]);

  const simulateApplicants = (jobId: string, jobLat: number, jobLng: number, priceMin: number, priceMax: number) => {
    const delays = [8000, 15000, 25000, 40000];
    const shuffled = [...MOCK_WORKERS]
      .map(w => ({ w, d: haversineDistance(jobLat, jobLng, w.lat, w.lng) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 4);

    const notes = ['Tôi sẵn sàng làm ngay!', 'Có kinh nghiệm, làm nhanh gọn.', 'Đang rảnh, có thể đến ngay.', 'Giá tốt, làm chất lượng!'];

    delays.forEach((delay, i) => {
      if (i >= shuffled.length) return;
      setTimeout(() => {
        const { w, d } = shuffled[i];
        // Simulate workers bidding at different price levels
        const bidRatio = 0.7 + Math.random() * 0.25; // 70%-95% of max price
        const bidPrice = Math.round((priceMin + (priceMax - priceMin) * bidRatio) / 10000) * 10000;

        const applicant: Applicant = {
          workerId: w.id,
          name: w.name,
          avatar: w.avatar,
          lat: w.lat,
          lng: w.lng,
          distance: Math.round(d * 10) / 10,
          rating: w.rating,
          completedJobs: w.completedJobs,
          skills: w.skills,
          appliedAt: Date.now(),
          note: notes[i],
          bidPrice,
        };
        setJobs(prev => prev.map(j => {
          if (j.id !== jobId) return j;
          const newApplicants = [...j.applicants, applicant].sort((a, b) => a.distance - b.distance);
          return { ...j, applicants: newApplicants, aiMatchId: newApplicants[0]?.workerId };
        }));
      }, delay);
    });
  };

  const applyToJob = useCallback((jobId: string, worker: Worker, note: string, bidPrice: number) => {
    // Send application to backend database
    api.post(`/tasks/${jobId}/applications`, {
      bid_price: bidPrice,
      estimated_time: '2 hours',
      message: note
    })
    .then(res => {
      if (res.data.success) {
        console.log('Application bid saved to backend database:', res.data.data);
        fetchJobs();
      }
    })
    .catch(err => console.error('Error saving application to backend:', err));

    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const dist = haversineDistance(job.location.lat, job.location.lng, worker.lat, worker.lng);
    const applicant: Applicant = {
      workerId: worker.id,
      name: worker.name,
      avatar: worker.avatar,
      lat: worker.lat,
      lng: worker.lng,
      distance: Math.round(dist * 10) / 10,
      rating: worker.rating,
      completedJobs: worker.completedJobs,
      skills: worker.skills,
      appliedAt: Date.now(),
      note,
      bidPrice: Math.max(job.priceMin, Math.min(job.priceMax, bidPrice)),
    };
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      const alreadyApplied = j.applicants.some(a => a.workerId === worker.id);
      if (alreadyApplied) return j;
      const newApplicants = [...j.applicants, applicant].sort((a, b) => a.distance - b.distance);
      return { ...j, applicants: newApplicants, aiMatchId: newApplicants[0]?.workerId };
    }));
  }, [jobs, fetchJobs]);

  const matchJob = useCallback((jobId: string, workerId: string) => {
    // Check wallet balance for hirer
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const winner = job.applicants.find(a => a.workerId === workerId);
    const cost = winner?.bidPrice ?? job.price;
    if (hirerWallet < cost) return; // Block if insufficient funds

    // Optimistic UI update for job status
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      return {
        ...j,
        status: 'matched',
        aiMatchId: workerId,
        price: cost,
      };
    }));
    if (workerId === currentUser.id) {
      setWorkerStatus('on_job');
      setWorkerCurrentJobId(jobId);
    }

    // Persist match to backend database if token exists
    // Backend escrow system handles wallet deduction (holdForMatch)
    const token = localStorage.getItem('firebaseToken');
    if (token && winner?.id) {
      api.post(`/tasks/${jobId}/manual-match`, { application_id: winner.id })
      .then(res => {
        if (res.data.success) {
          console.log('Manual match saved to backend');
          fetchProfile(); // Refresh wallet balance from DB (escrow deducted)
        }
      })
      .catch(err => console.error('Error saving manual match to backend:', err));
    } else {
      // Offline fallback: deduct locally
      setHirerWallet(prev => prev - cost);
    }
  }, [jobs, hirerWallet, currentUser.id, fetchProfile]);

  // ── Close bidding: run AI scoring algo → auto-match winner ──
  const closeBidding = useCallback((jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || job.applicants.length === 0) return;

    const scored = scoreApplicants(job);
    const winner = scored[0];

    // Check wallet balance
    if (hirerWallet < winner.bidPrice) return;

    // Optimistic UI update for job status
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      return {
        ...j,
        status: 'matched',
        aiMatchId: winner.workerId,
        price: winner.bidPrice,
        applicants: scored,
      };
    }));

    if (winner.workerId === currentUser.id) {
      setWorkerStatus('on_job');
      setWorkerCurrentJobId(jobId);
    }

    // Persist auto-match to backend database if token exists
    // Backend escrow system handles wallet deduction (holdForMatch)
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      api.post(`/tasks/${jobId}/auto-match`)
      .then(res => {
        if (res.data.success) {
          console.log('Auto-match saved to backend');
          fetchProfile(); // Refresh wallet balance from DB (escrow deducted)
        }
      })
      .catch(err => console.error('Error saving auto-match to backend:', err));
    } else {
      // Offline fallback: deduct locally
      setHirerWallet(prev => prev - winner.bidPrice);
    }
  }, [jobs, hirerWallet, currentUser.id, fetchProfile]);

  const completeJob = useCallback((jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    // Optimistic UI update for job status
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'completed' } : j));
    
    // Update worker status if the matched worker is the logged-in user
    if (job && job.aiMatchId === currentUser.id) {
      setWorkerStatus('available');
      setWorkerCurrentJobId(null);
    }

    // Persist task completion status to backend if token exists
    // Backend escrow system handles payment distribution (releaseForTask)
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      api.patch(`/tasks/${jobId}/status`, { status: 'COMPLETED' })
      .then(res => {
        if (res.data.success) {
          console.log('Completed status saved to backend');
          fetchProfile(); // Refresh wallet balance from DB (escrow released)
        }
      })
      .catch(err => console.error('Error saving completed status to backend:', err));
    } else {
      // Offline fallback: add earnings locally
      const earnings = job?.price ?? 0;
      if (job && job.aiMatchId === currentUser.id) {
        setWorkerWallet(prev => prev + earnings);
      }
    }
  }, [jobs, currentUser.id, fetchProfile]);

  const topUpWallet = useCallback(async (role: 'hirer' | 'worker', amount: number) => {
    const token = localStorage.getItem('firebaseToken');
    if (!token) {
      if (role === 'hirer') setHirerWallet(prev => prev + amount);
      else setWorkerWallet(prev => prev + amount);
      return;
    }

    try {
      const res = await api.post('/wallet/topup/mock', { amount });
      const data = res.data;
      if (data.success && data.data) {
        const balance = parseFloat(data.data.available_balance || data.data.balance || 0);
        setHirerWallet(balance);
        setWorkerWallet(balance);
      }
    } catch (e) {
      console.error('Error topping up wallet on backend:', e);
      // Fallback
      if (role === 'hirer') setHirerWallet(prev => prev + amount);
      else setWorkerWallet(prev => prev + amount);
    }
  }, []);

  return (
    <AppContext.Provider value={{
      jobs, workers: MOCK_WORKERS, currentUser,
      workerStatus, workerCurrentJobId,
      hirerWallet, workerWallet,
      addJob, applyToJob, matchJob, closeBidding, completeJob, setUserRole, topUpWallet,
      fetchProfile, updateProfile
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    // Return a safe fallback for isolated renders (e.g. Figma preview)
    return {
      jobs: [] as Job[],
      workers: [] as Worker[],
      currentUser: { role: 'hirer' as const, name: 'Guest', avatar: '' },
      workerStatus: 'available' as const,
      workerCurrentJobId: null as string | null,
      hirerWallet: 500000,
      workerWallet: 500000,
      addJob: () => '',
      applyToJob: () => {},
      matchJob: () => {},
      closeBidding: () => {},
      completeJob: () => {},
      setUserRole: () => {},
      topUpWallet: () => {},
      fetchProfile: async () => {},
      updateProfile: async () => false,
    } as AppContextType;
  }
  return ctx;
}