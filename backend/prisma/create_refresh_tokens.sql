-- Run this in Supabase SQL Editor to create the refresh_tokens table
-- Required by backend/db/prisma.js → prisma.refreshToken.create()

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "token"       TEXT        NOT NULL,
  "user_id"     UUID        NOT NULL,
  "device_info" TEXT,
  "ip_address"  TEXT,
  "expires_at"  TIMESTAMPTZ NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "refresh_tokens_pkey"   PRIMARY KEY ("id"),
  CONSTRAINT "refresh_tokens_token_key" UNIQUE ("token"),
  CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id"
  ON "refresh_tokens" ("user_id");
