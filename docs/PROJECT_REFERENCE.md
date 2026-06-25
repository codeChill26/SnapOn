# SnapOn — Project Reference

> Platform kết nối người thuê (hirer) và người nhận việc (worker)
> Backend: Express + PostgreSQL (Supabase)  
> Mobile: Expo (React Native)  
> Web: React + Vite + Tailwind

---

## 1. Tổng Quan Kiến Trúc

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Mobile App    │────▶│   Backend API    │────▶│  Supabase      │
│  (Expo / RN)    │     │  (Express 4.21)  │     │  PostgreSQL    │
│                 │◀────│  Port 3000/       
                            https://snapon.onrender.com
│◀────│                │
├─────────────────┤     ├──────────────────┤     └────────────────┘
│  Frontend Web   │────▶│  Socket.io 4.8   │     ┌────────────────┐
│  (Vite + React) │     │  (real-time)     │────▶│  Cloudinary    │
│  Port 5173      │◀────│                  │     │  (images)      │
└─────────────────┘     └──────────────────┘     ├────────────────┤      │  PayOS         │
                        │  (payment)     │
                        ├────────────────┤
                        │  Firebase Auth │
                        └────────────────┘
```

---

## 2. Backend

### 2.1 Tech Stack
- **Runtime:** Node.js, Express 4.21
- **Database:** PostgreSQL via Supabase (connection pooling)
- **ORM:** Prisma 5.22 (schema management)
- **Auth:** Firebase Admin SDK (token verification) + dev bypass (x-user-id header)
- **Real-time:** Socket.io 4.8
- **Payment:** PayOS (Vietnam payment gateway)
- **File Storage:** Cloudinary (images)
- **Fee:** 10% platform fee (configurable via `PLATFORM_FEE_RATE`)

### 2.2 File Structure

```
backend/
├── app.js                  # Entry point: Express + Socket.io setup
├── .env                    # DB, Firebase, PayOS, Cloudinary config
├── package.json
├── config/
│   ├── db.js               # pg Pool (Supabase)
│   ├── swagger.js          # Swagger JSDoc setup
│   ├── swagger-docs.js     # API annotations
│   ├── firebaseAdmin.js    # Firebase Admin SDK init
│   └── payos.js            # PayOS client init (with mock fallback)
├── controllers/            # 16 controllers (request handlers)
├── routes/                 # 16 route files
├── services/               # Business logic (matching, escrow, notification)
├── models/                 # DB query wrappers (raw SQL via pg)
├── middleware/
│   ├── auth.js             # Firebase token verification OR dev bypass
│   ├── socketAuth.js       # Socket.io auth middleware
│   └── validate.js         # express-validator error handler
├── validators/             # express-validator schemas
├── utils/                  # Helpers, response handler, constants
├── scripts/                # DB scripts (seed, ping, banners)
└── prisma/schema.prisma    # 20+ models
```

### 2.3 API Endpoints

#### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/sync-user` | Sync Firebase user to DB |
| POST | `/auth/login` | Email/password login |
| POST | `/auth/register` | Register new user |

#### Users (`/api/users`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me/profile` | Get own profile |
| PATCH | `/users/me/profile` | Update own profile |
| GET | `/users/:id/profile` | Get public profile |
| GET | `/users/:id/profile/posts` | Get user's posts |
| GET | `/users/search/phone` | Search user by phone |

#### Tasks (`/api/tasks`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | List tasks (filters + pagination) |
| GET | `/tasks/my-tasks` | Current user's tasks |
| POST | `/tasks` | Create task |
| GET | `/tasks/:id` | Get task detail |
| PATCH | `/tasks/:id` | Update task |
| PATCH | `/tasks/:id/status` | Update status (COMPLETED/CANCELLED) — **có escrow release/refund** |
| DELETE | `/tasks/:id` | Delete task |
| POST | `/tasks/:id/close-recruitment` | Close recruitment |
| POST | `/tasks/upload-images` | Upload images (Base64 → Cloudinary) |
| POST | `/tasks/:id/save` | Save task |
| DELETE | `/tasks/:id/save` | Unsave task |

