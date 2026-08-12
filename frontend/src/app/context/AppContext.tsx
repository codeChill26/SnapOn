import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../imports/firebase';
import { authService } from '../../services/authService';
import { taskService } from '../../services/taskService';
import { applicationService } from '../../services/applicationService';
import { walletService } from '../../services/walletService';
import { categoryService } from '../../services/categoryService';
import { Task, Category, User, TaskApplication, TaskStatus } from '../../types';

export interface Applicant {
  id?: string;
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
  bidPrice: number;
  status?: string;
  aiScore?: number;
  aiBreakdown?: {
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

export interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryIcon: string;
  duration: number;
  price: number;
  priceMin: number;
  priceMax: number;
  location: { lat: number; lng: number; address: string };
  postedAt: number;
  expiresAt: number;
  status: 'active' | 'matched' | 'completed' | 'expired';
  hirerName: string;
  hirerAvatar: string;
  hirerId?: string;
  applicants: Applicant[];
  aiMatchId?: string | null;
  assignedWorker?: {
    id: string;
    workerId: string;
    name: string;
    avatar: string;
    phone?: string;
    bidPrice?: number | null;
  } | null;
  rawTask?: Task;
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

export function scoreApplicants(job: Job): Applicant[] {
  if (!job.applicants || job.applicants.length === 0) return [];
  if (job.applicants.length === 1) {
    return [{
      ...job.applicants[0],
      aiScore: 1,
      aiBreakdown: { distScore: 1, priceScore: 1, ratingScore: 1 },
    }];
  }

  const bids = job.applicants.map(a => a.bidPrice);
  const dists = job.applicants.map(a => a.distance);
  const ratings = job.applicants.map(a => a.rating);

  const minBid = Math.min(...bids), maxBid = Math.max(...bids);
  const minDist = Math.min(...dists), maxDist = Math.max(...dists);
  const minRating = Math.min(...ratings), maxRating = Math.max(...ratings);

  const bidRange = maxBid - minBid || 1;
  const distRange = maxDist - minDist || 1;
  const ratingRange = maxRating - minRating || 1;

  const scored = job.applicants.map(a => {
    const priceScore = 1 - (a.bidPrice - minBid) / bidRange;
    const distScore = 1 - (a.distance - minDist) / distRange;
    const ratingScore = (a.rating - minRating) / ratingRange;

    const aiScore = 0.45 * distScore + 0.35 * priceScore + 0.20 * ratingScore;

    return {
      ...a,
      aiScore: Math.round(aiScore * 1000) / 1000,
      aiBreakdown: {
        distScore: Math.round(distScore * 100) / 100,
        priceScore: Math.round(priceScore * 100) / 100,
        ratingScore: Math.round(ratingScore * 100) / 100,
      },
    };
  });

  return scored.sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));
}

