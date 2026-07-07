# BUILD_GUIDE - Xây dựng SnapOn Mobile App từ Web App

## Giới thiệu

Tài liệu này mô tả chi tiết cách tôi đã phân tích và xây dựng ứng dụng **SnapOn Mobile** (React Native) dựa trên mã nguồn web có sẵn tại thư mục `frontend/` và `backend/` ở workspace.

---

## 1. Phân tích dự án web gốc

### Tổng quan
SnapOn là một nền tảng kết nối **người thuê** (hirer) và **người làm** (worker) để thực hiện các công việc như sửa chữa, dọn dẹp, vận chuyển, điện, nước, sơn sửa, làm vườn, công nghệ, gia sư, chăm sóc sức khỏe,...

### Công nghệ sử dụng
| Layer | Công nghệ |
|-------|-----------|
| **Backend** | Node.js + Express + PostgreSQL (raw SQL + Prisma ORM) |
| **Frontend Web** | React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui |
| **Auth** | Firebase Authentication |
| **Map** | Leaflet + OpenStreetMap (Nominatim) |
| **State** | React Context |

### Cấu trúc API
Dựa trên `routes/` và `controllers/` trong backend, tôi xác định các API endpoints chính:

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/sync-user` | Đồng bộ user Firebase |
| GET | `/api/tasks` | Danh sách công việc |
| POST | `/api/tasks` | Tạo công việc mới |
| GET | `/api/tasks/my-tasks` | Công việc của tôi |
| GET | `/api/tasks/:id` | Chi tiết công việc |
| PATCH | `/api/tasks/:id/status` | Cập nhật trạng thái |
| POST | `/api/tasks/:taskId/applications` | Ứng tuyển |
| GET | `/api/tasks/:taskId/applications` | DS ứng viên |
| POST | `/api/tasks/:taskId/auto-match` | Tự động ghép |
| POST | `/api/tasks/:taskId/manual-match` | Ghép thủ công |
| GET | `/api/wallet/me` | Ví của tôi |
| POST | `/api/wallet/topup/mock` | Nạp tiền (dev) |
| GET | `/api/escrows/me` | DS escrow |

### Chức năng Web
Dựa trên các page component, tôi xác định các chức năng:

1. **Home (`/`)** - Danh mục + danh sách việc + hero
2. **Login (`/login`)** - Firebase Auth + Google
3. **PostJob (`/post`)** - Form 3 bước đăng việc
4. **JobDetail (`/job/:id`)** - Chi tiết việc (hirer: DS ứng viên; worker: apply)
5. **WorkerDashboard (`/worker`)** - Map + danh sách việc gần đây
6. **Profile (`/profile`)** - Thông tin cá nhân + thống kê + cài đặt
7. **Activity (`/activity`)** - Lịch sử hoạt động
8. **Admin Dashboard (`/admin/dashboard`)** - Thống kê biểu đồ
9. **Admin Jobs (`/admin/jobs`)** - Quản lý công việc
10. **Admin Users (`/admin/users`)** - Quản lý người dùng

---

## 2. Thiết kế kiến trúc Mobile App

### Cấu trúc thư mục

```
SnapOnMobile/
├── App.tsx                          # Entry point
├── index.js                         # Đăng ký Expo
├── package.json                     # Dependencies
├── app.json                         # Expo config
├── tsconfig.json                    # TypeScript config
├── babel.config.js                  # Babel config
├── BUILD_GUIDE.md                   # Tài liệu này
├── assets/                          # Ảnh, icons
└── src/
    ├── types/index.ts               # Type definitions
    ├── constants/
    │   ├── colors.ts                # Màu sắc (dựa trên theme.css)
    │   ├── config.ts                # Cấu hình (API base, Firebase)
    │   └── categories.ts           # Danh mục (dựa trên web)
    ├── utils/
    │   ├── format.ts                # Format tiền tệ, ngày tháng
    │   └── storage.ts               # AsyncStorage wrapper
    ├── services/
    │   ├── api.ts                   # Axios instance + interceptors
    │   ├── authService.ts           # Auth API
    │   ├── taskService.ts           # Task CRUD API
    │   ├── applicationService.ts    # Application API
    │   ├── walletService.ts         # Wallet API
    │   ├── matchingService.ts       # Matching API
    │   └── escrowService.ts         # Escrow API
    ├── context/
    │   ├── AuthContext.tsx           # Auth state management
    │   └── AppContext.tsx            # App state management
    ├── components/
    │   ├── ui/                      # UI primitives (Button, Input, Card,...)
    │   └── common/                  # Shared components (JobCard, CategoryGrid,...)
    ├── navigation/
    │   ├── AppNavigator.tsx         # Root navigator
    │   ├── AuthNavigator.tsx        # Auth stack
    │   ├── MainTabNavigator.tsx     # Main tabs (hirer/worker)
    │   └── AdminStack.tsx           # Admin tabs
    └── screens/
        ├── auth/                    # Login, Register
        ├── home/                    # HomeScreen
        ├── postJob/                 # PostJobScreen (3-step form)
        ├── jobDetail/               # JobDetailScreen, ApplicantListScreen
        ├── worker/                  # WorkerDashboardScreen
        ├── profile/                 # ProfileScreen
        ├── activity/                # ActivityScreen
        ├── wallet/                  # WalletScreen
        └── admin/                   # AdminDashboard, AdminJobs, AdminUsers
