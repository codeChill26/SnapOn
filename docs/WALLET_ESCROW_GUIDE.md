# Wallet + Escrow (SnapOn) — Hướng dẫn từ Begin → Full Flow

> Mục tiêu: làm **ví (Wallet)** để nạp/rút/ghi sổ giao dịch và **Escrow** để “giữ tiền” khi thuê việc, rồi **release/refund/dispute** theo trạng thái của Task.

Tài liệu này bám theo repo của bạn:

- Backend đang dùng **Express + pg Pool** cho hầu hết query (ví dụ `backend/models/*.js`).
- DB đã có sẵn bảng: `wallets`, `wallet_transactions`, `escrows`, `payments`, `withdraw_requests` (xem `backend/createdb.txt`).
- Flow nghiệp vụ hiện có: **Task → Application → Matching → Task IN_PROGRESS/COMPLETED**.

---

## 0) Quyết định “source of truth” cho DB schema (rất quan trọng)

Trong repo đang tồn tại 2 “bản schema”:

1) `backend/createdb.txt`: enum & giá trị **lowercase** (vd `task_status` có `open`, `in_progress`; `wallet_transaction_type` có `topup`, `payment`...).
2) `backend/prisma/schema.prisma`: enum & giá trị **UPPERCASE** (vd `TaskStatus.OPEN`).

Trong code hiện tại, constants cũng đang dùng UPPERCASE (`backend/utils/constants.js`). Nếu DB của bạn được tạo theo `createdb.txt` thì sẽ **lệch** và dễ lỗi.

### Cách chọn

- **Option A (khuyến nghị cho repo hiện tại):** tiếp tục dùng `pg` + schema theo `createdb.txt`.
  - Khi đó bạn nên chuẩn hóa constants theo giá trị trong DB (lowercase) hoặc map 2 chiều.
- **Option B:** chuyển dần sang Prisma (dùng `backend/db/prisma.js`) và migrate schema theo `schema.prisma`.
  - Lúc đó bạn dùng Prisma transactions, không dùng query raw (hoặc giảm dần).

> Trong guide này, mình mô tả theo **Option A (pg Pool)** vì code hiện tại đang theo hướng đó.

### Tự kiểm tra DB của bạn đang dùng enum nào

Chạy trong Postgres:

```sql
SELECT unnest(enum_range(NULL::task_status));
SELECT unnest(enum_range(NULL::wallet_transaction_type));
SELECT unnest(enum_range(NULL::escrow_status));
```

---

## 1) Khái niệm & nguyên tắc (đừng bỏ qua)

### 1.1. Wallet balances

Bảng `wallets` có 3 số:

- `balance`: tổng tiền trong ví
- `available_balance`: tiền dùng được ngay
- `pending_balance`: tiền đang bị “giữ/treo” (ví dụ đang escrow)

**Invariant nên giữ:**

- `balance = available_balance + pending_balance`
- Không để số âm

### 1.2. Ledger (wallet_transactions)

`wallet_transactions` là “sổ cái” để audit.

- Luôn tạo transaction record khi:
  - nạp tiền (topup)
  - giữ tiền (escrow hold)
  - release (escrow release)
  - refund
  - fee
  - withdraw

### 1.3. Rule quan trọng nhất: mọi thay đổi tiền phải atomic

Bất kỳ flow nào động đến tiền, bạn phải làm trong **DB transaction** (`BEGIN/COMMIT/ROLLBACK`) và thường cần **row lock** (`FOR UPDATE`) để tránh double-spend.

---

## 2) Full flow tổng quan (mermaid)

```mermaid
flowchart TD
  A[Poster Topup Wallet] --> B[Task posted]
  B --> C[Tasker bids]
  C --> D[Matching selects tasker]
  D --> E{Poster wallet đủ tiền?}
  E -- No --> E1[Topup / cancel match]
  E -- Yes --> F[Escrow HOLD
(move available -> pending)]
  F --> G[Task IN_PROGRESS]
  G --> H{Task done?}
  H -- Completed --> I[Escrow RELEASE
(poster pending -> tasker available)]
  H -- Cancelled --> J[Escrow REFUND
(poster pending -> poster available)]
  H -- Dispute --> K[Escrow DISPUTED
(admin resolves)]
```

