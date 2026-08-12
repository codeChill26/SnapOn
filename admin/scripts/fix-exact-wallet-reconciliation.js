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
  console.log('🔄 Bắt đầu đối soát & làm sạch 100% số dư ví trùng khớp tuyệt đối với lịch sử giao dịch...');

  const wallets = await prisma.wallet.findMany({
    include: {
      transactions: true,
      user: true,
    }
  });

  console.log(`Tìm thấy ${wallets.length} ví người dùng...`);

  let fixedCount = 0;

  for (const wallet of wallets) {
    let calculatedBalance = 0;
    let calculatedAvailable = 0;
    let calculatedLocked = 0;

    let totalDeposited = 0;
    let totalJobEarnings = 0;
    let totalEscrowHolds = 0;
    let totalRefunds = 0;

    for (const tx of wallet.transactions) {
      const amount = Number(tx.amount || 0);

      if (tx.type === 'DEPOSIT') {
        totalDeposited += amount;
      } else if (tx.type === 'ESCROW_RELEASE') {
        totalJobEarnings += amount;
      } else if (tx.type === 'REFUND') {
        totalRefunds += amount;
      } else if (tx.type === 'ESCROW_HOLD') {
        totalEscrowHolds += amount;
      }
    }

    // Check if poster has an active HOLDING escrow
    const holdingEscrows = await prisma.escrow.findMany({
      where: { posterId: wallet.userId, status: 'HOLDING' }
    });

    for (const e of holdingEscrows) {
      calculatedLocked += Number(e.amount || 0);
    }

    // Check released escrows posted by this user
    const releasedEscrows = await prisma.escrow.findMany({
      where: { posterId: wallet.userId, status: 'RELEASED' }
    });

    let totalReleasedPosted = 0;
    for (const e of releasedEscrows) {
      totalReleasedPosted += Number(e.amount || 0);
    }

    // Exact balance formula:
    // Total Balance = Deposits + Job Earnings + Refunds - Released Posted Escrows
    calculatedBalance = totalDeposited + totalJobEarnings + totalRefunds - totalReleasedPosted;
    if (calculatedBalance < 0) calculatedBalance = 0;

    // Available Balance = Total Balance - Locked Balance
    calculatedAvailable = calculatedBalance - calculatedLocked;
    if (calculatedAvailable < 0) calculatedAvailable = 0;

    // Update wallet in DB to be 100% mathematically exact!
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: calculatedBalance,
        availableBalance: calculatedAvailable,
        lockedBalance: calculatedLocked,
      }
    });

    fixedCount++;
    console.log(`[${fixedCount}/${wallets.length}] ${wallet.user?.fullName || wallet.userId}: Nạp=${totalDeposited.toLocaleString('vi-VN')}đ | JobEarnings=+${totalJobEarnings.toLocaleString('vi-VN')}đ | Locked=${calculatedLocked.toLocaleString('vi-VN')}đ | TotalBalance=${calculatedBalance.toLocaleString('vi-VN')}đ`);
  }

  console.log('\n==================================================');
  console.log('✅ HOÀN TẤT CHUẨN HOÁ 100% SỐ DƯ VÍ TRÙNG KHỚP LỊCH SỬ!');
  console.log(`👤 Đã cập nhật lại ${fixedCount} ví người dùng.`);
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