```

### Nguyên tắc chuyển đổi từ Web sang Mobile

| Web | Mobile | Ghi chú |
|-----|--------|---------|
| Tailwind CSS | StyleSheet API | Chuyển utility classes thành StyleSheet objects |
| shadcn/ui components | Custom UI components | Xây dựng lại bằng React Native (Button, Input, Card, Badge, Modal, Tabs) |
| React Router | React Navigation | `createBrowserRouter` → `@react-navigation/native-stack` + `bottom-tabs` |
| Context | Context | Giữ nguyên pattern nhưng điều chỉnh cho mobile |
| Leaflet Map | react-native-maps | Thay đổi hoàn toàn do khác platform |
| Lucide icons | Emoji text | Dùng emoji làm icon tạm thời (có thể thay thế bằng react-native-vector-icons sau) |
| Axios | Axios | Giữ nguyên, chỉ thêm AsyncStorage interceptor |
| localStorage | AsyncStorage | Thay thế tương ứng |

---

## 3. Chi tiết từng bước xây dựng

### Bước 1: Tạo project config
- `package.json`: Định nghĩa dependencies cho Expo, React Navigation, Axios, Firebase,...
- `app.json`: Cấu hình Expo app (tên, icon, splash, permissions)
- `tsconfig.json`: TypeScript với path alias (`@/` → `src/`)
- `babel.config.js`: Babel + Reanimated plugin

### Bước 2: Types & Constants
- **`types/index.ts`**: Dịch TypeScript types từ web (User, Task, TaskApplication, Wallet, Escrow,...)
- **`constants/colors.ts`**: Chuyển Tailwind colors từ `theme.css` và Tailwind config sang Color object
- **`constants/config.ts`**: API_BASE_URL, Firebase config, PAGINATION, PLATFORM_FEE_RATE
- **`constants/categories.ts`**: Dịch CATEGORIES từ `AppContext.tsx` web (11 categories)

### Bước 3: Utils
- **`format.ts`**: `formatCurrency` (vi-VN), `formatDate`, `formatRelativeTime`, `formatTimeRemaining`, `getStatusLabel`, `truncateText`
- **`storage.ts`**: AsyncStorage wrapper với các key (token, user, wallet, role)

### Bước 4: API Service Layer
Dựa vào các route files trong `backend/routes/`:
- **`api.ts`**: Axios instance với interceptors (gắn Bearer token, handle 401)
- **`authService.ts`**: `syncUser()`, `getProfile()`
- **`taskService.ts`**: `getTasks()`, `getMyTasks()`, `getTaskById()`, `createTask()`, `updateTaskStatus()`
- **`applicationService.ts`**: `createApplication()`, `getApplicationsByTask()`, `withdrawApplication()`
- **`walletService.ts`**: `getMyWallet()`, `getTransactions()`, `topupMock()`
- **`matchingService.ts`**: `getRankedApplications()`, `autoMatch()`, `manualMatch()`
- **`escrowService.ts`**: `getMyEscrows()`, `getEscrowByTaskId()`

### Bước 5: Context
- **`AuthContext.tsx`**: Quản lý auth state (login/logout/switchRole), sử dụng AsyncStorage để persist
- **`AppContext.tsx`**: Quản lý app state (tasks, applications, wallet), lấy user role từ AuthContext

### Bước 6: UI Components
- **ui/Button, Input, Card, Badge, Modal, Tabs**: UI primitives dạng React Native, style riêng
- **common/JobCard**: Card hiển thị công việc (category, title, price, deadline)
- **common/CategoryGrid**: Grid danh mục 3 cột
- **common/CountdownTimer**: Đếm ngược thời gian
- **common/UserAvatar**: Avatar với initials fallback
- **common/LoadingSpinner, EmptyState**: Loading/empty states

### Bước 7: Navigation
- **AppNavigator**: Root stack, check auth → Auth stack hoặc Main/Admin tabs
- **AuthNavigator**: Login → Register
- **MainTabNavigator**: Bottom tabs (Home, PostJob/WorkerDashboard, Activity, Profile) - thay đổi theo role
- **AdminStack**: Bottom tabs (Dashboard, Jobs, Users)

### Bước 8: Screens (chuyển từ pages web)

| Screen | Từ web page | Điều chỉnh cho mobile |
|--------|-------------|----------------------|
| LoginScreen | `Login.tsx` | Bỏ tab switch (tách riêng RegisterScreen), dùng Input/Button component |
| HomeScreen | `Home.tsx` | Header gradient + search + category grid + job list (ScrollView thay vì flex layout) |
| PostJobScreen | `PostJob.tsx` | Form 3 bước với navigation giữa các step, preset price chips |
| JobDetailScreen | `JobDetail.tsx` | Dual view (hirer/worker), countdown timer, bid input |
| ApplicantListScreen | `JobDetail.tsx` (applicant section) | Danh sách ứng viên có score, chọn và match |
| WorkerDashboardScreen | `WorkerDashboard.tsx` | Status toggle, radius filter, job list |
| ProfileScreen | `Profile.tsx` | Tabs (Overview, Stats, Settings), role switch, logout |
| ActivityScreen | `Activity.tsx` | Tabs (Mine/Community), status filter chips |
| WalletScreen | `WalletModal.tsx` | Balance display, preset topup amounts, transaction history |
| AdminDashboard | Admin `Dashboard.tsx` | Stat cards, recent jobs, quick stats |
| AdminJobs | Admin `JobsManagement.tsx` | Search, filter, job list |
| AdminUsers | Admin `UsersManagement.tsx` | Search, role tabs, user cards |

---

## 4. Kết nối với Backend

App mobile gọi API từ `backend/` thông qua Axios service layer:

```
React Native App
    ↓
