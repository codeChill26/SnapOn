import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../imports/firebase';
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

export const MOCK_WORKERS: Worker[] = [];

export const DEMO_WORKER: Worker | null = null;

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



// ─── Context types ─────────────────────────────────────────────
interface AppContextType {
  jobs: Job[];
  workers: Worker[];
  currentUser: { id: string; name: string; avatar: string; email?: string; phone?: string; bio?: string; headline?: string; skills?: string[]; coverUrl?: string; role: 'hirer' | 'worker' | 'admin' };
  workerStatus: 'available' | 'on_job';
  workerCurrentJobId: string | null;
  hirerWallet: number;
  workerWallet: number;
  addJob: (job: Omit<Job, 'id' | 'postedAt' | 'expiresAt' | 'status' | 'applicants' | 'hirerName' | 'hirerAvatar'>) => string;
  applyToJob: (jobId: string, worker: Worker, note: string, bidPrice: number) => void;
  matchJob: (jobId: string, workerId: string) => void;
  closeBidding: (jobId: string) => void;
  completeJob: (jobId: string) => void;
  deleteJob: (jobId: string) => Promise<boolean>;
  updateJob: (jobId: string, fields: Partial<Job>) => Promise<boolean>;
  setUserRole: (role: 'hirer' | 'worker' | 'admin') => void;
  topUpWallet: (role: 'hirer' | 'worker', amount: number) => void;
  fetchJobs: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (fields: { fullName?: string; phone?: string; avatarUrl?: string; bio?: string; headline?: string; skills?: string[]; coverUrl?: string }) => Promise<boolean>;
  firebaseUser: any;
  authLoading: boolean;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);

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
          expiresAt: (() => {
            const t = task.application_deadline || task.deadline_end;
            if (!t) return Date.now() + 24 * 3600 * 1000;
            const parsed = new Date(t).getTime();
            return isNaN(parsed) || parsed < Date.now() ? Date.now() + 24 * 3600 * 1000 : parsed;
          })(),
          status: task.status === 'OPEN' ? 'active' : task.status === 'IN_PROGRESS' ? 'matched' : task.status === 'COMPLETED' ? 'completed' : 'expired',
          hirerName: task.poster_name || 'Người dùng',
          hirerAvatar: task.poster_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=HirerUser',
          hirerId: task.poster_id,
          aiMatchId: task.assigned_worker?.id || null,
          assignedWorker: task.assigned_worker ? {
            id: task.assigned_worker.id,
            workerId: task.assigned_worker.id,
            name: task.assigned_worker.name,
            avatar: task.assigned_worker.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assigned_worker.id}`,
            phone: task.assigned_worker.phone,
            bidPrice: task.assigned_worker.bid_price
          } : null,
          applicants: []
        }));
        
        const currentUserId = (() => {
          try {
            const saved = localStorage.getItem('appUser');
            return saved ? JSON.parse(saved).id : null;
          } catch {
            return null;
          }
        })();

        const token = localStorage.getItem('firebaseToken');
        const jobsWithApps = await Promise.all(mappedJobs.map(async (job: any) => {
          if (token && currentUserId && (job.hirerId === currentUserId || (currentUser as any)?.dbUser?.id && job.hirerId === (currentUser as any).dbUser.id)) {
            try {
              const appRes = await api.get(`/tasks/${job.id}/applications`).catch(() => null);
              if (appRes && appRes.data?.success && Array.isArray(appRes.data.data)) {
                job.applicants = appRes.data.data.map((app: any) => ({
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
                if (job.status === 'matched' && job.applicants.length > 0) {
                  job.aiMatchId = job.applicants[0]?.workerId;
                }
              }
            } catch (e) {
              // Expected if not authorized
            }
          }
          return job;
        }));

        // Fetch own tasks for Hirer / current user
        if (token) {
          try {
            const myTaskRes = await api.get('/tasks/my-tasks').catch(() => null);
            if (myTaskRes && myTaskRes.data?.success && Array.isArray(myTaskRes.data.data)) {
              myTaskRes.data.data.forEach((task: any) => {
                let existing = jobsWithApps.find((j: any) => j.id === task.id);
                if (!existing) {
                  const categoryIcon = CATEGORIES.find(c => c.id === task.category_slug)?.icon || '⚡';
                  existing = {
                    id: task.id,
                    title: task.title,
                    description: task.description || '',
                    category: task.category_slug || 'others',
                    categoryIcon: categoryIcon,
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
                    expiresAt: (() => {
                      const t = task.application_deadline || task.deadline_end;
                      if (!t) return Date.now() + 24 * 3600 * 1000;
                      const parsed = new Date(t).getTime();
                      return isNaN(parsed) || parsed < Date.now() ? Date.now() + 24 * 3600 * 1000 : parsed;
                    })(),
                    status: task.status === 'OPEN' ? 'active' : task.status === 'IN_PROGRESS' ? 'matched' : task.status === 'COMPLETED' ? 'completed' : 'expired',
                    hirerName: task.poster_name || 'Người dùng',
                    hirerAvatar: task.poster_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=HirerUser',
                    hirerId: task.poster_id,
                    aiMatchId: task.assigned_worker?.id || null,
                    assignedWorker: task.assigned_worker ? {
                      id: task.assigned_worker.id,
                      workerId: task.assigned_worker.id,
                      name: task.assigned_worker.name,
                      avatar: task.assigned_worker.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assigned_worker.id}`,
                      phone: task.assigned_worker.phone,
                      bidPrice: task.assigned_worker.bid_price
                    } : null,
                    applicants: []
                  };
                  jobsWithApps.push(existing);
                }
              });
            }
          } catch (myTaskErr) {
            // Silently ignore
          }
        }

        // Fetch own applications for Worker role
        if (token) {
          try {
            const myAppRes = await api.get('/applications/my-applications');
            const myAppData = myAppRes.data;
            if (myAppData.success && Array.isArray(myAppData.data)) {
              myAppData.data.forEach((myApp: any) => {
                let targetJob = jobsWithApps.find((j: any) => j.id === myApp.task_id);
                if (!targetJob) {
                  const categoryIcon = CATEGORIES.find(c => c.id === myApp.category_slug)?.icon || '⚡';
                  targetJob = {
                    id: myApp.task_id,
                    title: myApp.task_title || 'Công việc',
                    description: myApp.task_description || '',
                    category: myApp.category_slug || 'others',
                    categoryIcon: categoryIcon,
                    duration: myApp.duration || 2,
                    price: parseFloat(myApp.bid_price || myApp.budget_min || 0),
                    priceMin: parseFloat(myApp.budget_min || 0),
                    priceMax: parseFloat(myApp.budget_max || 0),
                    location: { lat: 10.7769, lng: 106.7009, address: '🌐 Làm việc Online (Toàn quốc)' },
                    postedAt: new Date(myApp.created_at || Date.now()).getTime(),
                    expiresAt: Date.now() + 24 * 3600 * 1000,
                    status: myApp.task_status === 'OPEN' ? 'active' : myApp.task_status === 'IN_PROGRESS' ? 'matched' : myApp.task_status === 'COMPLETED' ? 'completed' : 'expired',
                    hirerName: myApp.poster_name || 'Người dùng',
                    hirerAvatar: myApp.poster_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=HirerUser',
                    hirerId: myApp.poster_id,
                    aiMatchId: (myApp.status === 'ACCEPTED' || myApp.assignment_id) ? myApp.tasker_id : null,
                    assignedWorker: (myApp.status === 'ACCEPTED' || myApp.assignment_id) ? {
                      id: myApp.tasker_id,
                      workerId: myApp.tasker_id,
                      name: myApp.tasker_name || 'Tôi',
                      avatar: myApp.tasker_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=TaskerUser',
                      phone: '',
                      bidPrice: parseFloat(myApp.bid_price || 0)
                    } : null,
                    applicants: []
                  };
                  jobsWithApps.push(targetJob);
                }

                const existingApp = targetJob.applicants.find((a: any) => a.id === myApp.id || a.workerId === myApp.tasker_id || (currentUserId && a.workerId === currentUserId));
                if (existingApp) {
                  existingApp.status = myApp.status;
                } else {
                  targetJob.applicants.push({
                    id: myApp.id,
                    workerId: myApp.tasker_id,
                    name: myApp.tasker_name || 'Tôi',
                    avatar: myApp.tasker_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=TaskerUser',
                    lat: 10.7769,
                    lng: 106.7009,
                    distance: 0,
                    rating: 5.0,
                    completedJobs: 0,
                    skills: [],
                    appliedAt: new Date(myApp.created_at).getTime(),
                    note: myApp.message || '',
                    bidPrice: parseFloat(myApp.bid_price || 0),
                    status: myApp.status
                  });
                }

                if (myApp.status === 'ACCEPTED' || myApp.assignment_id) {
                  targetJob.aiMatchId = myApp.tasker_id;
                  if (myApp.task_status === 'IN_PROGRESS') targetJob.status = 'matched';
                  if (myApp.task_status === 'COMPLETED') targetJob.status = 'completed';
                }
              });
            }
          } catch (myAppErr) {
            // Silently ignore
          }
        }

        setJobs(jobsWithApps);
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [dbUser, setDbUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('appUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [userRole, _setUserRole] = useState<'hirer' | 'worker' | 'admin'>(() => {
    try {
      const savedMode = localStorage.getItem('userRoleMode');
      if (savedMode && (savedMode === 'worker' || savedMode === 'hirer' || savedMode === 'admin')) {
        return savedMode as 'hirer' | 'worker' | 'admin';
      }
      const saved = localStorage.getItem('appUser');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) {
          return parsed.role === 'tasker' || parsed.role === 'worker' ? 'worker' : parsed.role === 'admin' ? 'admin' : 'hirer';
        }
      }
    } catch {}
    return 'hirer';
  });

  const [workerStatus, setWorkerStatus] = useState<'available' | 'on_job'>('available');
  const [workerCurrentJobId, setWorkerCurrentJobId] = useState<string | null>(null);
  const [hirerWallet, setHirerWallet] = useState(0);
  const [workerWallet, setWorkerWallet] = useState(0);

  const currentUser = userRole === 'hirer'
    ? {
        id: dbUser?.id || 'hirer',
        name: dbUser?.full_name || dbUser?.fullName || 'Người thuê',
        avatar: dbUser?.avatar_url || dbUser?.avatarUrl || '',
        email: dbUser?.email || '',
        phone: dbUser?.phone || '',
        bio: dbUser?.bio || '',
        headline: dbUser?.headline || '',
        skills: Array.isArray(dbUser?.skills) ? dbUser.skills : [],
        coverUrl: dbUser?.cover_url || dbUser?.coverUrl || '',
        role: 'hirer' as const
      }
    : userRole === 'admin'
    ? {
        id: dbUser?.id || 'admin',
        name: dbUser?.full_name || dbUser?.fullName || 'Admin',
        avatar: dbUser?.avatar_url || dbUser?.avatarUrl || '',
        email: dbUser?.email || '',
        bio: dbUser?.bio || '',
        headline: dbUser?.headline || '',
        skills: Array.isArray(dbUser?.skills) ? dbUser.skills : [],
        coverUrl: dbUser?.cover_url || dbUser?.coverUrl || '',
        role: 'admin' as const
      }
    : {
        id: dbUser?.id || 'worker',
        name: dbUser?.full_name || dbUser?.fullName || 'Người làm',
        avatar: dbUser?.avatar_url || dbUser?.avatarUrl || '',
        email: dbUser?.email || '',
        phone: dbUser?.phone || '',
        bio: dbUser?.bio || '',
        headline: dbUser?.headline || '',
        skills: Array.isArray(dbUser?.skills) ? dbUser.skills : [],
        coverUrl: dbUser?.cover_url || dbUser?.coverUrl || '',
        role: 'worker' as const
      };

  const logout = useCallback(async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      localStorage.removeItem('firebaseToken');
      localStorage.removeItem('appUser');
      localStorage.removeItem('userRoleMode');
      localStorage.removeItem('wallet');
      setDbUser(null);
      setFirebaseUser(null);
      _setUserRole('hirer');
      setHirerWallet(0);
      setWorkerWallet(0);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) {
        setDbUser(null);
        // no-op
        const savedMode = localStorage.getItem('userRoleMode') as 'hirer' | 'worker' | 'admin' | null;
        _setUserRole(savedMode || 'hirer');
        setHirerWallet(0);
        setWorkerWallet(0);
        return;
      }

      const res = await api.get('/users/profile').catch((err) => {
        if (err.response?.status === 401) {
          console.warn('Unauthorized user token. Logging out...');
          logout();
        }
        throw err;
      });
      const data = res.data;
      const userObj = data.data?.user || data.user;
      if (data.success && userObj) {
        setDbUser(userObj);
        localStorage.setItem('appUser', JSON.stringify(userObj));
        const dbRole = userObj.role;
        const savedMode = localStorage.getItem('userRoleMode') as 'hirer' | 'worker' | 'admin' | null;
        let mappedRole: 'hirer' | 'worker' | 'admin' = (dbRole === 'tasker' || dbRole === 'worker') ? 'worker' : dbRole === 'admin' ? 'admin' : 'hirer';
        if ((dbRole === 'USER' || !dbRole) && savedMode && (savedMode === 'worker' || savedMode === 'hirer')) {
          mappedRole = savedMode;
        }
        _setUserRole(mappedRole);

        // Fetch wallet balance from database
        try {
          const walletRes = await api.get('/wallet/me');
          const walletData = walletRes.data;
          if (walletData.success && walletData.data) {
            const balance = parseFloat(walletData.data.available_balance ?? walletData.data.balance ?? 0);
            setHirerWallet(balance);
            setWorkerWallet(balance);
          }
        } catch (walletErr) {
          console.error('Error fetching wallet balance:', walletErr);
        }

        // Re-fetch jobs with authorized user token
        await fetchJobs();
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  }, [logout, fetchJobs]);

  // Listen to Firebase auth state changes and sync profile/tokens
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);

      if (user) {
        try {
          const token = await user.getIdToken();
          localStorage.setItem('firebaseToken', token);
          
          // Sync or fetch profile with the fresh token
          await fetchProfile();
        } catch (err) {
          console.error("Error updating token on auth state change:", err);
        }
      } else {
        // Clear local storage & state if logged out
        localStorage.removeItem('firebaseToken');
        localStorage.removeItem('appUser');
        localStorage.removeItem('userRoleMode');
        localStorage.removeItem('wallet');
        setDbUser(null);
        _setUserRole('hirer');
        setHirerWallet(0);
        setWorkerWallet(0);
      }
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (fields: { fullName?: string; phone?: string; avatarUrl?: string; bio?: string; headline?: string; skills?: string[]; coverUrl?: string }) => {
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) return false;

      const res = await api.put('/users/profile', fields);
      const data = res.data;
      const userObj = data.data?.user || data.user;
      if (data.success && userObj) {
        setDbUser(userObj);
        localStorage.setItem('appUser', JSON.stringify(userObj));
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
    localStorage.setItem('userRoleMode', role);
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      try {
        const dbRole = role === 'worker' ? 'tasker' : role;
        const res = await api.put('/users/role', { role: dbRole });
        const data = res.data;
        const userObj = data.data?.user || data.user;
        if (data.success && userObj) {
          setDbUser(userObj);
          localStorage.setItem('appUser', JSON.stringify(userObj));
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
      task_type: 'ONLINE',
      work_mode: 'REMOTE',
      post_type: 'RECRUITMENT',
      budget_min: jobData.priceMin,
      budget_max: jobData.priceMax,
      contact_phone: (currentUser as any)?.phone || '0900000000',
      start_date: new Date().toISOString(),
      location: {
        location_type: 'TASK_LOCATION',
        address: jobData.location?.address || '🌐 Làm việc Online (Toàn quốc)',
        latitude: jobData.location?.lat || 10.7769,
        longitude: jobData.location?.lng || 106.7009,
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
    const newJob: Job = {
      ...jobData,
      id,
      postedAt,
      expiresAt: postedAt + 30 * 24 * 3600 * 1000,
      status: 'active',
      hirerName: currentUser.name,
      hirerAvatar: currentUser.avatar,
      hirerId: currentUser.id,
      applicants: [],
    };
    setJobs(prev => [newJob, ...prev]);
    return id;
  }, [currentUser, fetchJobs]);

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
        setTimeout(() => {
          window.dispatchEvent(new Event('notification-updated'));
        }, 500);
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
        if (role === 'worker') {
          setWorkerWallet(balance);
          setHirerWallet(0);
        } else {
          setHirerWallet(balance);
          setWorkerWallet(0);
        }
      }
    } catch (e) {
      console.error('Error topping up wallet on backend:', e);
      // Fallback
      if (role === 'hirer') setHirerWallet(prev => prev + amount);
      else setWorkerWallet(prev => prev + amount);
    }
  }, []);

  const deleteJob = useCallback(async (jobId: string): Promise<boolean> => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      try {
        const res = await api.delete(`/tasks/${jobId}`);
        return res.data?.success || true;
      } catch (err) {
        console.error('Error deleting task on backend:', err);
        return false;
      }
    }
    return true;
  }, []);

  const updateJob = useCallback(async (jobId: string, fields: Partial<Job>): Promise<boolean> => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...fields } : j));
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      try {
        const res = await api.patch(`/tasks/${jobId}`, {
          title: fields.title,
          description: fields.description,
          budget_min: fields.priceMin,
          budget_max: fields.priceMax,
        });
        return res.data?.success || true;
      } catch (err) {
        console.error('Error updating task on backend:', err);
        return false;
      }
    }
    return true;
  }, []);

  return (
    <AppContext.Provider value={{
      jobs, workers: [], currentUser,
      workerStatus, workerCurrentJobId,
      hirerWallet, workerWallet,
      addJob, applyToJob, matchJob, closeBidding, completeJob, deleteJob, updateJob, setUserRole, topUpWallet,
      fetchJobs, fetchProfile, updateProfile,
      firebaseUser, authLoading, logout
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
      currentUser: { id: '', role: 'hirer' as const, name: 'Guest', avatar: '' },
      workerStatus: 'available' as const,
      workerCurrentJobId: null as string | null,
      hirerWallet: 0,
      workerWallet: 0,
      addJob: () => '',
      applyToJob: () => {},
      matchJob: () => {},
      closeBidding: () => {},
      completeJob: () => {},
      setUserRole: () => {},
      topUpWallet: () => {},
      fetchJobs: async () => {},
      fetchProfile: async () => {},
      updateProfile: async () => false,
      firebaseUser: null,
      authLoading: false,
      logout: async () => {},
    } as AppContextType;
  }
  return ctx;
}
