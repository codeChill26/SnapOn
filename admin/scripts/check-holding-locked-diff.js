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
  console.log('🔍 Kiểm tra đối soát chi tiết giữa Escrow HOLDING và Wallet lockedBalance...');

  // 1. All Escrows with status = HOLDING
  const holdingEscrows = await prisma.escrow.findMany({
    where: { status: 'HOLDING' },
    include: { poster: true }
  });

  let totalHoldingEscrowAmount = 0;
  for (const e of holdingEscrows) {
    totalHoldingEscrowAmount += Number(e.amount || 0);
  }

  // 2. All User Wallets with lockedBalance > 0
  const walletsWithLocked = await prisma.wallet.findMany({
    where: { lockedBalance: { gt: 0 } },
    include: { user: true }
  });

  let totalWalletLockedAmount = 0;
  for (const w of walletsWithLocked) {
    totalWalletLockedAmount += Number(w.lockedBalance || 0);
  }

  console.log('==================================================');
  console.log(`📋 Tổng Escrow status = HOLDING (${holdingEscrows.length} hợp đồng): ${totalHoldingEscrowAmount.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔒 Tổng Wallet lockedBalance (${walletsWithLocked.length} ví): ${totalWalletLockedAmount.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📊 Chênh lệch: ${(totalHoldingEscrowAmount - totalWalletLockedAmount).toLocaleString('vi-VN')} VNĐ`);
  console.log('==================================================');

  if (totalHoldingEscrowAmount !== totalWalletLockedAmount) {
    console.log('\n❌ Có sự chênh lệch! Chi tiết từng Poster có Escrow HOLDING vs Wallet lockedBalance:');
    
    // Group holding escrows by posterId
    const posterEscrowMap = {};
    for (const e of holdingEscrows) {
      posterEscrowMap[e.posterId] = (posterEscrowMap[e.posterId] || 0) + Number(e.amount || 0);
    }

    const allWallets = await prisma.wallet.findMany({ include: { user: true } });
    for (const w of allWallets) {
      const escrowHeld = posterEscrowMap[w.userId] || 0;
      const lockedBal = Number(w.lockedBalance || 0);

      if (escrowHeld !== lockedBal) {
        console.log(` ⚠️ Poster [${w.user?.fullName || w.userId}]: Escrow HOLDING = ${escrowHeld.toLocaleString('vi-VN')}đ | Wallet lockedBalance = ${lockedBal.toLocaleString('vi-VN')}đ (Chênh lệch: ${(escrowHeld - lockedBal).toLocaleString('vi-VN')}đ)`);
      }
    }
  } else {
    console.log('🟢 Cả 2 con số ĐÃ TRÙNG KHỚP 100% TRONG DATABASE!');
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
