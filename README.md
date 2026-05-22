# EXE202

Monorepo gồm 2 phần:

- **backend_SO**: Express API + Prisma + Supabase Postgres
- **frontend_SO**: React + Vite

## Yêu cầu

- Node.js (khuyến nghị 18+)
- npm

## Cấu trúc thư mục

- `backend_SO/` — Backend API
- `frontend_SO/` — Frontend web

## Chạy dự án (development)

### 1) Backend

```bash
cd backend_SO
npm i
```

Thiết lập biến môi trường:

- Copy file `backend_SO/.env.example` thành `backend_SO/.env`
- Set `DATABASE_URL` (và `DIRECT_URL` nếu cần khi dùng Supabase Pooler)

Test DB:

```bash
npm run db:ping
```

Sinh Prisma Client:

```bash
npm run prisma:generate
```

Chạy dev:

```bash
npm run dev
```

Mặc định backend chạy ở `http://localhost:3000`.

- Swagger: `http://localhost:3000/api-docs`
- Health check: `http://localhost:3000/api/health`

### 2) Frontend

```bash
cd frontend_SO
npm i
npm run dev
```

Vite sẽ in ra URL (thường là `http://localhost:5173`).

## Ghi chú DB (Supabase)

Backend đang dùng `DATABASE_URL` trỏ đến Supabase Postgres.

Ví dụ dạng connection string (thay `<YOUR_PASSWORD>`):

```text
postgresql://postgres:<YOUR_PASSWORD>@db.zxhcqjrfwbxwuvlxhleq.supabase.co:5432/postgres?sslmode=require
```

Nếu mạng IPv4-only không dùng được direct host của Supabase, lấy connection string **Session Pooler** trong dashboard và dùng làm `DATABASE_URL`. Khi cần `prisma db pull`, nên set thêm `DIRECT_URL` là direct connection string.

## Scripts hữu ích

Backend (`backend_SO/package.json`):

- `npm run dev` — chạy API bằng nodemon
- `npm start` — chạy theo entry `bin/www`
- `npm run db:ping` / `npm run db:tables`
- `npm run prisma:generate` / `npm run prisma:pull` / `npm run prisma:studio`

Frontend (`frontend_SO/package.json`):

- `npm run dev` — chạy Vite dev server
- `npm run build` — build production
