# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SnapOn** — A Vietnamese freelance marketplace connecting hirers and workers. Monorepo with four applications sharing a common PostgreSQL backend.

Deployed backend: `https://snapon-debug.onrender.com`

---

## Repository Structure

```
backend/     Express 4 REST API + Socket.io (Node.js, port 3000)
frontend/    React 18 + Vite web client (port 5173)
admin/       Next.js 16 admin dashboard (port 3001)
mobile/      Expo 54 React Native app
docs/        Architecture docs and guides
```

---

## Commands

### Backend
```bash
cd backend
npm run dev          # nodemon app.js (development)
npm start            # node app.js (production)
npm run db:ping      # Test database connection
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:pull      # Sync schema from live database
```

### Frontend
```bash
cd frontend
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build
```

### Admin
```bash
cd admin
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
```

### Mobile
```bash
cd mobile
npm start            # expo start (scan QR in Expo Go)
npm run android      # Run on Android emulator/device
npm run ios          # Run on iOS simulator/device
```

### Database (Docker local dev)
```bash
docker-compose up -d   # Start local PostgreSQL on port 5432
```

---

## Architecture

### Request Flow (Backend)
```
Client → Routes → Middleware (auth/validate) → Controllers → Services → Models (raw SQL) → PostgreSQL
```

- **Routes** (`backend/routes/`): 16 route files, all mounted in `app.js`
- **Controllers** (`backend/controllers/`): Request/response handlers
- **Services** (`backend/services/`): Business logic — matching, escrow, wallet, notifications, socket
- **Models** (`backend/models/`): Raw SQL queries via `pg` Pool (not Prisma at runtime — Prisma is schema-only)
- **Middleware** (`backend/middleware/`): `auth.js` verifies Firebase tokens OR accepts `x-user-id` header in dev mode

### Authentication
- **Mobile/Frontend**: Firebase Auth — clients get a Firebase ID token, backend verifies via Firebase Admin SDK
- **Dev bypass**: Pass `x-user-id: <userId>` header to skip Firebase verification (development only)
- **Admin portal**: Separate bcrypt + JWT auth, cookie-based sessions — no Firebase

### Real-time (Socket.io)
- Backend initializes Socket.io in `app.js`, logic in `backend/services/socketService.ts`
- Mobile and frontend connect via `socket.io-client`
- Auth via `backend/middleware/socketAuth.js`

### Payment Flow
- PayOS integration with 10% platform fee (`PLATFORM_FEE_RATE` env var)
- Escrow pattern: funds held until task completion (`backend/services/escrowService.ts`)
- Wallet system: `backend/services/walletService.ts`
- Docs: `docs/WALLET_ESCROW_GUIDE.md`

### Admin (Next.js 16 App Router)
- **CRITICAL**: Next.js v16 has breaking changes from v13–15. Before modifying admin code, read `admin/node_modules/next/dist/docs/`.
- Uses Prisma Client directly (not via backend API) for database queries
- API routes in `admin/src/app/api/`, dashboard pages in `admin/src/app/(dashboard)/`

### Mobile API URL
- API URLs are hardcoded in `mobile/src/constants/config.ts` — update IP/domain for each deployment
- `mobile/src/utils/backendDetector.ts` handles switching between local and deployed URLs

---

## Environment Variables

Each sub-project has its own `.env`. Key variables:

**Backend** (`.env`):
- `DATABASE_URL` — Supabase PostgreSQL connection (pooler URL for connection pooling)
- `DIRECT_URL` — Direct Supabase URL for Prisma migrations
- Firebase credentials, PayOS keys, Cloudinary credentials

**Frontend** (`.env`):
- `VITE_API_BASE_URL` — defaults to `http://localhost:3000/api`

**Mobile** — hardcoded in `src/constants/config.ts` (no `.env` file used at runtime)

---

## Database

- **PostgreSQL** hosted on Supabase; use Session Pooler URL for IPv4 networks
- **Prisma** is used for schema management only — `backend/prisma/schema.prisma` has 20+ models
- Runtime queries use raw SQL via `pg` Pool in `backend/models/`
- After schema changes: run `npm run prisma:generate` in backend
- See `docs/PRISMA_GUIDE.md` for migration workflow

---

## Key Docs

- `docs/PROJECT_REFERENCE.md` — Full API endpoint reference and architecture diagram
- `docs/context.md` — Detailed data flows and code patterns (Vietnamese)
- `docs/auth-guide.md` — Authentication implementation
- `docs/WALLET_ESCROW_GUIDE.md` — Payment system walkthrough

---

## No Test Suite

There are no automated tests configured in any sub-project. Verify changes manually.
