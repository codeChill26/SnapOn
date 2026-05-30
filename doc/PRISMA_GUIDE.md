# Prisma + Supabase (BE_EXE101) — Hướng dẫn đầy đủ

Tài liệu này giải thích:
- Cách set up Prisma cho database đang chạy trên Supabase Postgres.
- Cách dùng Prisma để thao tác dữ liệu (CRUD, relations, transaction, raw SQL).
- Ý nghĩa các file Prisma trong project.
- Ý nghĩa các file trong thư mục `scripts/`.

> Ghi chú an toàn: KHÔNG commit file `.env` lên git. Mọi ví dụ connection string dưới đây đều dùng placeholder.

---

## 1) Prisma trong project này đang chạy như thế nào?

Trong repo này, Prisma được dùng theo kiểu:
- **Prisma Client** để query dữ liệu.
- Prisma **không** dùng `datasource.url` trong `schema.prisma` (theo Prisma v7), mà lấy URL từ **[prisma.config.ts](prisma.config.ts)**.
- Runtime (Express app / script) kết nối qua **Postgres driver adapter** `@prisma/adapter-pg`.
  - Vì vậy trong `dependencies` bạn vẫn thấy `pg` (đây là driver thực tế nói chuyện với Postgres).

### Các biến môi trường quan trọng
- `DATABASE_URL`: URL chính để app kết nối DB.
  - Có thể là **Pooler** của Supabase (pgBouncer) hoặc direct host.
- `DIRECT_URL` (khuyến nghị cho Prisma CLI): URL **direct** (không pooler) để chạy `prisma db pull`, migrations.
  - Repo cũng hỗ trợ `DIRECT_DATABASE_URL` như tên thay thế.
- `PGSSLMODE`: mặc định `require`.

---

## 2) Setup Prisma từ đầu (database đã có sẵn trên Supabase)

### Bước 1 — Cài dependencies
Trong project này bạn cần:
- `prisma` (CLI) — devDependency
- `@prisma/client` — dependency
- `@prisma/adapter-pg` — dependency
- `pg` — dependency

Cài bằng:
```bash
npm install
```

### Bước 2 — Tạo `.env`
Tạo `.env` dựa trên `.env.example`.

Ví dụ:
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@DIRECT_HOST:5432/DB?sslmode=require
PGSSLMODE=require
```

**Khi nào cần `DIRECT_URL`?**
- Nếu `DATABASE_URL` bạn copy từ Supabase **Session Pooler** (thường port `6543` và có `pgbouncer=true`).
- Prisma CLI (đặc biệt `db pull`/migrations) thường ổn định hơn khi dùng direct connection.

### Bước 3 — Generate Prisma Client
```bash
npm run prisma:generate
```

### Bước 4 — Kéo schema từ Supabase về (tạo models/entities)
Đây là bước tạo “entities/models” để bạn thao tác như ORM:
```bash
npm run prisma:pull
```

Sau đó mở [prisma/schema.prisma](prisma/schema.prisma) sẽ thấy các block:
```prisma
model User { ... }
model Task { ... }
...
```

> Nếu `prisma:pull` chạy lâu/hang: set `DIRECT_URL` đúng direct DB host, rồi chạy lại.

### Bước 5 — Test kết nối
```bash
npm run db:ping
npm run db:tables
```

---

## 3) Ý nghĩa các file Prisma trong repo

### 3.1 [prisma/schema.prisma](prisma/schema.prisma)
Chứa **schema Prisma**:
- `generator client`: cấu hình Prisma Client.
- `datasource db`: cấu hình provider (PostgreSQL).
- `enum ...`: enum mapping từ DB/logic domain.
- `model ...`: entities tương ứng với table.

Một số annotation hay gặp:
- `@id`: primary key
- `@default(uuid())`, `@default(now())`: default value
- `@unique`: unique constraint
- `@map("column_name")`: map field Prisma → column DB
- `@@map("table_name")`: map model Prisma → table DB
- `@relation(...)`: relations và khóa ngoại

### 3.2 [prisma.config.ts](prisma.config.ts)
Đây là Prisma v7 config cho CLI:
- Chỉ ra đường dẫn schema: `prisma/schema.prisma`
- Chỉ ra migrations path
- Lấy connection URL từ env (ưu tiên `DIRECT_URL` → `DIRECT_DATABASE_URL` → `DATABASE_URL`)
- Có normalize để tránh lỗi `.env` bị bọc dấu nháy hoặc dính `DATABASE_URL=` trong value.

**Tác dụng:** giúp các lệnh CLI chạy đúng, ví dụ:
- `prisma generate`
- `prisma db pull`
- `prisma migrate ...`

### 3.3 Thư mục `prisma/migrations/`
- Chỉ xuất hiện khi bạn dùng migrations (không phải lúc `db pull`).
- Mỗi migration là 1 folder gồm SQL.

### 3.4 [db/prisma.js](db/prisma.js)
Đây là **PrismaClient singleton** cho runtime:
- Tạo `Pool` của `pg` + cấu hình SSL.
- Tạo `adapter = new PrismaPg(pool)`.
- Tạo `new PrismaClient({ adapter })`.
- Cache vào `globalThis.__prisma` (dev) để tránh tạo nhiều connection khi hot reload.

> Lưu ý: Dù bạn nói “không dùng pool nữa”, Prisma v7 adapter **vẫn cần** driver `pg` bên dưới. Bạn không gọi SQL qua `pool.query` nữa; bạn gọi qua `prisma.*`.

---

## 4) Ý nghĩa các file trong `scripts/`

### 4.1 [scripts/db-ping.js](scripts/db-ping.js)
Mục đích: test nhanh DB có connect được qua Prisma hay không.
- Load `.env`
- Chạy query đơn giản: `select now(), current_user`
- In kết quả rồi disconnect

Chạy:
```bash
npm run db:ping
```

### 4.2 [scripts/db-list-tables.js](scripts/db-list-tables.js)
Mục đích: in danh sách table trong schema `public`.
- Script này dùng `pg` trực tiếp để liệt kê table nhanh, không phụ thuộc Prisma models.

Chạy:
```bash
npm run db:tables
```

---

## 5) Dùng Prisma để thao tác dữ liệu (CRUD)

> Điều kiện: bạn đã chạy `npm run prisma:pull` và `npm run prisma:generate` để có models.

### 5.1 Import Prisma trong controller/route
Ví dụ trong một controller:
```js
const prisma = require('../db/prisma');

const listUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers };
```

> Note: tên model delegate (`prisma.user`, `prisma.task`, …) phụ thuộc vào tên `model` trong schema và Prisma’s naming rules.

### 5.2 Create
```js
await prisma.user.create({
  data: {
    fullName: 'Nguyen Van A',
    email: 'a@example.com',
  },
});
```

### 5.3 Read (findMany / findUnique)
```js
await prisma.user.findUnique({ where: { id: userId } });
await prisma.task.findMany({ where: { status: 'OPEN' } });
```

### 5.4 Update
```js
await prisma.task.update({
  where: { id: taskId },
  data: { status: 'IN_PROGRESS' },
});
```

### 5.5 Delete
```js
await prisma.task.delete({ where: { id: taskId } });
```

### 5.6 Pagination
Offset pagination:
```js
await prisma.task.findMany({ skip: 0, take: 20 });
```

Cursor pagination:
```js
await prisma.task.findMany({
  take: 20,
  cursor: { id: lastId },
  skip: 1,
  orderBy: { id: 'asc' },
});
```

---

## 6) Quan hệ (relations)

### include
```js
await prisma.task.findMany({
  include: {
    poster: true,
    category: true,
    requiredSkills: { include: { skill: true } },
  },
});
```

### select (tối ưu data trả về)
```js
await prisma.user.findMany({
  select: { id: true, fullName: true, email: true },
});
```

---

## 7) Transaction

### $transaction
```js
await prisma.$transaction(async (tx) => {
  const wallet = await tx.wallet.findUnique({ where: { userId } });
  await tx.walletTransaction.create({
    data: { walletId: wallet.id, type: 'DEPOSIT', amount: 1000 },
  });
});
```

---

## 8) Raw SQL (khi Prisma query khó)

### $queryRaw (SELECT)
```js
const rows = await prisma.$queryRaw`
  select id, email from users where status = ${'ACTIVE'}
`;
```

### $executeRaw (INSERT/UPDATE/DELETE)
```js
await prisma.$executeRaw`
  update tasks set status = ${'CANCELLED'} where id = ${taskId}
`;
```

> Luôn dùng template-tag của Prisma như trên để tránh SQL injection.

---

## 9) Khi nào dùng `db pull`, `db push`, migrations?

### 9.1 `prisma db pull`
- **DB → Prisma**: đọc schema từ database và sinh `model` trong `schema.prisma`.
- Dùng khi database đã có tables (như Supabase của bạn).

### 9.2 `prisma db push`
- **Prisma → DB**: đẩy schema lên DB (không tạo migration file).
- Hợp cho dev/POC, không khuyến nghị production.

### 9.3 Migrations (`prisma migrate dev/deploy`)
- Chuẩn cho team/prod: có lịch sử thay đổi schema.
- Workflow:
  - Sửa `schema.prisma`
  - `npx prisma migrate dev --name add_xxx`
  - Deploy: `npx prisma migrate deploy`

#### 9.3.1 Lưu ý quan trọng khi dùng Supabase
`prisma migrate dev` thường cần **shadow database** (yêu cầu quyền `CREATE DATABASE`). Trên Supabase, nhiều trường hợp bạn **không có quyền** này ⇒ chạy `migrate dev` trực tiếp lên Supabase có thể lỗi.

Workflow ổn định nhất (khuyến nghị):
- **Tạo migration ở local Postgres** bằng `migrate dev`
- **Deploy lên Supabase** bằng `migrate deploy`

> Mục tiêu: luôn có folder `prisma/migrations/*` để đồng bộ giữa máy dev và Supabase.

#### 9.3.2 Tạo migration ở local (khuyến nghị)
Chạy trong thư mục `backend/`.

1) Chuẩn bị Postgres local (ví dụ Docker):
```bash
docker run --name exe202-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

2) Trỏ Prisma CLI về DB local (tạm thời):
- Cách đơn giản: set `DIRECT_URL` và/hoặc `DATABASE_URL` trong `.env` sang local

Ví dụ:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

3) Generate + chạy migrate dev để sinh migration:
```bash
npm run prisma:generate
npx prisma migrate dev --name <ten_ngan_goi>
```

4) Commit folder `backend/prisma/migrations/` lên git.

#### 9.3.3 Deploy migration lên Supabase (đồng bộ schema)
Chạy trong thư mục `backend/`.

1) Trỏ Prisma CLI về Supabase **direct connection** (khuyến nghị dùng `DIRECT_URL`):
```env
DATABASE_URL=<pooler_or_direct_url>
DIRECT_URL=<supabase_direct_url_port_5432>?sslmode=require
```

2) Apply migrations lên Supabase:
```bash
npx prisma migrate deploy
```

3) Kiểm tra trạng thái:
```bash
npx prisma migrate status
```

> Nếu app runtime dùng pooler, bạn vẫn có thể để `DATABASE_URL` là pooler; nhưng Prisma CLI nên ưu tiên `DIRECT_URL` (repo đã cấu hình trong `prisma.config.ts`).

#### 9.3.4 Sync nhanh (không migration) — chỉ nên dùng cho dev/POC
Nếu bạn chỉ cần “đẩy schema lên Supabase cho nhanh” và chấp nhận **không có lịch sử migration**:
```bash
npx prisma db push
```

Rủi ro:
- Dễ bị drift giữa các máy/dev
- Khó rollback
- Không phù hợp production

---

## 10) Troubleshooting thường gặp (Supabase)

### 10.1 Prisma CLI chạy lỗi URL invalid
- Nguyên nhân hay gặp: `.env` bị bọc quotes hoặc copy sai format.
- Repo đã normalize trong [prisma.config.ts](prisma.config.ts).

### 10.2 `db pull` chạy lâu/hang
- Thử set `DIRECT_URL` là direct DB host (port 5432) thay vì pooler.

### 10.3 Lỗi SSL “self-signed certificate in certificate chain”
- Repo đã set `ssl: { rejectUnauthorized: false }` trong [db/prisma.js](db/prisma.js).
- Đảm bảo URL có `sslmode=require`.

---

## 11) Quick commands (cheat sheet)

```bash
# Run inside backend/

# Generate Prisma client
npm run prisma:generate

# Pull models from Supabase
npm run prisma:pull

# Open Prisma Studio
npm run prisma:studio

# Create a migration (recommended: run against LOCAL Postgres)
npx prisma migrate dev --name <ten_ngan_goi>

# Apply migrations to Supabase (or any target DB)
npx prisma migrate deploy

# Migration status
npx prisma migrate status

# Quick sync without migrations (dev/POC)
npx prisma db push

# Test DB
npm run db:ping
npm run db:tables
```