#### Applications (`/api/applications`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/tasks/:id/applications` | Worker applies (bid) |
| GET | `/tasks/:id/applications` | List applications for task |
| GET | `/applications/my-applications` | Worker's applications |
| PATCH | `/applications/:id/status` | **Accept/Reject applicant — có escrow hold** |
| PATCH | `/applications/:id/withdraw` | Worker withdraws |
| PATCH | `/applications/:id` | Update application |
| DELETE | `/applications/:id` | Delete application |
| GET | `/tasks/:id/my-application` | Worker's application for task |

#### Assignments (`/api/assignments`)
| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/assignments/:id/accept` | Worker accepts job |
| PATCH | `/assignments/:id/decline` | Worker declines |
| PATCH | `/assignments/:id/complete` | **Poster completes — ĐÃ SỬA: thêm escrow release** |
| PATCH | `/assignments/:id/cancel` | **Poster cancels — ĐÃ SỬA: thêm escrow refund** |

#### Matching (`/api/tasks/:id`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/tasks/:id/auto-match` | AI auto-match (có escrow hold) |
| POST | `/tasks/:id/manual-match` | Poster picks worker (có escrow hold) |
| GET | `/tasks/:id/ranked-applications` | AI-ranked applicant list |

#### Wallet (`/api/wallet`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/wallet/me` | Get wallet summary |
| GET | `/wallet/transactions` | List transactions (cursor pagination) |
| POST | `/wallet/topup/mock` | Dev topup |
| POST | `/wallet/topup/payos/create` | Create PayOS payment link (Web) |
| POST | `/wallet/topup/payos` | Create PayOS payment link (Mobile) |
| POST | `/wallet/topup/payos/confirm` | Confirm PayOS payment (Mobile) |
| POST | `/wallet/topup/payos/webhook` | PayOS webhook (Web) |
| GET | `/wallet/topup/payos/status/:orderCode` | Check payment status |
| POST | `/wallet/withdraw` | Withdraw to bank |

#### Escrow (`/api/escrows`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/escrows/me` | List user's escrows |
| GET | `/escrows/:taskId` | Get escrow by task |
| DELETE | `/escrows/:taskId` | Delete escrow (only HOLDING) |

#### Chat (`/api/chat`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/chat/conversations` | List conversations |
| POST | `/chat/conversations` | Create conversation |
| GET | `/chat/conversations/:id/messages` | Get messages (cursor) |
| POST | `/chat/conversations/:id/messages` | Send message |
| PATCH | `/chat/conversations/:id/read` | Mark as read |
| POST | `/chat/messages/:id/image` | Upload chat image |

#### Banners (`/api/banners`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/banners/home` | Get home banners (sorted) |
| POST | `/banners` | Create banner (admin) |
| PATCH | `/banners/:id` | Update banner (admin) |
| DELETE | `/banners/:id` | Delete banner (admin) |

#### Categories (`/api/categories`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories` | List all categories |

#### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api-docs` | Swagger UI |
| GET | `/api/health` | Health check |

### 2.4 Database Schema (Key Tables)

```
wallets
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── balance (DECIMAL 12,2)       # Tổng số dư
├── available_balance (DECIMAL)   # Số dư khả dụng
└── locked_balance (DECIMAL)      # Số dư đang khóa (escrow)

escrows
├── id (UUID, PK)
├── task_id, poster_id, tasker_id
├── amount, platform_fee_amount, insurance_fee_amount
└── status: HOLDING | RELEASED | REFUNDED | DISPUTED

wallet_transactions
├── id (UUID, PK)
├── wallet_id (FK)
├── type: DEPOSIT | WITHDRAW | ESCROW_HOLD | ESCROW_RELEASE | REFUND | PLATFORM_FEE
├── amount
├── status: PENDING | SUCCESS | FAILED | CANCELLED
└── reference_id (nullable, links to escrow.id)

tasks
├── status: OPEN | IN_PROGRESS | COMPLETED | CANCELLED
├── budget_min, budget_max, final_price
├── post_type: RECRUITMENT | SERVICE_OFFER
└── people_needed (default 1)

task_applications
├── status: PENDING | ACCEPTED | REJECTED | WITHDRAWN
├── bid_price, estimated_time, message
└── tasker_id (FK → users)

assigned_tasks
├── status: ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED
├── task_id, tasker_id, application_id
└── assigned_by: MANUAL | AUTO_MATCH
```

