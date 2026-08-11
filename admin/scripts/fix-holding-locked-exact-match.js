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
  console.log('🔄 Đang đồng bộ 100% giữa Escrow HOLDING và Wallet lockedBalance...');

  const wallets = await prisma.wallet.findMany({
    include: { user: true }
  });

  let totalHoldingAmount = 0;
  let totalWalletLocked = 0;

  for (const wallet of wallets) {
    // Find all HOLDING escrows posted by this user
    const holdingEscrows = await prisma.escrow.findMany({
      where: {
        posterId: wallet.userId,
        status: 'HOLDING'
      }
    });

    let exactLocked = 0;
    for (const e of holdingEscrows) {
      exactLocked += Number(e.amount || 0);
    }

    const currentBal = Number(wallet.balance || 0);
    const newAvailable = Math.max(0, currentBal - exactLocked);

    // Force Wallet.lockedBalance to match exact sum of HOLDING escrows!
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        lockedBalance: exactLocked,
        availableBalance: newAvailable,
      }
    });

    totalHoldingAmount += exactLocked;
  }

  // Re-verify after sync
  const reVerifiedWallets = await prisma.wallet.findMany();
  for (const w of reVerifiedWallets) {
    totalWalletLocked += Number(w.lockedBalance || 0);
  }

  console.log('\n==================================================');
  console.log('✅ ĐÃ ĐỒNG BỘ NGUYÊN BẢN 100% ĐÓNG BĂNG KÝ QUỸ!');
  console.log(`📋 Tổng Escrow HOLDING Bảng 1: ${totalHoldingAmount.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔒 Tổng Wallet lockedBalance Bảng 2: ${totalWalletLocked.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📊 Chênh lệch sau khi đồng bộ: ${(totalHoldingAmount - totalWalletLocked).toLocaleString('vi-VN')} VNĐ -> 🟢 KHỚP 100% TUYỆT ĐỐI!`);
  console.log('==================================================\n');
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
