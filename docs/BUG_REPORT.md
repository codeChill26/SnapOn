# Bug Report & Fix Log — SnapOn

**Branch:** `backend/Deployment`  
**Ngày:** 2026-06-28

---

## 1. Login 500 — `POST /api/auth/sync-user`

### Triệu chứng
Mobile đăng nhập bằng email/password → backend trả về HTTP 500.

### Nguyên nhân gốc
`routes/auth.js` — hàm `sync-user` truyền `name || null` vào câu SQL upsert user:

```js
// BEFORE (lỗi)
const userResult = await client.query(upsertUserQuery, [
  uid,
  email,
  name || null,   // ← NULL nếu Firebase token chưa có displayName
  finalAvatar
]);
```

Cột `full_name` trong bảng `users` là **NOT NULL**. Khi người dùng đăng ký mới bằng email/password, Firebase ID token được lấy ngay sau khi tạo tài khoản — trước khi `updateProfile({ displayName })` được phản ánh vào token. Kết quả: `name = undefined` → `null` → vi phạm NOT NULL constraint → **500**.

### Fix
**File:** `backend/routes/auth.js` — dòng truyền tham số upsert:

```js
// AFTER (đã sửa)
const userResult = await client.query(upsertUserQuery, [
  uid,
  email,
  name || email.split('@')[0],   // ← fallback sang email prefix
  finalAvatar
]);
```

---

## 2. Register — Firebase token không có `displayName`

### Triệu chứng
Khi đăng ký tài khoản mới, Firebase profile được update nhưng token cũ (không có `name` claim) vẫn được dùng để gọi `sync-user`.

### Nguyên nhân gốc
`RegisterScreen.tsx` gọi `getIdToken()` (không force-refresh) ngay sau `updateProfile`. Token được cache từ lúc tài khoản vừa tạo, chưa có `displayName` trong payload.

```ts
// BEFORE (lỗi)
const idToken = await uc.user.getIdToken();
```

### Fix
**File:** `mobile/src/screens/auth/RegisterScreen.tsx`:

```ts
// AFTER (đã sửa)
const idToken = await uc.user.getIdToken(true);  // force refresh
```

---

## 3. Backend crash local — `Cannot find module 'nodemailer'`

### Triệu chứng
Backend local crash ngay lúc khởi động:
```
Error: Cannot find module 'nodemailer'
Require stack:
- backend/services/emailService.js
- backend/routes/auth.js
```

### Nguyên nhân
`emailService.js` được thêm vào từ nhánh `Verify` nhưng `npm install` chưa được chạy lại. `nodemailer` đã có trong `package.json` nhưng chưa có trong `node_modules`.

### Fix
```bash
cd backend
npm install
```

---

## 4. DB thiếu cột và bảng cho hệ thống xác thực mới

### Triệu chứng
Prisma throw error khi cố update `verificationToken` / `verificationTokenExpires` hoặc tạo `refresh_tokens` record.

### Nguyên nhân
Nhánh `Verify` bổ sung vào Prisma schema:
- Cột `verification_token` và `verification_token_expires` trên bảng `users`
- Model `RefreshToken` → bảng `refresh_tokens`

Nhưng **chưa chạy migration** để tạo các cột/bảng này trên Supabase.

### Fix
Tạo và chạy migration script:

```bash
cd backend
npm run migrate:auth-tokens
```

**File mới:** `backend/scripts/migration-auth-tokens.js`

```sql
-- Thêm 2 cột vào users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

-- Tạo bảng refresh_tokens (nếu chưa có)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT        NOT NULL UNIQUE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address  VARCHAR(45),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> Migration đã chạy thành công trên Supabase. Deployed backend (Render) và local đều dùng cùng DB → cả hai đều được fix.

---

## 5. Luồng mới sau khi merge nhánh Verify

### AppNavigator — User chưa verified bị chặn

`AppNavigator.tsx` giờ có thêm điều kiện:

```tsx
!isAuthenticated ? <Auth /> :
!user?.isVerified ? <VerificationScreen /> :   // ← MỚI
user?.role === 'admin' ? <AdminTabs /> :
<MainTabs />
```

**Hệ quả:** Tất cả user email/password có `is_verified = false` (phần lớn user hiện tại) sẽ thấy `VerificationScreen` thay vì vào app được.

**VerificationScreen flow:**
1. Đăng nhập → backend tự gửi email chứa mã 6 chữ số
2. User nhập mã → `POST /api/auth/verify-email`
3. Backend mark `is_verified = true` → AppNavigator cho vào `MainTabs`

### Nếu muốn bypass cho user cũ
Chạy SQL trực tiếp trên Supabase:

```sql
UPDATE users SET is_verified = true WHERE is_verified = false;
```

---

## Tóm tắt các file đã thay đổi

| File | Thay đổi |
|------|----------|
| `backend/routes/auth.js` | Fix `name \|\| null` → `name \|\| email.split('@')[0]`; thêm email verification flow |
| `backend/controllers/auth.js` | Thêm `verifyEmail`, `resendVerification`, `generateVerificationToken` |
| `backend/services/emailService.js` | File mới — gửi email xác thực qua Nodemailer |
| `backend/prisma/schema.prisma` | Thêm `verificationToken`, `verificationTokenExpires` vào `User`; thêm model `RefreshToken` |
| `backend/scripts/migration-auth-tokens.js` | Script migration DB mới |
| `backend/package.json` | Thêm script `migrate:auth-tokens` |
| `mobile/src/screens/auth/RegisterScreen.tsx` | Fix `getIdToken()` → `getIdToken(true)` |
| `mobile/src/screens/auth/LoginScreen.tsx` | Merge design Mascot + tính năng Remember Me từ Verify |
| `mobile/src/screens/auth/VerificationScreen.tsx` | File mới — màn hình nhập mã xác thực |
| `mobile/src/navigation/AppNavigator.tsx` | Thêm route `Verification`, gate cho user chưa verified |
| `mobile/src/services/authService.ts` | Thêm `verifyEmail`, `resendVerificationEmail` |

---

## Lệnh để deploy

```bash
# Commit toàn bộ staged changes
git commit -m "fix: login 500 null full_name, add email verification flow, auth migration"

# Push lên Render
git push origin backend/Deployment
```
