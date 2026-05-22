# BE_EXE101

## Supabase Postgres connection

### 1) Set environment variables

Create a `.env` file (use `.env.example` as a template) and set `DATABASE_URL`.

- Direct connection (IPv6 networks):
	- Host: `db.zxhcqjrfwbxwuvlxhleq.supabase.co`
	- Port: `5432`
	- Database: `postgres`
	- User: `postgres`
	- SSL: required (`sslmode=require`)

Example `DATABASE_URL` (replace `<YOUR_PASSWORD>`):

```
postgresql://postgres:<YOUR_PASSWORD>@db.zxhcqjrfwbxwuvlxhleq.supabase.co:5432/postgres?sslmode=require
```

If your network is IPv4-only, Supabase’s direct database host may not work. In that case, copy the **Session Pooler** connection string from the Supabase dashboard and use that as `DATABASE_URL` instead.

### 2) Test the connection from this project

```
npm run db:ping
```

### 2.1) Prisma setup

Generate Prisma Client:

```
npx prisma generate
```

If your database already has tables and you want Prisma models from Supabase, run:

```
npx prisma db pull
```

Note: Prisma models (entities) only appear in `prisma/schema.prisma` after `db pull` completes. If your `DATABASE_URL` is using the Supabase Pooler, set `DIRECT_URL` (recommended) in `.env` to the direct connection string and run `npx prisma db pull` again.

### 3) (Optional) Connect with psql

You need the PostgreSQL client tools installed (`psql` must be on your PATH). On Windows the simplest is installing PostgreSQL (it includes `psql`).

PowerShell example (prompts for password):

```
psql "postgresql://postgres@db.zxhcqjrfwbxwuvlxhleq.supabase.co:5432/postgres?sslmode=require" -W
```

If you get an IPv4/IPv6 compatibility warning in Supabase, switch to the **Session Pooler** host/port shown in the dashboard.

## Optional: Install Supabase Agent Skills

```
npx skills add supabase/agent-skills
```