### 2.5 Escrow Flow (Payment)

```
Poster chọn tasker (ACCEPT)
└── escrowService.holdForMatch()
    ├── Tạo escrow (status: HOLDING)
    ├── available_balance -= amount
    ├── locked_balance += amount
    └── wallet_transaction (type: ESCROW_HOLD, status: PENDING)

Poster xác nhận hoàn thành (COMPLETE)
└── escrowService.releaseForTask()
    ├── locked_balance -= amount (poster)
    ├── balance -= amount (poster)
    ├── available_balance += net (tasker, net = amount - fee)
    ├── balance += net (tasker)
    ├── escrow → RELEASED
    └── wallet_transactions → SUCCESS

Poster hủy (CANCEL)
└── escrowService.refundForTask()
    ├── locked_balance -= amount (poster)
    ├── available_balance += amount (poster)
    ├── escrow → REFUNDED
    └── wallet_transactions → CANCELLED + REFUND
```

---

## 3. Mobile App

### 3.1 Tech Stack
- Expo SDK 54 + React Native 0.81.5
- React Navigation 7
- Axios + Socket.io Client
- Firebase (Auth)
- react-native-maps
- react-native-reanimated

### 3.2 File Structure

```
mobile/
├── App.tsx                 # Root: AuthProvider → AppProvider → AppNavigator
├── index.js                # registerRootComponent
├── app.json                # Expo config
├── eas.json                # EAS build config
├── package.json
├── src/
│   ├── constants/
│   │   ├── config.ts       # API URLs, Firebase keys, matching weights
│   │   ├── colors.ts       # Color palette
│   │   ├── categories.ts   # Category definitions
│   │   └── jobCategories.ts # 20+ job fields with subcategories (VN)
│   ├── types/
│   │   ├── index.ts        # All interfaces (Task, Wallet, User, etc.)
│   │   └── activity.ts     # Activity types
│   ├── theme/              # Design system (colors, typography, spacing, shadows, radius)
│   ├── utils/
│   │   ├── storage.ts      # AsyncStorage wrapper
│   │   └── format.ts       # Currency + image URL formatting
│   ├── services/           # 16 API service files
│   ├── context/
│   │   ├── AuthContext.tsx  # Auth state + socket push registration
│   │   └── AppContext.tsx   # App state (tasks, wallet, role)
│   ├── navigation/
│   │   ├── AppNavigator.tsx    # Root navigator (auth-gated)
│   │   ├── MainTabNavigator.tsx # 5 bottom tabs (role-based)
│   │   ├── AuthNavigator.tsx   # Login/Register stack
│   │   └── AdminStack.tsx      # Admin tabs (mock)
│   ├── screens/            # 17 screens
│   │   ├── auth/           # Login, Register
│   │   ├── home/           # HomeScreen (marketplace)
│   │   ├── jobDetail/      # JobDetailScreen, ApplicantListScreen
│   │   ├── postJob/        # PostJobScreen
│   │   ├── activity/       # ActivityScreen
│   │   ├── chat/           # ChatListScreen, ChatDetailScreen
│   │   ├── profile/        # ProfileScreen, AccountSettingsScreen
│   │   ├── saved/          # SavedJobsScreen
│   │   ├── wallet/         # WalletScreen (balance, topup, history)
│   │   ├── worker/         # WorkerDashboardScreen
│   │   └── admin/          # AdminDashboardScreen, AdminJobsScreen, AdminUsersScreen
│   └── components/         # 38 reusable components
│       ├── activity/       # ActivityListSkeleton, PostedActivityCard, ParticipatingActivityCard
│       ├── categories/     # CategoryPickerModal
│       ├── common/         # LoadingSpinner, EmptyState, JobCard, UserAvatar, etc.
│       ├── home/           # HomeBannerCarousel, HomeCompactJobCard, HomeTheme, etc.
│       ├── job-detail/     # ApplyConfirmationModal, CloseRecruitmentModal
│       ├── profile/        # ProfileHeader, ProfilePostGrid, EditProfileModal, etc.
│       └── ui/             # Badge, Button, Card, Input, Modal, Tabs
```

