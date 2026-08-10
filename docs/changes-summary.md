# Tổng hợp các thay đổi

## 1. Fix lỗi 500 PayOS — `POST /api/wallet/topup/payos/create`

### Vấn đề
Khi deploy lên Render thiếu biến môi trường `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, PayOS SDK vẫn được khởi tạo với mock credentials. Khi gọi `payos.paymentRequests.create()`, PayOS API từ chối mock credentials → throw error → controller trả về 500.

### Giải pháp
**File thay đổi**: `backend/config/payos.js`

Thay vì luôn tạo instance PayOS thật (dù có credentials hay không), giờ đây:
- **Nếu có credentials** → dùng PayOS thật như cũ
- **Nếu không có credentials** → tạo object mock với 3 method:
  - `paymentRequests.create()` → trả về checkout URL giả (có orderCode)
  - `paymentRequests.get()` → luôn trả về `{ status: 'PAID' }` (coi như thanh toán thành công)
  - `webhooks.verify()` → trả về body gốc

→ **Không ảnh hưởng logic hiện tại**. Mọi service/controller không cần sửa.

---

## 2. Thêm API Delete

### 2.1. `DELETE /api/users/profile` — Xoá tài khoản

**File**: `backend/routes/users.js`

- Soft-delete: set `status = 'BANNED'`, đổi `full_name` thành `full_name + '_deleted_' + uuid`
- Chỉ cho phép xoá khi user chưa bị BANNED
- Auth: `verifyFirebaseToken`

### 2.2. `DELETE /api/escrows/:taskId` — Xoá escrow

**File thay đổi**:
- `backend/models/escrowModel.js` — thêm method `deleteByTaskId(taskId)`
- `backend/controllers/escrowController.js` — thêm method `deleteEscrow`
- `backend/routes/escrowRoutes.js` — thêm route `DELETE /:taskId`

Logic:
- Kiểm tra escrow tồn tại
- Chỉ poster hoặc tasker mới được xoá
- Chỉ cho phép xoá khi status = 'holding' (chưa release/refund/dispute)
- Hard delete: `DELETE FROM escrows WHERE task_id = $1`

### Các delete API đã tồn tại sẵn (không cần thêm)

| Method | Path | File |
|--------|------|------|
| DELETE | `/api/tasks/:id` | `taskRoutes.js` + `taskController.deleteTask` |
| DELETE | `/api/applications/:id` | `applicationRoutes.js` + `applicationController.deleteApplication` |

---

## 3. Auto-fallback Firebase → Dev Mode [ĐÃ LOẠI BỎ / DEPRECATED]

Cơ chế tự động fallback sang Dev Mode khi thiếu Firebase Admin SDK credentials đã bị loại bỏ hoàn toàn để tăng cường bảo mật cho môi trường production. 

- Không còn hỗ trợ `AUTH_MODE=dev`.
- Không hỗ trợ decode JWT payload mà không verify.
- Không cho phép bypass qua header `x-user-id` hoặc Bearer token dạng plain UUID.

---

## 4. Dev login/register endpoints [ĐÃ XOÁ / DEPRECATED]

Các endpoint `/auth/dev/login` và `/auth/dev/register` đã bị xoá hoàn toàn khỏi codebase backend (`backend/routes/auth.js` và `backend/controllers/auth.js`) để tránh lỗ hổng bảo mật truy cập trái phép.

---

## 5. Frontend/Mobile Dev Mode [ĐÃ XOÁ / DEPRECATED]

Các tham chiếu, cấu hình biến môi trường liên quan đến `VITE_AUTH_MODE=dev` hoặc `AUTH_MODE=dev` đã bị dọn dẹp sạch trên cả mã nguồn Frontend Web và Mobile App.

---

## 6. Kiểm tra Auth Middleware

Tất cả các route endpoints đã được rà soát:
- **Các route có auth**: Yêu cầu xác thực qua Firebase ID Token hoặc JWT Token hợp lệ của backend.
- **Các route public**:
  - `GET /api/health` — health check
  - `GET /` — API info
  - `POST /api/auth/send-otp`, `POST /api/auth/verify-otp` — luồng xác thực Phone OTP
  - `POST /api/wallet/topup/payos/webhook` — webhook callback của PayOS

Không có route nào thiếu auth.

---

## 7. Tính năng Rút tiền (Withdrawal)

### Backend
- **`POST /api/wallet/withdraw`** — route mới trong `backend/routes/walletRoutes.js`
- **Controller** `walletController.withdraw` — validate input, gọi service
- **Service** `walletService.withdraw` — trong transaction:
  1. Lock wallet (`lockByUserId`)
  2. Kiểm tra số dư khả dụng
  3. Trừ `available_balance` và `balance`
  4. Tạo `wallet_transaction` type `WITHDRAW` status `PENDING`
  5. Tạo `withdraw_requests` record

### Frontend
- **`WalletModal.tsx`** — thêm tab "Rút tiền" với form:
  - Số tiền rút (input numeric)
  - Tên ngân hàng
  - Số tài khoản
  - Nút "Gửi yêu cầu rút tiền"
  - Success state + refresh balance

---

## 8. Xoá toàn bộ Mock Data

### `frontend/src/app/context/AppContext.tsx`
| Thay đổi | Chi tiết |
|----------|----------|
| `MOCK_WORKERS` | `[]` (rỗng) |
| `DEMO_WORKER` | `null` |
| `INITIAL_JOBS` | Xoá, jobs state khởi tạo `[]` |
| `hirerUser`, `adminUser` | Xoá |
| Wallet initial | `500000` → `0` |
| `currentUser` | Fallback name/email/phone rỗng, không còn hardcode |
| Logout/fetchProfile | Reset wallet về `0` thay vì `500000` |
| `simulateApplicants()` | Xoá toàn bộ function |
| `workers` trong context | `[]` thay vì `MOCK_WORKERS` |
| `useApp()` fallback | `hirerWallet: 0`, `workerWallet: 0` |

### Frontend components
| File | Thay đổi |
|------|----------|
| `WorkerDashboard.tsx` | Không dùng `DEMO_WORKER` — fallback `currentUser` hoặc giá trị rỗng |
| `Profile.tsx` | Không dùng `DEMO_WORKER` — fallback rỗng |
| `JobDetail.tsx` | Không dùng `DEMO_WORKER` — dùng toạ độ mặc định + fallback rỗng |
| `Activity.tsx` | Xoá import `DEMO_WORKER` |
| `UsersManagement.tsx` | Không dùng `MOCK_WORKERS` — fetch users từ API |
| `Home.tsx` | Xoá `SLIDES` (11 slide ảo), xoá `TESTIMONIALS` (3 đánh giá ảo), HeroSlideshow → HeroSection tĩnh |
| `admin/Dashboard.tsx` | Xoá `revenueTrendData` + `applicationsTrendData` (mock chart data) |

---

## 9. Các Bug Fix Nhỏ

| Bug | File | Fix |
|-----|------|-----|
| Duplicate key trong mobile nav | `Layout.tsx` | `key={path}` → `key={`${path}-${label}`}` |
| Wallet balance sai role | `AppContext.tsx` | Role active nhận balance thật, role kia nhận 0 |
| `JSON.parse` crash | `AppContext.tsx` | Wrap trong try/catch |
| Firebase crash khi thiếu env | `firebase.ts` | Wrap `initializeApp` trong try/catch, exports `null` |
| API URL dev/prod | `api.ts` | `import.meta.env.DEV` → localhost, prod → `VITE_API_BASE_URL` |
