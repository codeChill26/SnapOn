# Hướng dẫn Authentication — SnapOn

## Firebase hoạt động thế nào trong dự án này?

SnapOn dùng **Firebase Authentication** để quản lý đăng nhập/đăng ký. Luồng hoạt động:

```
┌─────────────────────────┐       ┌───────────────────┐       ┌──────────────┐
│   Frontend (Vite+React) │       │  Backend (Express) │       │  Database    │
│                         │       │                    │       │  (PostgreSQL)│
│  Firebase Client SDK    │       │  Firebase Admin SDK │       │              │
│  (Browser)              │       │  (Server)           │       │              │
└───────────┬─────────────┘       └─────────┬──────────┘       └──────┬───────┘
            │                               │                         │
            │  1. signInWithEmailAndPassword │                         │
            ├──────────────────────────────►│                         │
            │     (Firebase Auth servers)   │                         │
            │◄──────────────────────────────┤                         │
            │     Firebase ID Token (JWT)   │                         │
            │                               │                         │
            │  2. POST /auth/sync-user      │                         │
            │     + Authorization: Bearer   │                         │
            │     + { firebaseToken: JWT }  ├────► verifyIdToken()    │
            │                               │◄──── Firebase Admin SDK │
            │                               │                         │
            │                               │  3. UPSERT user + wallet│
            │                               ├────────────────────────►│
            │                               │◄────────────────────────┤
            │◄──── { user, wallet } ────────┤                         │
            │                               │                         │
            │  4. Lưu token → localStorage  │                         │
            │     Mọi request sau đó gửi    │                         │
            │     Authorization: Bearer JWT ├────► verifyIdToken()    │
            │                               │      + tìm user DB     │
```

### Chi tiết các bước:

1. **Frontend**: Dùng Firebase Client SDK (`signInWithEmailAndPassword`, `signInWithPopup` cho Google) để xác thực với Firebase Auth servers. Firebase trả về ID token (JWT).

2. **Sync user**: Frontend gửi JWT lên `POST /api/auth/sync-user`. Backend middleware `middleware/auth.js` gọi `admin.auth().verifyIdToken(token)` để verify token với Firebase Admin SDK.

3. **Upsert user**: Nếu token hợp lệ, route handler tạo mới hoặc cập nhật user trong DB (PostgreSQL), tạo ví (wallet), trả về `{ user, wallet }`.

4. **Các request sau**: Frontend lưu JWT vào `localStorage('firebaseToken')`. Mọi API call đều kèm `Authorization: Bearer <token>`. Backend middleware verify token và tìm user trong DB.

---

## Chế độ Phone OTP Authentication (Xác thực qua điện thoại)

Hệ thống cung cấp cơ chế đăng nhập và đăng ký trực tiếp thông qua số điện thoại và mã OTP (được lưu tạm thời trong Redis). Cơ chế này rất hữu ích cho môi trường chạy thử nghiệm hoặc khi người dùng không sử dụng email/social login qua Firebase.

### Luồng hoạt động Phone OTP

```
┌─────────────────────────┐       ┌────────────────────┐       ┌──────────────┐
│   Client (Web/Mobile)   │       │  Backend           │       │  Database    │
│                         │       │  (Redis Cache)     │       │  (PostgreSQL)│
└───────────┬─────────────┘       └──────────┬─────────┘       └──────┬───────┘
            │                               │                         │
            │  1. Gửi OTP đến số điện thoại  │                         │
            │  POST /auth/send-otp          │                         │
            │  { phone }                    ├────► Sinh OTP và lưu    │
            │                               │      vào Redis Cache    │
            │◄──── OTP (cho dev/debug) ─────┤                         │
            │                               │                         │
            │  2. Xác minh OTP               │                         │
            │  POST /auth/verify-otp        │                         │
            │  { phone, otp }               ├────► So khớp OTP        │
            │                               │      trong Redis        │
            │                               │                         │
            │                               │  3. UPSERT user + wallet│
            │                               ├────────────────────────►│
            │                               │◄────────────────────────┤
            │◄──── { user, accessToken } ───┤                         │
            │                               │                         │
            │  4. Lưu token và sử dụng      │                         │
            │  Authorization: Bearer <JWT>  ├────────────────────────►│
            │                               │      verify JWT         │
```

### Cách dùng Phone OTP:
1. Gửi request tạo mã OTP qua endpoint: `POST /api/auth/send-otp` với body `{ "phone": "0987654321" }`.
2. Trình debug/console log sẽ hiển thị mã OTP đã sinh.
3. Gửi mã OTP xác nhận lên endpoint: `POST /api/auth/verify-otp` với body `{ "phone": "0987654321", "otp": "xxxxxx" }`.
4. Nhận về backend JWT (bao gồm `accessToken` và `refreshToken`). Đưa JWT vào header `Authorization: Bearer <accessToken>` cho tất cả các API requests sau đó.

---

## Deploy lên Production

### Render (Backend)

**Cần set các biến môi trường**:

