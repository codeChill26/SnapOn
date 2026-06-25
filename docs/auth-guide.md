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

## Chế độ Dev Mode (khi không có Firebase)

### Khi nào dùng?

- **Local development**: Không cần Firebase credentials, chạy backend ở chế độ dev
- **Deploy lên Render mà chưa có Firebase Admin**: Tự động fallback

### Cơ chế auto-fallback

Trong file `backend/middleware/auth.js`:

```
1. Kiểm tra biến môi trường: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
2. Nếu AUTH_MODE=firebase (default) mà thiếu credentials → tự động chuyển AUTH_MODE=dev
3. Nếu AUTH_MODE=firebase mà init Firebase Admin thất bại → tự động chuyển AUTH_MODE=dev
```

### Luồng hoạt động Dev Mode

```
┌─────────────────────────┐       ┌────────────────────┐       ┌──────────────┐
│   Frontend              │       │  Backend (Dev Mode) │       │  Database    │
│   VITE_AUTH_MODE=dev    │       │  AUTH_MODE=dev      │       │  (PostgreSQL)│
└───────────┬─────────────┘       └──────────┬─────────┘       └──────┬───────┘
            │                               │                         │
            │  Option A: Login bằng email    │                         │
            │  POST /auth/dev/login          │                         │
            │  { email }                    ├────► SELECT * FROM users │
            │                               │       WHERE email = ?   │
            │◄──── { user, token: user.id } ─┤                         │
            │                               │                         │
            │  Option B: Sync-user (Firebase │                         │
            │  frontend vẫn dùng)            │                         │
            │  POST /auth/sync-user          │                         │
            │  { firebaseToken: JWT }       ├────► Decode JWT payload │
            │       (JWT decode base64,      │       (không verify)   │
            │        không verify)           │                         │
            │◄──── { user, wallet } ────────┤                         │
            │                               │                         │
            │  Các request sau:              │                         │
            │  x-user-id: <user-uuid>       ├────► SELECT * FROM users │
            │       hoặc Bearer <user-uuid>  │       WHERE id = ?     │
            │◄──── 200 OK ──────────────────┤                         │
```

### Cách dùng Dev Mode

**Frontend** (.env):
```
VITE_AUTH_MODE=dev
```

**Backend** (.env): Không set biến Firebase là tự động dev mode, hoặc set:
```
AUTH_MODE=dev
```

**Truy cập API trong dev mode**:
- Header `x-user-id: <user-uuid>` (ưu tiên)
- Hoặc `Authorization: Bearer <user-uuid>` (fallback)
- Khi login lần đầu: `POST /api/auth/dev/login` với body `{ email }`

---

## Deploy lên Production

### Render (Backend)

**Cần set các biến môi trường**:

| Variable | Required | Mô tả |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_MODE` | ❌ | `firebase` (default) hoặc `dev` |
| `FIREBASE_PROJECT_ID` | ⚠️ Nếu dùng Firebase | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | ⚠️ Nếu dùng Firebase | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | ⚠️ Nếu dùng Firebase | Firebase private key (thay `\n` bằng xuống dòng) |
| `PAYOS_CLIENT_ID` | ⚠️ Nếu dùng PayOS | PayOS client ID |
| `PAYOS_API_KEY` | ⚠️ Nếu dùng PayOS | PayOS API key |
| `PAYOS_CHECKSUM_KEY` | ⚠️ Nếu dùng PayOS | PayOS checksum key |
| `FRONTEND_URL` | ❌ | URL frontend (cho PayOS return/cancel URL) |
| `PORT` | ❌ | Port (Render tự set) |

**Lưu ý quan trọng khi deploy backend lên Render**:

1. **Không có Firebase Admin?** Không sao — hệ thống tự động fallback sang dev mode. User vẫn login được qua frontend Firebase Client SDK (browser gọi trực tiếp Firebase servers), backend decode JWT payload (không verify) để tạo user trong DB.

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
| `VITE_AUTH_MODE` | ❌ | `firebase` (default) hoặc `dev` |
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
4. **VITE_AUTH_MODE**: Nếu để `dev`, frontend sẽ gọi `/auth/dev/login` thay vì Firebase cho login. Nếu frontend vẫn có Firebase Client SDK credentials (`VITE_FIREBASE_*`), user vẫn có thể login bằng Firebase (Google popup) song song.
5. **Firebase bị chặn ở một số quốc gia**: Nếu Firebase không truy cập được từ trình duyệt user, hãy set `VITE_AUTH_MODE=dev` để frontend dùng API backend cho login.

---

## Các API endpoints và auth status

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/auth/sync-user` | ✅ Firebase token | Đồng bộ user từ Firebase |
| POST | `/api/auth/dev/login` | ❌ Public | Login dev mode bằng email |
| POST | `/api/auth/dev/register` | ❌ Public | Register dev mode |
| GET | `/api/users/profile` | ✅ | Lấy profile |
| PUT | `/api/users/profile` | ✅ | Cập nhật profile |
| PUT | `/api/users/role` | ✅ | Đổi role (hirer/tasker) |
| DELETE | `/api/users/profile` | ✅ | Xoá tài khoản (soft-delete) |
| GET/POST | `/api/tasks/**` | ✅ | CRUD tasks |
| DELETE | `/api/tasks/:id` | ✅ | Xoá task |
| POST/PATCH | `/api/**/applications/**` | ✅ | CRUD applications |
| DELETE | `/api/applications/:id` | ✅ | Xoá application |
| GET | `/api/escrows/me` | ✅ | Danh sách escrow |
| GET | `/api/escrows/:taskId` | ✅ | Chi tiết escrow |
| DELETE | `/api/escrows/:taskId` | ✅ | Xoá escrow |
| GET/POST | `/api/wallet/**` | ✅ | Wallet operations |
| POST | `/api/wallet/topup/payos/webhook` | ❌ Public | PayOS webhook callback |
| `GET /api/health`, `GET /` | ❌ Public | Health check, API info |

---

## Xử lý lỗi thường gặp

### 1. 401 khi gọi API

**Nguyên nhân**: Token hết hạn hoặc không hợp lệ.

**Cách fix**:
- Dev mode: Kiểm tra `x-user-id` header hoặc Bearer token có đúng UUID không
- Firebase mode: User logout/login lại để có token mới

### 2. 500 PayOS "create payment"

**Nguyên nhân**: Thiếu PayOS credentials.

**Cách fix**: Set biến môi trường `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`. Hoặc không cần fix — mock PayOS đã được cài đặt, thanh toán sẽ tự động thành công (PAID) trong môi trường thiếu credentials.

### 3. Frontend không gọi được backend

**Nguyên nhân**: CORS hoặc sai URL.

**Cách fix**:
- Kiểm tra `VITE_API_BASE_URL` trong frontend .env
- Kiểm tra backend CORS config
- Dùng browser DevTools → Network tab để xem request thực tế