Axios Instance (src/services/api.ts)
    ↓ (interceptor: attach Bearer token from AsyncStorage)
http://localhost:3000/api/*
    ↓
Express Backend
    ↓
PostgreSQL Database
```

### Cấu hình kết nối
- API Base URL: Lấy động dựa trên `API_BASE_URL` trong `mobile/src/utils/backendDetector.ts` (thử nghiệm local IP trước, fallback sang URL production trên Render).
- Auth: Xác thực qua Firebase ID Token hoặc Phone OTP để nhận backend JWT (accessToken, refreshToken) -> Gắn JWT vào header `Authorization: Bearer <token>` của tất cả API requests.

---

## 5. Các quyết định kỹ thuật

### 5.1. Tại sao dùng Expo?
- Dễ setup, không cần cấu hình native
- Hỗ trợ OTA updates
- Tích hợp sẵn location, secure store
- Dễ dàng build cho cả iOS và Android

### 5.2. Tại sao dùng React Navigation?
- Tiêu chuẩn cho React Native
- Hỗ trợ stack + bottom tabs + nesting
- TypeScript support tốt

### 5.3. Tại sao giữ nguyên Axios?
- Backend web cũng dùng Axios
- Dễ maintain, interceptors cho auth token
- Quen thuộc với team

### 5.4. Tại sao dùng Emoji thay vì icon library?
- Tránh dependency phức tạp lúc đầu
- Có thể thay thế bằng `react-native-vector-icons` hoặc `expo-icons` sau
- Giảm dung lượng app

---

## 6. Hướng dẫn chạy

```bash
# 1. Cài dependencies
cd SnapOnMobile
npm install

# 2. Start Expo
npx expo start

# 3. Chạy trên thiết bị
#   - Scan QR code với Expo Go app
#   - Hoặc nhấn 'a' cho Android, 'i' cho iOS
```

### Yêu cầu
- Node.js >= 18
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app trên điện thoại (hoặc giả lập)

---

## 7. Lưu ý khi phát triển

1. **Firebase Auth**: Cần cấu hình Firebase project với Android/iOS app
2. **Google Maps**: Cần API key cho `react-native-maps` trên Android
3. **API URL**: Backend phải chạy trên cùng network (không dùng localhost nếu chạy trên thiết bị thật)
4. **Mock data**: Web dùng mock data trong AppContext, mobile gọi API thật
5. **File `.env`**: Copy từ backend `.env` hoặc tạo `.env` riêng cho mobile

---

## 8. Kết luận

SnapOn Mobile App được xây dựng dựa trên phân tích chi tiết toàn bộ codebase web (cả frontend và backend). Cấu trúc thư mục được tổ chức rõ ràng, tách biệt hoàn toàn với code web gốc. App sử dụng đúng API endpoints từ backend, UI được thiết kế lại phù hợp với mobile platform trong khi vẫn giữ nguyên logic nghiệp vụ.