interface AppContextType {
  jobs: Job[];
  categories: Category[];
  workers: Worker[];
  currentUser: {
    id: string;
    name: string;
    avatar: string;
    email?: string;
    phone?: string;
    bio?: string;
    headline?: string;
    skills?: string[];
    coverUrl?: string;
    bankName?: string;
    bankAccountNumber?: string;
    role: 'hirer' | 'worker' | 'admin';
  };
  workerStatus: 'available' | 'on_job';
  workerCurrentJobId: string | null;
  hirerWallet: number;
  workerWallet: number;
  addJob: (job: Omit<Job, 'id' | 'postedAt' | 'expiresAt' | 'status' | 'applicants' | 'hirerName' | 'hirerAvatar'> & {
    postType?: string;
    workMode?: string;
    salaryUnit?: string;
    employmentType?: string;
    peopleNeeded?: number | null;
    contactPhone?: string | null;
    startDate?: string | null;
    hashtags?: string[];
    images?: string[];
  }) => Promise<string>;
  applyToJob: (jobId: string, worker: Worker, note: string, bidPrice: number) => Promise<{ success: boolean; message?: string }>;
  matchJob: (jobId: string, workerId: string) => Promise<void>;
  closeBidding: (jobId: string) => Promise<void>;
  completeJob: (jobId: string) => Promise<void>;
  deleteJob: (jobId: string) => Promise<boolean>;
  updateJob: (jobId: string, fields: Partial<Job>) => Promise<boolean>;
  setUserRole: (role: 'hirer' | 'worker' | 'admin') => void;
  topUpWallet: (role: 'hirer' | 'worker', amount: number) => Promise<void>;
  fetchJobs: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (fields: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    bio?: string;
    headline?: string;
    skills?: string[];
    coverUrl?: string;
    bankName?: string;
    bankAccountNumber?: string;
  }) => Promise<boolean>;
  firebaseUser: any;
  authLoading: boolean;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [dbUser, setDbUser] = useState<User | null>(() => {
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
          return parsed.role === 'tasker' || parsed.role === 'worker' ? 'worker' : parsed.role === 'admin' || parsed.role === 'ADMIN' ? 'admin' : 'hirer';
        }
      }
    } catch {}
    return 'hirer';
  });

  const [workerStatus, setWorkerStatus] = useState<'available' | 'on_job'>('available');
  const [workerCurrentJobId, setWorkerCurrentJobId] = useState<string | null>(null);
  const [hirerWallet, setHirerWallet] = useState(0);
  const [workerWallet, setWorkerWallet] = useState(0);

  const currentUser = {
    id: dbUser?.id || (userRole === 'admin' ? 'admin' : userRole === 'worker' ? 'worker' : 'hirer'),
    name: dbUser?.fullName || (userRole === 'admin' ? 'Admin' : userRole === 'worker' ? 'Người làm' : 'Người thuê'),
    avatar: dbUser?.avatarUrl || '',
    email: dbUser?.email || '',
    phone: dbUser?.phone || '',
    bio: dbUser?.bio || '',
    headline: dbUser?.headline || '',
    skills: Array.isArray(dbUser?.skills) ? dbUser.skills : [],
    coverUrl: dbUser?.coverUrl || '',
    bankName: dbUser?.bankName || '',
    bankAccountNumber: dbUser?.bankAccountNumber || '',
    role: userRole,
  };

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await categoryService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const convertTaskToJob = (task: Task, currentUserId?: string | null): Job => {
    const categorySlug = task.field?.slug || task.categoryId || 'others';
    const catMeta = CATEGORIES.find(c => c.id === categorySlug);
    const loc = task.locations && task.locations[0] ? task.locations[0] : { address: '🌐 Toàn quốc (Online)', lat: 10.7769, lng: 106.7009 };

    let status: Job['status'] = 'active';
    if (task.status === 'OPEN') status = 'active';
    else if (task.status === 'IN_PROGRESS') status = 'matched';
    else if (task.status === 'COMPLETED') status = 'completed';
    else status = 'expired';

    const expires = task.applicationDeadline || task.deadlineEnd;
    const expiresAt = expires ? new Date(expires).getTime() : Date.now() + 30 * 24 * 3600 * 1000;

    return {
      id: task.id,
      title: task.title,
      description: task.description || '',
      category: categorySlug,
      categoryIcon: catMeta?.icon || task.field?.icon || '⚡',
      duration: 2,
      price: task.finalPrice || task.budgetMin || 0,
      priceMin: task.budgetMin || 0,
      priceMax: task.budgetMax || 0,
      location: {
        lat: loc.lat || 10.7769,
        lng: loc.lng || 106.7009,
        address: loc.address || 'Hồ Chí Minh',
      },
      postedAt: new Date(task.createdAt).getTime(),
      expiresAt: isNaN(expiresAt) ? Date.now() + 30 * 24 * 3600 * 1000 : expiresAt,
      status,
      hirerName: task.posterName || task.poster?.fullName || 'Người dùng',
      hirerAvatar: task.poster?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=HirerUser',
      hirerId: task.posterId,
      aiMatchId: task.assignedWorker?.id || null,
      assignedWorker: task.assignedWorker ? {
        id: task.assignedWorker.id,
        workerId: task.assignedWorker.id,
        name: task.assignedWorker.name,
        avatar: task.assignedWorker.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedWorker.id}`,
        phone: task.assignedWorker.phone,
        bidPrice: task.assignedWorker.bidPrice,
      } : null,
      applicants: [],
      rawTask: task,
    };
  };

  const fetchJobs = useCallback(async () => {
    try {
      const token = localStorage.getItem('firebaseToken');
      const currentUserId = dbUser?.id || null;

      // 1. Fetch public / all tasks
      const res = await taskService.getTasks({ limit: 50 });
      const mappedJobs = res.data.map(t => convertTaskToJob(t, currentUserId));

      // 2. If user is logged in, fetch applicants for own posted tasks
      if (token && currentUserId) {
        await Promise.all(
          mappedJobs
            .filter(j => j.hirerId === currentUserId)
            .map(async (job) => {
              try {
                const apps = await applicationService.getApplicationsByTask(job.id);
                job.applicants = apps.map((app: TaskApplication) => ({
                  id: app.id,
                  workerId: app.taskerId,
                  name: app.taskerName || 'Người làm',
                  avatar: app.taskerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.taskerId}`,
                  lat: 10.7769,
                  lng: 106.7009,
                  distance: 0,
                  rating: app.taskerRating || 5.0,
                  completedJobs: app.completedJobs || 0,
                  skills: [],
                  appliedAt: new Date(app.createdAt).getTime(),
                  note: app.message || '',
                  bidPrice: app.bidPrice || 0,
                  status: app.status,
                }));
                if (job.status === 'matched' && job.applicants.length > 0 && !job.aiMatchId) {
                  job.aiMatchId = job.applicants[0]?.workerId;
                }
              } catch {}
            })
        );

        // 3. Fetch Worker's own applications
        try {
          const myApps = await applicationService.getMyApplications();
          myApps.forEach((myApp: TaskApplication) => {
            let targetJob = mappedJobs.find(j => j.id === myApp.taskId);
            if (!targetJob) {
              const catMeta = CATEGORIES.find(c => c.id === 'others');
              targetJob = {
                id: myApp.taskId,
                title: myApp.taskTitle || 'Công việc đã ứng tuyển',
                description: '',
                category: 'others',
                categoryIcon: catMeta?.icon || '⚡',
                duration: 2,
                price: myApp.bidPrice || 0,
                priceMin: myApp.bidPrice || 0,
                priceMax: myApp.bidPrice || 0,
                location: { lat: 10.7769, lng: 106.7009, address: '🌐 Online' },
                postedAt: new Date(myApp.createdAt).getTime(),
                expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
                status: myApp.taskStatus === 'OPEN' ? 'active' : myApp.taskStatus === 'IN_PROGRESS' ? 'matched' : myApp.taskStatus === 'COMPLETED' ? 'completed' : 'expired',
                hirerName: 'Người tuyển dụng',
                hirerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HirerUser',
                hirerId: '',
                aiMatchId: myApp.status === 'ACCEPTED' ? myApp.taskerId : null,
                assignedWorker: myApp.status === 'ACCEPTED' ? {
                  id: myApp.taskerId,
                  workerId: myApp.taskerId,
                  name: myApp.taskerName || 'Tôi',
                  avatar: myApp.taskerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myApp.taskerId}`,
                  bidPrice: myApp.bidPrice,
                } : null,
                applicants: [],
              };
              mappedJobs.push(targetJob);
            }

            const existingApp = targetJob.applicants.find(a => a.id === myApp.id || a.workerId === myApp.taskerId);
            if (existingApp) {
              existingApp.status = myApp.status;
            } else {
              targetJob.applicants.push({
                id: myApp.id,
                workerId: myApp.taskerId,
                name: myApp.taskerName || 'Tôi',
                avatar: myApp.taskerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myApp.taskerId}`,
                lat: 10.7769,
                lng: 106.7009,
                distance: 0,
                rating: 5.0,
                completedJobs: 0,
                skills: [],
                appliedAt: new Date(myApp.createdAt).getTime(),
                note: myApp.message || '',
                bidPrice: myApp.bidPrice || 0,
                status: myApp.status,
              });
            }
          });
        } catch {}
      }

      setJobs(mappedJobs);
    } catch (err) {
      console.error('Error loading jobs in context:', err);
    }
  }, [dbUser?.id]);

  const logout = useCallback(async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      const refreshToken = localStorage.getItem('refreshToken') || undefined;
      await authService.logout(refreshToken);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('firebaseToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('appUser');
      localStorage.removeItem('userRoleMode');
      localStorage.removeItem('wallet');
      setDbUser(null);
      setFirebaseUser(null);
      _setUserRole('hirer');
      setHirerWallet(0);
      setWorkerWallet(0);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) {
        setDbUser(null);
        const savedMode = localStorage.getItem('userRoleMode') as 'hirer' | 'worker' | 'admin' | null;
        _setUserRole(savedMode || 'hirer');
        setHirerWallet(0);
        setWorkerWallet(0);
        return;
      }

      const user = await authService.getProfile();
      if (user) {
        setDbUser(user);
        localStorage.setItem('appUser', JSON.stringify(user));
        const dbRole = user.role;
        const savedMode = localStorage.getItem('userRoleMode') as 'hirer' | 'worker' | 'admin' | null;
        let mappedRole: 'hirer' | 'worker' | 'admin' =
          dbRole === 'tasker' || dbRole === 'worker' ? 'worker' : dbRole === 'admin' || dbRole === 'ADMIN' ? 'admin' : 'hirer';
        if ((dbRole === 'USER' || !dbRole) && savedMode) {
          mappedRole = savedMode;
        }
        _setUserRole(mappedRole);

        // Fetch wallet
        try {
          const wallet = await walletService.getMyWallet();
          if (wallet) {
            setHirerWallet(wallet.availableBalance);
            setWorkerWallet(wallet.availableBalance);
          }
        } catch (wErr) {
          console.warn('Wallet fetch notice:', wErr);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.warn('Unauthorized token, logging out.');
        logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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
          await fetchProfile();
        } catch (err) {
          console.error('Error on auth state change:', err);
        }
      } else {
        localStorage.removeItem('firebaseToken');
        localStorage.removeItem('appUser');
        localStorage.removeItem('userRoleMode');
        setDbUser(null);
        _setUserRole('hirer');
        setHirerWallet(0);
        setWorkerWallet(0);
      }
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (fields: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    bio?: string;
    headline?: string;
    skills?: string[];
    coverUrl?: string;
    bankName?: string;
    bankAccountNumber?: string;
  }) => {
    try {
      const updated = await authService.updateProfile(fields);
      if (updated) {
        setDbUser(updated);
        localStorage.setItem('appUser', JSON.stringify(updated));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating profile:', err);
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
        const updated = await authService.updateRole(dbRole);
        if (updated) {
          setDbUser(updated);
          localStorage.setItem('appUser', JSON.stringify(updated));
        }
        await fetchProfile();
      } catch (err) {
        console.error('Error updating role in DB:', err);
      }
    }
  }, [fetchProfile]);

  const addJob = useCallback(async (jobData: any): Promise<string> => {
    try {
      const created = await taskService.createTask({
        title: jobData.title,
        description: jobData.description,
        category_id: jobData.category,
        task_type: jobData.taskType || 'ONLINE',
        budget_min: jobData.priceMin,
        budget_max: jobData.priceMax,
        post_type: jobData.postType || 'RECRUITMENT',
        work_mode: jobData.workMode || 'REMOTE',
        salary_unit: jobData.salaryUnit || 'PER_JOB',
        employment_type: jobData.employmentType || 'ONE_TIME',
        people_needed: jobData.peopleNeeded || 1,
        contact_phone: jobData.contactPhone || currentUser.phone || '0900000000',
        start_date: jobData.startDate || new Date().toISOString(),
        hashtags: jobData.hashtags || [],
        images: jobData.images || [],
        location: jobData.location ? {
          location_type: 'TASK_LOCATION',
          address: jobData.location.address || 'Làm việc Online',
          latitude: jobData.location.lat || 10.7769,
          longitude: jobData.location.lng || 106.7009,
        } : undefined,
      });

      await fetchJobs();
      return created.id;
    } catch (err) {
      console.error('Error adding job:', err);
      throw err;
    }
  }, [currentUser.phone, fetchJobs]);

  const applyToJob = useCallback(async (jobId: string, worker: Worker, note: string, bidPrice: number): Promise<{ success: boolean; message?: string }> => {
    try {
      await applicationService.createApplication(jobId, {
        bid_price: bidPrice,
        estimated_time: '1-2 ngày',
        message: note,
      });
      await fetchJobs();
      return { success: true, message: 'Ứng tuyển thành công!' };
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.response?.status === 409 ? 'Bạn đã ứng tuyển công việc này rồi!' : 'Không thể gửi đơn ứng tuyển.');
      return { success: false, message: msg };
    }
  }, [fetchJobs]);

  const matchJob = useCallback(async (jobId: string, workerId: string) => {
    const job = jobs.find(j => j.id === jobId);
    const applicant = job?.applicants.find(a => a.workerId === workerId);
    if (!applicant?.id) return;

    try {
      await applicationService.manualMatch(jobId, applicant.id);
      await fetchJobs();
      await fetchProfile();
    } catch (err) {
      console.error('Error matching job:', err);
    }
  }, [jobs, fetchJobs, fetchProfile]);

  const closeBidding = useCallback(async (jobId: string) => {
    try {
      await applicationService.autoMatch(jobId);
      await fetchJobs();
      await fetchProfile();
    } catch (err) {
      console.error('Error auto-matching job:', err);
    }
  }, [fetchJobs, fetchProfile]);

  const completeJob = useCallback(async (jobId: string) => {
    try {
      await taskService.updateTaskStatus(jobId, 'COMPLETED');
      await fetchJobs();
      await fetchProfile();
    } catch (err) {
      console.error('Error completing job:', err);
    }
  }, [fetchJobs, fetchProfile]);

  const deleteJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      await taskService.deleteTask(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      return true;
    } catch (err) {
      console.error('Error deleting job:', err);
      return false;
    }
  }, []);

  const updateJob = useCallback(async (jobId: string, fields: Partial<Job>): Promise<boolean> => {
    try {
      await taskService.updateTask(jobId, {
        title: fields.title,
        description: fields.description,
        budget_min: fields.priceMin,
        budget_max: fields.priceMax,
      });
      await fetchJobs();
      return true;
    } catch (err) {
      console.error('Error updating job:', err);
      return false;
    }
  }, [fetchJobs]);

  const topUpWallet = useCallback(async (role: 'hirer' | 'worker', amount: number) => {
    try {
      const wallet = await walletService.topupMock(amount);
      if (wallet) {
        setHirerWallet(wallet.availableBalance);
        setWorkerWallet(wallet.availableBalance);
      }
    } catch (err) {
      console.error('Error topping up wallet:', err);
    }
  }, []);

  return (
    <AppContext.Provider value={{
      jobs, categories, workers: [], currentUser,
      workerStatus, workerCurrentJobId,
      hirerWallet, workerWallet,
      addJob, applyToJob, matchJob, closeBidding, completeJob, deleteJob, updateJob, setUserRole, topUpWallet,
      fetchJobs, fetchCategories, fetchProfile, updateProfile,
      firebaseUser, authLoading, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