### 3.3 Service Layer (16 files)

| File | Key Functions | Endpoints |
|------|--------------|-----------|
| `api.ts` | Axios instance + interceptors | — |
| `authService.ts` | loginWithEmail, syncUser, searchUserByPhone | Auth endpoints |
| `taskService.ts` | getTasks, getTaskById, createTask, completeTask, saveTask | `/api/tasks/*` |
| `applicationService.ts` | createApplication, updateApplicationStatus, acceptAssignment, completeAssignment | `/api/applications/*`, `/api/assignments/*` |
| `matchingService.ts` | getRankedApplications, autoMatch, manualMatch | `/api/tasks/*/match` |
| `walletService.ts` | getMyWallet, getTransactions, createPayOSPayment | `/api/wallet/*` |
| `escrowService.ts` | getMyEscrows, getEscrowByTaskId | `/api/escrows/*` |
| `chatService.ts` | getConversations, getMessages, sendMessage, startConversation | `/api/chat/*` |
| `socketService.ts` | connect, disconnect, on/off event handlers | WebSocket |
| `notificationService.ts` | registerDevice, getNotifications, markAsRead | Notification endpoints |
| `activityService.ts` | getPostedActivities, getParticipatingActivities | Task/user endpoints |
| `profileService.ts` | getProfile, updateProfile, uploadAvatar, getPublicProfile | `/api/users/*` |
| `bannerService.ts` | getHomeBanners | `/api/banners/home` |
| `categoryService.ts` | getFields, getCategoriesTree | `/api/categories` |
| `firebase.ts` | Firebase app init | — |

### 3.4 Navigation Structure

```
AppNavigator
├── AuthNavigator (when !isAuthenticated)
│   ├── LoginScreen
│   └── RegisterScreen
├── MainTabNavigator (when isAuthenticated, role !== admin)
│   ├── HomeScreen (house icon)
│   ├── PostJobScreen (add-circle icon) — hidden for workers
│   ├── ChatListScreen (chatbubbles icon) — hidden for admins
│   ├── ActivityScreen (pulse icon)
│   └── ProfileScreen (person icon)
├── AdminStack (when role === admin)
│   ├── AdminDashboardScreen
│   ├── AdminJobsScreen
│   └── AdminUsersScreen
└── Stack screens (modal)
    ├── JobDetailScreen
    ├── ApplicantListScreen
    ├── WalletScreen
    ├── ChatDetailScreen
    ├── PublicProfileScreen
    ├── AccountSettingsScreen
    └── SavedJobsScreen
```

### 3.5 Key Features (Mobile)

#### ✅ Hoàn thành
- **Auth:** Login/Register (email + Google), Firebase sync
- **Home:** Marketplace với banner carousel, search, filter, 2-column grid, bookmark, pull-to-refresh
- **Job Detail:** Xem chi tiết, apply (worker), close recruitment (poster)
- **Applicant List:** Xem + sắp xếp ứng viên theo AI score, accept/reject
- **Post Job:** Multi-step form với map picker, image upload, category/budget/skills
- **Chat:** Full chat với image, real-time socket, draft, read receipts, media gallery
- **Activity:** Posted/Participating tabs, status filter, search
- **Profile:** View/edit profile, stats, posts grid, reviews
- **Wallet:** Balance (available/total/locked), top-up via PayOS, transaction history
- **Worker Dashboard:** Status toggle, radius filter, task list
- **AI Matching:** Score-based applicant ranking (price/rating/distance/completion/response)
- **Push Notifications:** Expo push token registration
- **Dark Mode:** Full dark theme support