---

## 3) Thiết kế API (đề xuất)

### 3.1 Wallet

- `GET /api/wallet/me`
  - Trả về balances + (tuỳ chọn) pending escrow tổng
- `GET /api/wallet/transactions?limit=20&cursor=...`
  - Lịch sử giao dịch
- `POST /api/wallet/topup/mock` (dev-only)
  - Nạp tiền giả lập
- `POST /api/wallet/withdraw-requests`
  - Tạo yêu cầu rút

### 3.2 Escrow

Escrow thường không expose trực tiếp nhiều endpoint; nó “gắn vào” flow task.

- Matching (auto/manual) sẽ **HOLD escrow** trước khi set task `in_progress`.
- Hoàn thành task sẽ **RELEASE**.
- Hủy task sẽ **REFUND**.
- Dispute: set status `disputed` và chờ admin.

---

## 4) Implement backend (Option A — pg Pool)

### 4.1 Tạo module `walletModel` / `walletService` đầy đủ

Bạn đang có:

- `backend/models/walletModel.js`: `findByUserId`, `checkBalance`, `createIfNotExists`
- `backend/services/walletService.js`: `verifyBalance`

Bạn cần bổ sung thêm các primitive atomic dưới dạng function (khuyến nghị đặt ở `services/`):

- `getOrCreateWallet(userId)`
- `creditAvailable(userId, amount, reference)` (topup/earning)
- `holdFunds(userId, amount, escrowId)`
- `releaseHeldFunds(fromUserId, toUserId, amount, escrowId, feeAmount)`
- `refundHeldFunds(userId, amount, escrowId)`

> Các primitive này đều nên dùng `pool.connect()` để mở transaction.

### 4.2 Template code: DB transaction + lock wallet row

```js
// pseudo-code (Node + pg)
const pool = require('../config/db');

async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function lockWalletByUserId(client, userId) {
  const { rows } = await client.query(
    `SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE`,
    [userId]
  );
  if (!rows[0]) {
    const created = await client.query(
      `INSERT INTO wallets (user_id, balance, available_balance, pending_balance)
       VALUES ($1, 0, 0, 0)
       RETURNING *`,
      [userId]
    );
    return created.rows[0];
  }
  return rows[0];
}
```

### 4.3 Flow: Topup (mock)

Mục tiêu: cộng `available_balance` và `balance`, tạo record `wallet_transactions`.

Pseudo steps:

1) `BEGIN`
2) `SELECT wallet FOR UPDATE`
3) `UPDATE wallets SET available_balance += amount, balance += amount`
4) `INSERT wallet_transactions (type=topup, status=success, reference_id=<paymentId or random>)`
5) `COMMIT`

### 4.4 Flow: HOLD escrow (khi match)

HOLD nghĩa là:

- Poster: `available_balance -= amountToHold`, `pending_balance += amountToHold`
- Tạo `escrows` status `holding`
- Tạo `wallet_transactions` loại `payment` (hoặc `escrow_hold` nếu bạn muốn thêm enum)

> **amountToHold** thường là: `final_price + platform_fee + insurance_fee`.

Pseudo steps (atomic):

1) `BEGIN`
2) Lock poster wallet (`FOR UPDATE`) và check đủ `available_balance`
3) Create escrow row (`INSERT escrows ... status holding RETURNING id`)
4) Update poster wallet: available ↓, pending ↑
5) Insert wallet_transactions: type `payment` / status `success` / reference_id = escrowId
6) Commit

### 4.5 Gắn HOLD vào matchingController (đúng điểm móc)

Hiện tại `backend/controllers/matchingController.js` sau khi chọn tasker sẽ:

- create assigned_task
- update task status → IN_PROGRESS
- set final_price

Bạn nên đổi thứ tự thành:

1) validate chọn tasker
2) **HOLD escrow** (nếu fail vì thiếu tiền → trả lỗi và KHÔNG match)
3) create assigned_task
4) update task status + final_price
5) accept/reject applications

Tất cả steps 2–5 **lý tưởng** gói trong 1 DB transaction.

