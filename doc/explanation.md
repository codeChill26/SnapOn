# Giải thích tổng quan các thay đổi

## 1. Dev/Prod Parity (Chạy được cả local và deploy)

### Vấn đề
- Backend deploy lên Render thiếu Firebase Admin credentials → crash 401
- PayOS thiếu credentials → crash 500
- Frontend hardcode API URL → không gọi được backend deploy

### Giải pháp
- **Firebase**: Backend auto-detect `FIREBASE_PROJECT_ID`, nếu thiếu → dev mode (JWT decode base64, không verify)
- **PayOS**: Backend `config/payos.js` trả về object mock khi thiếu credentials (luôn trả PAID)
- **API URL**: Frontend `api.ts` dùng `import.meta.env.DEV` → localhost:3000, production → Render URL
- **Frontend Firebase**: `firebase.ts` wrap `initializeApp` trong try/catch, exports null nếu thiếu config
- **Auth**: `AppContext.tsx` check `!auth` trước khi gọi `onAuthStateChanged`/`signOut`

## 2. Tính năng mới

### Xoá tài khoản (`DELETE /api/users/profile`)
Soft-delete: set status = BANNED, đổi tên.

### Xoá escrow (`DELETE /api/escrows/:taskId`)
Chỉ poster/tasker được xoá, chỉ khi status = holding.

### Rút tiền (`POST /api/wallet/withdraw`)
Tạo yêu cầu rút: trừ balance, tạo wallet_transaction + withdraw_requests. Frontend có form nhập số tiền, ngân hàng, số tài khoản.

## 3. Xoá toàn bộ Mock Data

Đã xoá:
- `MOCK_WORKERS`, `DEMO_WORKER` — workers ảo
- `INITIAL_JOBS` — job ảo
- `hirerUser`, `adminUser` — user hardcode
- `SLIDES` (Home.tsx) — 11 slide ảo với worker/match time giả
- `TESTIMONIALS` (Home.tsx) — 3 đánh giá ảo
- `simulateApplicants()` — tự động tạo applicant giả
- `revenueTrendData`, `applicationsTrendData` — chart data ảo
- Wallet balance 500000 → 0

Thay bằng fallback rỗng (jobs `[]`, workers `[]`, wallet `0`, user name/email rỗng).

## 4. Bug Fixes

- Duplicate key trong mobile nav → `${path}-${label}`
- Wallet balance sai role → chỉ active role nhận balance thật
- `JSON.parse` không có try/catch → crash app
- Stat counting không chính xác → count từ API
- Đăng nhập không persist → set firebaseUser trong dev mode
- Wallet balance không refresh → gọi fetchProfile sau topup

## 5. Cấu trúc file quan trọng

```
backend/
├── config/payos.js           # PayOS mock khi thiếu credentials
├── middleware/auth.js         # Auto fallback Firebase → dev
├── routes/auth.js             # Dev login/register
├── routes/walletRoutes.js     # POST /withdraw
├── controllers/walletController.js
├── services/walletService.js  # withdraw() với transaction
└── models/escrowModel.js      # deleteByTaskId

frontend/src/
├── services/api.ts            # API URL auto dev/prod
├── imports/firebase.ts        # Graceful fallback
├── app/context/AppContext.tsx  # Xoá mock data, wallet 0
├── app/components/
│   ├── WalletModal.tsx        # Tab rút tiền
│   └── Layout.tsx             # Fix duplicate key
└── app/pages/
    ├── Login.tsx              # Dev mode bypass Firebase
    ├── Home.tsx               # Hero tĩnh, xoá slides/testimonials
    ├── WorkerDashboard.tsx    # Bỏ DEMO_WORKER
    ├── Profile.tsx            # Bỏ DEMO_WORKER
    ├── JobDetail.tsx          # Bỏ DEMO_WORKER
    └── admin/
        ├── UsersManagement.tsx # Fetch users từ API
        └── Dashboard.tsx      # Bỏ chart data ảo
```
