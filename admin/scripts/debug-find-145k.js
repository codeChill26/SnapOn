const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is missing in .env file!');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Bắt đầu tìm chính xác 145.000 VNĐ gây chênh lệch...');

  // 1. Fetch all escrows with status HOLDING
  const escrowsHolding = await prisma.escrow.findMany({
    where: { status: 'HOLDING' },
    include: { poster: { select: { id: true, fullName: true, email: true } }, task: { select: { title: true } } }
  });

  let sumHoldingEscrows = 0;
  const posterHoldingSum = {};

  for (const e of escrowsHolding) {
    const amt = Number(e.amount || 0);
    sumHoldingEscrows += amt;
    posterHoldingSum[e.posterId] = (posterHoldingSum[e.posterId] || 0) + amt;
  }

  // 2. Fetch all user wallets
  const wallets = await prisma.wallet.findMany({
    include: { user: { select: { id: true, fullName: true, email: true } } }
  });

  let sumWalletLocked = 0;
  for (const w of wallets) {
    sumWalletLocked += Number(w.lockedBalance || 0);
  }

  console.log('==================================================');
  console.log(`📋 Bảng 1 - Tổng Escrow status = HOLDING (${escrowsHolding.length} hợp đồng): ${sumHoldingEscrows.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔒 Bảng 2 - Tổng Wallet lockedBalance (${wallets.length} ví): ${sumWalletLocked.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📊 Chênh lệch: ${(sumHoldingEscrows - sumWalletLocked).toLocaleString('vi-VN')} VNĐ`);
  console.log('==================================================\n');

  // Compare per poster
  for (const w of wallets) {
    const escrowHoldingSum = posterHoldingSum[w.userId] || 0;
    const walletLocked = Number(w.lockedBalance || 0);

    if (escrowHoldingSum !== walletLocked) {
      console.log(`⚠️ MISMATCH Poster [${w.user?.fullName || w.userId}]: Escrow HOLDING = ${escrowHoldingSum.toLocaleString('vi-VN')}đ vs Wallet lockedBalance = ${walletLocked.toLocaleString('vi-VN')}đ (Lệch: ${(escrowHoldingSum - walletLocked).toLocaleString('vi-VN')}đ)`);
    }
  }

  // Check if any Escrows in `escrowsHolding` belong to posters that DO NOT HAVE a Wallet record!
  for (const e of escrowsHolding) {
    const wallet = wallets.find(w => w.userId === e.posterId);
    if (!wallet) {
      console.log(`🚨 ALERT: Escrow ID ${e.id} (Task: ${e.task?.title}, ${Number(e.amount).toLocaleString('vi-VN')}đ) belongs to Poster ${e.poster?.fullName} (${e.posterId}) WHO HAS NO WALLET!`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