#### ❌ Chưa có / Cần hoàn thiện
- **Admin screens:** Mock data — chưa kết nối API thật
- **Escrow service:** `getMyEscrows`, `getEscrowByTaskId` — chưa được gắn vào screen nào
- **autoMatch/manualMatch:** Service có nhưng chưa screen nào gọi (mobile dùng `applicationService.updateApplicationStatus` thay thế)

---

## 4. Frontend Web

### 4.1 Tech Stack
- Vite 6 + React 19 + TypeScript
- Tailwind CSS v4
- React Router v7
- 48 Radix UI primitives (shadcn/ui)
- Firebase Auth + Axios
- Leaflet (maps) + Recharts (charts)

### 4.2 File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── context/AppContext.tsx   # Full app state + scoring + API calls
│   │   ├── components/             # Layout, JobCard, WalletModal, MapPicker, etc.
│   │   │   └── ui/                 # 48 shadcn/ui components
│   │   └── pages/                  # 10 pages
│   ├── services/api.ts             # Axios instance
│   ├── imports/firebase.ts         # Firebase init
│   └── styles/                     # CSS variables (light + dark)
├── routes.tsx                      # Router config
├── .env                            # VITE_API_BASE_URL, Firebase config
└── package.json
```

### 4.3 Key Pages

| Page | Route | Description |
|------|-------|-------------|
| LoginPage | `/login` | Firebase auth (email + Google) |
| HomePage | `/` | Job marketplace with filters, search, tabs |
| JobDetailPage | `/jobs/:id` | Full job detail + apply/accept/complete |
| PostJobPage | `/post-job` | Create job form |
| WorkerDashboardPage | `/worker` | Worker dashboard |
| ProfilePage | `/profile/:id?` | User profile + posts |
| ActivityPage | `/activity` | Posted/applied jobs |
| AdminRoot | `/admin` | Admin layout with sidebar |
| AdminDashboardPage | `/admin` | Stats dashboard |
| AdminJobsPage | `/admin/jobs` | Job management |
| AdminUsersPage | `/admin/users` | User management |

### 4.4 Key Features (Web)

- **Full matching flow:** matchJob (manual) + closeBidding (AI auto) — **cả 2 đều gọi escrow hold**
- **Full completion flow:** completeJob gọi `PATCH /tasks/:id/status` — **có escrow release**
- **Wallet modal:** Top-up via PayOS (QR link), withdraw to bank
- **AI scoring:** `scoreApplicants()` — distance 45%, price 35%, rating 20%
- **Admin:** Mock data (dashboard, jobs, users management)
- **Dark/Light mode:** CSS variables + toggle

---

## 5. Luồng Dữ Liệu Quan Trọng

### 5.1 Matching → Escrow → Payment (Full Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ Bước 1: Poster chọn tasker (Mobile: ACCEPT, Web: manual-match) │
├─────────────────────────────────────────────────────────────────┤
│ backend: escrowService.holdForMatch()                           │
│ ├── available_balance -= bid_price                              │
│ └── locked_balance += bid_price                                 │
│ Task status: OPEN (giữ nguyên chờ worker accept)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Bước 2: Worker accept assignment (Mobile/Web)                   │
├─────────────────────────────────────────────────────────────────┤
│ backend: assignmentController.acceptAssignment()                 │
│ ├── assigned_task: ASSIGNED → IN_PROGRESS                       │
│ └── task: OPEN → IN_PROGRESS (nếu đủ số lượng worker)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Bước 3: Poster xác nhận hoàn thành                              │
├─────────────────────────────────────────────────────────────────┤
│ backend: escrowService.releaseForTask()                         │
│ ├── poster.locked_balance -= amount                             │
│ ├── poster.balance -= amount                                    │
│ ├── tasker.available_balance += net (amount - 10% fee)          │
│ ├── tasker.balance += net                                       │
│ └── escrow: HOLDING → RELEASED                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Bước 3b: Poster hủy (cancel)                                    │
├─────────────────────────────────────────────────────────────────┤
│ backend: escrowService.refundForTask()                          │
│ ├── poster.locked_balance -= amount                             │
│ ├── poster.available_balance += amount                          │
│ └── escrow: HOLDING → REFUNDED                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Chat (Real-time)

```
Mobile gửi tin nhắn
├── POST /api/chat/conversations/:id/messages → lưu DB
├── Socket.io emit "message_received" → người nhận (real-time)
└── Người nhận đọc → PATCH /api/chat/conversations/:id/read
    └── Socket.io emit "conversation_read"
