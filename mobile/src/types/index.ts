export type UserRole = 'USER' | 'ADMIN';

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'CLOSED' | 'EXPIRED';

export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export type TaskType = 'ONLINE' | 'OFFLINE' | 'HYBRID';

export interface User {
  id: string;
  firebaseUid: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  coverUrl?: string;
  role: UserRole;
  status: 'ACTIVE' | 'BANNED' | 'SUSPENDED';
  isVerified: boolean;
  isIdVerified?: boolean;
  createdAt: string;
  bio?: string;
  headline?: string;
  skills?: string[];
  bankName?: string;
  bankAccountNumber?: string;
}

export interface PublicProfile {
  id: string;
  fullName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio: string;
  headline: string;
  skills: string[];
  isVerified: boolean;
  isIdVerified?: boolean;
  joinedAt: string;
  ratingAverage: number;
  reviewCount: number;
  completedJobsCount: number;
  postedJobsCount: number;
  serviceOffersCount: number;
  activePostsCount: number;
  publicStats?: {
    posted: number;
    services: number;
    completed: number;
    rating: number;
  };
}

export interface ProfileReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
  reviewerAvatar?: string;
  taskName?: string;
}


export interface Task {
  id: string;
  posterId: string;
  categoryId: string;
  title: string;
  description: string;
  taskType: TaskType;
  status: TaskStatus;
  budgetMin: number;
  budgetMax: number;
  finalPrice?: number;
  deadlineStart: string;
  deadlineEnd: string;
  allowInsurance: boolean;
  createdAt: string;
  applicationDeadline?: string;
  closedAt?: string;
  closedById?: string;
  closedReason?: string;
  posterName?: string;
  categoryName?: string;
  field?: Category;
  subcategory?: Skill;
  skills?: Skill[];
  locations?: TaskLocation[];
  poster?: User;
  images?: string[];
  postType?: 'RECRUITMENT' | 'SERVICE_OFFER';
  workMode?: 'ONSITE' | 'REMOTE' | 'NEGOTIABLE';
  salaryUnit?: 'PER_JOB' | 'PER_HOUR' | 'PER_DAY' | 'PER_MONTH';
  employmentType?: 'ONE_TIME' | 'PART_TIME' | 'FULL_TIME' | 'CONTRACT' | 'FREELANCE' | 'SHIFT' | 'INTERNSHIP' | 'NEGOTIABLE';
  peopleNeeded?: number | null;
  contactPhone?: string | null;
  startDate?: string | null;
  experienceLevel?: string;
  educationLevel?: string;
  genderRequirement?: string;
  minAge?: number | null;
  maxAge?: number | null;
  minHeightCm?: number | null;
  maxHeightCm?: number | null;
  hashtags?: string[];
  assignedWorker?: {
    id: string;
    name: string;
    avatarUrl?: string;
    phone?: string;
    assignmentId: string;
    status: string;
    assignedAt?: string;
    bidPrice?: number | null;
    estimatedTime?: string;
    message?: string;
  } | null;
  isSaved?: boolean;
  savedAt?: string;
}

export interface Skill {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export interface TaskLocation {
  id: string;
  taskId: string;
  locationType: string;
  address: string;
  lat: number;
  lng: number;
}

export interface TaskApplication {
  id: string;
  taskId: string;
  taskerId: string;
  bidPrice: number;
  estimatedTime: string;
  message?: string;
  status: ApplicationStatus;
  createdAt: string;
  taskerName?: string;
  taskerAvatar?: string;
  taskerRating?: number;
  score?: number;
  taskTitle?: string;
  taskStatus?: string;
  taskPostType?: string;
  taskSalaryUnit?: string;
  assignmentId?: string;
  assignmentStatus?: string;
}

export interface AssignedTask {
  id: string;
  taskId: string;
  taskerId: string;
  applicationId: string;
  assignedBy: 'POSTER' | 'SYSTEM' | 'ADMIN';
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  availableBalance: number;
  lockedBalance: number;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'ESCROW_HOLD' | 'ESCROW_RELEASE' | 'REFUND' | 'PLATFORM_FEE';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface Escrow {
  id: string;
  taskId: string;
  posterId: string;
  taskerId: string;
  amount: number;
  platformFeeAmount: number;
  insuranceFeeAmount: number;
  status: 'HOLDING' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  createdAt: string;
  updatedAt: string;
}

export interface TaskerProfile {
  id: string;
  userId: string;
  bio?: string;
  experience?: string;
  portfolioUrl?: string;
  locationText?: string;
  lat?: number;
  lng?: number;
  averageRating: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type BannerActionType = 'CATEGORY' | 'EXTERNAL_URL' | 'NONE';

export interface HomeBannerCategory {
  id: string;
  code?: string;
  name: string;
}

export interface HomeBannerAction {
  type: BannerActionType;
  value: string | null;
}

export interface HomeBanner {
  id: string;
  code: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  category: HomeBannerCategory | null;
  action: HomeBannerAction;
  displayOrder: number;
}