| Variable | Required | Mô tả |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `FIREBASE_PROJECT_ID` | ⚠️ Nếu dùng Firebase | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | ⚠️ Nếu dùng Firebase | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | ⚠️ Nếu dùng Firebase | Firebase private key (thay `\n` bằng xuống dòng) |
| `PAYOS_CLIENT_ID` | ⚠️ Nếu dùng PayOS | PayOS client ID |
| `PAYOS_API_KEY` | ⚠️ Nếu dùng PayOS | PayOS API key |
| `PAYOS_CHECKSUM_KEY` | ⚠️ Nếu dùng PayOS | PayOS checksum key |
| `FRONTEND_URL` | ❌ | URL frontend (cho PayOS return/cancel URL) |
| `PORT` | ❌ | Port (Render tự set) |

**Lưu ý quan trọng khi deploy backend lên Render**:

1. **Không có Firebase Admin?** Nếu không có Firebase Admin hoặc cấu hình Firebase lỗi, các tính năng email/social login qua Firebase sẽ không khả dụng. Bạn cần sử dụng luồng Phone OTP để đăng nhập/đăng ký.

2. **Không có PayOS?** Hệ thống tự động dùng mock PayOS — trả về checkout URL giả, không gọi PayOS thật. Khi thanh toán, mock PayOS luôn trả về status `PAID`.

3. **Database migration**: Đảm bảo các bảng (users, wallets, wallet_transactions, tasks, escrows, etc.) đã được tạo. Kiểm tra bằng `GET /api/health`.

4. **CORS**: Backend đã cấu hình CORS cho phép mọi origin. Nếu muốn giới hạn, sửa `app.js`:
   ```js
   app.use(cors({ origin: 'https://your-frontend.vercel.app' }));
   ```

### Vercel (Frontend)

**Cần set các biến môi trường**:

| Variable | Required | Mô tả |
|----------|----------|-------|
| `VITE_API_BASE_URL` | ✅ | Backend URL (vd: `https://snapon.onrender.com/api`) |
| `VITE_FIREBASE_API_KEY` | ⚠️ Nếu dùng Firebase | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ⚠️ Nếu dùng Firebase | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | ⚠️ Nếu dùng Firebase | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ⚠️ Nếu dùng Firebase | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ⚠️ Nếu dùng Firebase | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | ⚠️ Nếu dùng Firebase | Firebase app ID |

**Lưu ý quan trọng khi deploy frontend lên Vercel**:

1. **Build command**: `npm run build` (Vite build)
2. **Output directory**: `dist`
3. **SPA fallback**: Thêm `vercel.json` nếu chưa có:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

---

## Các API endpoints và auth status

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/auth/sync-user` | ✅ Firebase token | Đồng bộ user từ Firebase và nhận backend JWT |
| POST | `/api/auth/token-login` | ✅ Firebase token | Đăng nhập bằng Firebase token và nhận backend JWT |
| POST | `/api/auth/send-otp` | ❌ Public | Gửi mã OTP về số điện thoại |
| POST | `/api/auth/verify-otp` | ❌ Public | Xác minh OTP và nhận backend JWT |
| GET | `/api/users/profile` | ✅ JWT | Lấy profile |
| PUT | `/api/users/profile` | ✅ JWT | Cập nhật profile |
| PUT | `/api/users/role` | ✅ JWT | Đổi role (hirer/tasker) |
| DELETE | `/api/users/profile` | ✅ JWT | Xoá tài khoản (soft-delete) |
| GET/POST | `/api/tasks/**` | ✅ JWT | CRUD tasks |
| DELETE | `/api/tasks/:id` | ✅ JWT | Xoá task |
| POST/PATCH | `/api/**/applications/**` | ✅ JWT | CRUD applications |
| DELETE | `/api/applications/:id` | ✅ JWT | Xoá application |
| GET | `/api/escrows/me` | ✅ JWT | Danh sách escrow |
| GET | `/api/escrows/:taskId` | ✅ JWT | Chi tiết escrow |
| DELETE | `/api/escrows/:taskId` | ✅ JWT | Xoá escrow |
| GET/POST | `/api/wallet/**` | ✅ JWT | Wallet operations |
| POST | `/api/wallet/topup/payos/webhook` | ❌ Public | PayOS webhook callback |
| `GET /api/health`, `GET /` | ❌ Public | Health check, API info |

---

## Xử lý lỗi thường gặp

### 1. 401 khi gọi API

**Nguyên nhân**: Backend JWT Token hết hạn hoặc không hợp lệ.

**Cách fix**:
- Người dùng thực hiện đăng nhập lại bằng Firebase hoặc Phone OTP để nhận `accessToken` mới.
- Hệ thống Client tự động thực hiện luồng refresh token qua `POST /api/auth/refresh` bằng `refreshToken`.

### 2. 500 PayOS "create payment"

**Nguyên nhân**: Thiếu PayOS credentials.

**Cách fix**: Set biến môi trường `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`. Hoặc không cần fix — mock PayOS đã được cài đặt, thanh toán sẽ tự động thành công (PAID) trong môi trường thiếu credentials.

### 3. Frontend không gọi được backend

**Nguyên nhân**: CORS hoặc sai URL.

**Cách fix**:
- Kiểm tra `VITE_API_BASE_URL` trong frontend .env
- Kiểm tra backend CORS config
- Dùng browser DevTools → Network tab để xem request thực tế
