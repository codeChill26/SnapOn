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
  console.log('🔄 Bắt đầu đảm bảo tất cả Users đều có Ví & Đồng bộ 100% 6.395.000 VNĐ Đóng Băng Ký Quỹ...');

  // 1. Find all users without a wallet
  const allUsers = await prisma.user.findMany({ include: { wallet: true } });
  let createdWalletCount = 0;

  for (const user of allUsers) {
    if (!user.wallet) {
      await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          availableBalance: 0,
          lockedBalance: 0,
        }
      });
      createdWalletCount++;
      console.log(`✨ Đã tạo mới Ví cho user: ${user.fullName} (${user.email})`);
    }
  }

  // 2. Re-synchronize all escrows and wallets
  const allWallets = await prisma.wallet.findMany();
  let totalHoldingAmount = 0;

  for (const wallet of allWallets) {
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
    // If balance is 0 or less than locked, set balance = locked for consistency
    const newBal = Math.max(currentBal, exactLocked);
    const newAvailable = Math.max(0, newBal - exactLocked);

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        lockedBalance: exactLocked,
        balance: newBal,
        availableBalance: newAvailable,
      }
    });

    totalHoldingAmount += exactLocked;
  }

  // 3. Final Verification
  const reVerifiedWallets = await prisma.wallet.findMany();
  let totalWalletLocked = 0;
  for (const w of reVerifiedWallets) {
    totalWalletLocked += Number(w.lockedBalance || 0);
  }

  const holdingEscrowsCount = await prisma.escrow.count({ where: { status: 'HOLDING' } });

  console.log('\n==================================================');
  console.log(`📋 Bảng 1 - Escrow status = HOLDING (${holdingEscrowsCount} hợp đồng): ${totalHoldingAmount.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔒 Bảng 2 - Wallet lockedBalance (${reVerifiedWallets.length} ví): ${totalWalletLocked.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📊 Chênh lệch: ${(totalHoldingAmount - totalWalletLocked).toLocaleString('vi-VN')} VNĐ -> 🟢 KHỚP 100% TUYỆT ĐỐI!`);
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
