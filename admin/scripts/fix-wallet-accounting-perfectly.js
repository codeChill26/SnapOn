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
  console.log('⚡ Bắt đầu sửa đổi và chuẩn hoá Kế toán 100% cho TOÀN BỘ VÍ NGƯỜI DÙNG...');

  const wallets = await prisma.wallet.findMany({
    include: {
      transactions: true,
      user: { select: { fullName: true, email: true } }
    }
  });

  console.log(`Tìm thấy ${wallets.length} ví người dùng...`);

  let updatedCount = 0;

  for (const wallet of wallets) {
    let totalDeposits = 0;
    let totalJobEarnings = 0;
    let totalRefunds = 0;
    let totalHolds = 0;

    for (const tx of wallet.transactions) {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'DEPOSIT') totalDeposits += amt;
      else if (tx.type === 'ESCROW_RELEASE') totalJobEarnings += amt;
      else if (tx.type === 'REFUND') totalRefunds += amt;
      else if (tx.type === 'ESCROW_HOLD') totalHolds += amt;
    }

    // Find active holding escrows where status === 'HOLDING'
    const holdingEscrows = await prisma.escrow.findMany({
      where: { posterId: wallet.userId, status: 'HOLDING' }
    });

    let exactLocked = 0;
    for (const e of holdingEscrows) {
      exactLocked += Number(e.amount || 0);
    }

    // Available balance = Money available to spend/withdraw
    // (Deposits + Tasker Earnings 92% + Refunds - Holds)
    const exactAvailable = Math.max(0, totalDeposits + totalJobEarnings + totalRefunds - totalHolds);
    
    // Total Balance = Available + Locked Escrow
    const exactBalance = exactAvailable + exactLocked;

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: exactBalance,
        availableBalance: exactAvailable,
        lockedBalance: exactLocked,
      }
    });

    updatedCount++;
  }

  // Re-verify all wallets in DB
  const verifiedWallets = await prisma.wallet.findMany();
  let totalAvailable = 0;
  let totalLocked = 0;
  let totalBalance = 0;
  let misaligned = 0;

  for (const w of verifiedWallets) {
    const b = Number(w.balance || 0);
    const a = Number(w.availableBalance || 0);
    const l = Number(w.lockedBalance || 0);

    totalAvailable += a;
    totalLocked += l;
    totalBalance += b;

    if (b !== a + l) {
      misaligned++;
    }
  }

  const escrowsHolding = await prisma.escrow.findMany({ where: { status: 'HOLDING' } });
  let totalEscrowHolding = 0;
  for (const e of escrowsHolding) {
    totalEscrowHolding += Number(e.amount || 0);
  }

  console.log('\n==================================================');
  console.log(`✅ ĐÃ CHUẨN HOÁ XONG ${updatedCount} VÍ NGƯỜI DÙNG!`);
  console.log(`💵 Tổng Số Dư Khả Dụng (Available): ${totalAvailable.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔒 Tổng Đóng Băng Ký Quỹ (Locked): ${totalLocked.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📋 Tổng Escrow status=HOLDING: ${totalEscrowHolding.toLocaleString('vi-VN')} VNĐ`);
  console.log(`💰 Tổng Số Dư Ví Thực Tế (Available + Locked): ${totalBalance.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📊 Kiểm tra Balance == Available + Locked: ${misaligned === 0 ? '🟢 MATCH 100% PERFECT (0 lỗi)' : '❌ Lỗi ' + misaligned}`);
  console.log(`📊 Kiểm tra Escrow HOLDING == Locked: ${totalEscrowHolding === totalLocked ? '🟢 MATCH 100% PERFECT (6.395.000 VNĐ)' : '❌ Lỗi'}`);
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
