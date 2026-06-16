-- Add new values to withdraw_status enum
ALTER TYPE withdraw_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE withdraw_status ADD VALUE IF NOT EXISTS 'failed';

-- If using Prisma-style enum (WithdrawStatus), run this instead:
-- ALTER TYPE "WithdrawStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
-- ALTER TYPE "WithdrawStatus" ADD VALUE IF NOT EXISTS 'FAILED';