```

### 5.3 Wallet Top-up (PayOS)

```
Mobile: Chọn số tiền → POST /wallet/topup/payos
├── Backend tạo payment link PayOS
├── Mobile mở checkoutUrl trong trình duyệt
├── User thanh toán trên PayOS
├── PayOS redirect về returnUrl (backend)
└── Mobile gọi POST /wallet/topup/payos/confirm
    └── Backend verify + cộng tiền vào available_balance
```

---

## 6. Cấu Hình

### 6.1 Backend (.env)

```
PORT=3000
DATABASE_URL=postgresql://...supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...supabase.com:5432/postgres

PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

PLATFORM_FEE_RATE=0.1              # 10%
FRONTEND_URL=http://localhost:5173
```

### 6.2 Mobile (config.ts)

```typescript
const LOCAL_API_URL = 'http://192.168.1.5:3000/api';
const DEPLOYED_API_URL = 'https://snapon.onrender.com/api';

API_BASE_URL: __DEV__ ? LOCAL_API_URL : DEPLOYED_API_URL
```

### 6.3 Frontend (.env)

```
VITE_API_BASE_URL=https://snapon.onrender.com/api
VITE_AUTH_MODE=dev
```

---

## 7. Lịch Sử Fix & Known Issues

### 7.1 Đã fix

| Issue | File | Fix |
|-------|------|-----|
| Git conflict markers | `walletRoutes.js`, `walletController.js` | Resolved merge conflicts |
| `completeAssignment` không release escrow | `assignmentController.js:191-192` | Added `escrowService.releaseForTask()` |
| `cancelAssignment` không refund escrow | `assignmentController.js:263-264` | Added `escrowService.refundForTask()` |
| `taskModel.findById` sai params (truyền client object) | `assignmentController.js:51,164,236` | Removed `, client` arg |
| expo-updates crash on Android | `app.json:5-7` | Added `"updates": { "enabled": false }` |
| Sai IP local trong config | `config.ts` | IP `192.168.1.89` → `192.168.1.5` |
| DEPLOYED_API_URL sai | `config.ts`, `frontend/.env`, `swagger.js` | `snapon-1` → `snapon` |

### 7.2 Còn thiếu / Cần làm

| Issue | Mức độ | Ghi chú |
|-------|--------|---------|
| Admin screens (mobile + web) dùng mock data | Thấp | Cần kết nối API thật |
| `escrowService` mobile chưa gắn vào screen nào | Thấp | Có thể thêm màn hình escrow detail |
| Mobile wallet không tự refresh sau accept | Trung bình | Cần trigger `loadWalletData()` sau khi accept thành công |
| `autoMatch`/`manualMatch` service mobile không được dùng | Thấp | Có thể xoá nếu không cần |
| `react-native-maps` cần Google Maps API key | Trung bình | Cần thay `YOUR_GOOGLE_MAPS_API_KEY` |
| Worker dashboard mobile: tasks chưa load real data | Trung bình | Cần kết nối API |
| Không có cơ chế "tasker confirm completion" 2 bước | Cao | Hiện chỉ poster có quyền complete |
| `withdraw` function trong walletService không tồn tại | Cao | Backend walletService thiếu phương thức `withdraw` |