### 4.6 Flow: RELEASE escrow (khi task hoàn thành)

RELEASE nghĩa là:

- Poster: tiền rời ví thật sự
  - `pending_balance -= totalHold`
  - `balance -= totalHold`
- Tasker: nhận tiền
  - `available_balance += taskAmount`
  - `balance += taskAmount`
- Platform fee (tuỳ bạn):
  - Nếu có platform wallet riêng: credit vào platform wallet
  - Hoặc chỉ ghi sổ (`wallet_transactions` type `fee`) để thống kê
- Escrow: status `released`

Pseudo steps (atomic):

1) `BEGIN`
2) Lock escrow row (select by task_id FOR UPDATE) và check status `holding`
3) Lock poster wallet & tasker wallet
4) Update wallets
5) Insert wallet_transactions cho poster (release) + tasker (earning) + fee
6) Update escrow status `released`
7) Commit

### 4.7 Flow: REFUND escrow (khi hủy)

REFUND nghĩa là “đưa tiền từ pending về available”:

- Poster: `pending_balance -= totalHold`, `available_balance += totalHold`
- balance không đổi
- Escrow: status `refunded`

Pseudo steps tương tự RELEASE nhưng đổi update.

### 4.8 Dispute

- Set `escrows.status = disputed`
- Không chuyển tiền
- Admin resolve:
  - refund, release, hoặc split (nếu split thì bạn cần thiết kế thêm field/bảng cho phân bổ)

---

## 5) Frontend integration (tối thiểu)

Hiện tại `frontend/src/app/components/WalletModal.tsx` đang “nạp tiền giả lập” bằng callback `onTopUp(amount)`.

Để đi end-to-end:

1) Khi mở modal, gọi `GET /api/wallet/me` để lấy số dư thật.
2) Khi topup:
   - Dev: gọi `POST /api/wallet/topup/mock` rồi refetch `GET /api/wallet/me`.
   - Prod: tạo payment intent → QR/url → webhook callback → polling/refresh.
3) Khi match job, nếu backend trả lỗi “insufficient balance”, frontend mở WalletModal để topup.

---

## 6) Checklist chống bug tiền

- Dùng `DECIMAL(12,2)` trong DB, nhưng ở JS tránh cộng trừ float trực tiếp; luôn để DB tính.
- Tất cả chuyển tiền: `BEGIN ... COMMIT`.
- Dùng `SELECT ... FOR UPDATE` để lock wallet row.
- Idempotency:
  - Khi callback payment/ release, kiểm tra `escrow.status` hoặc `transaction.status` trước khi chạy.
- Audit:
  - luôn insert `wallet_transactions` cho mọi thay đổi.

---

## 7) Demo nhanh bằng Phone OTP Auth

Bạn có thể sử dụng số điện thoại để thực hiện kiểm thử nhanh qua luồng Phone OTP (sử dụng Redis Cache):

1. Tạo yêu cầu gửi mã OTP:
   ```bash
   curl -X POST -H "Content-Type: application/json" -d '{"phone": "0987654321"}' http://localhost:3000/api/auth/send-otp
   ```
2. Kiểm tra log của server backend để lấy mã OTP 6 chữ số đã sinh.
3. Xác minh OTP để nhận backend JWT tokens:
   ```bash
   curl -X POST -H "Content-Type: application/json" -d '{"phone": "0987654321", "otp": "xxxxxx"}' http://localhost:3000/api/auth/verify-otp
   ```
4. Sử dụng JWT Access Token nhận được để truy cập các API Authenticated:
   ```bash
   curl -H "Authorization: Bearer <JWT_ACCESS_TOKEN>" http://localhost:3000/api/wallet/me
   ```

---

## 8) Bạn muốn mình làm tiếp phần nào?

Bạn chọn 1 trong 2 hướng:

1) **Chỉ hướng dẫn (mình sẽ bổ sung API contract + sequence chi tiết theo file hiện có)**
2) **Mình code luôn**: thêm routes/controllers/services để chạy được các endpoint `wallet/me`, `topup/mock`, và escrow hold/release/refund gắn vào matching + complete.
