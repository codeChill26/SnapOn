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
  console.log('⚡ Bắt đầu đồng bộ 100% tuyệt đối Toán Học Số Dư cho TOÀN BỘ VÍ NGƯỜI DÙNG...');

  const wallets = await prisma.wallet.findMany({
    include: {
      transactions: true,
      user: true,
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

    // Active holding escrows
    const holdingEscrows = await prisma.escrow.findMany({
      where: { posterId: wallet.userId, status: 'HOLDING' }
    });

    let exactLocked = 0;
    for (const e of holdingEscrows) {
      exactLocked += Number(e.amount || 0);
    }

    // Exact balance equation:
    // Total Balance = Deposits + Job Earnings + Refunds - Holds
    const exactTotalBalance = Math.max(0, totalDeposits + totalJobEarnings + totalRefunds - totalHolds);
    const exactAvailableBalance = Math.max(0, exactTotalBalance - exactLocked);

    // Update DB
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: exactTotalBalance,
        availableBalance: exactAvailableBalance,
        lockedBalance: exactLocked,
      }
    });

    updatedCount++;
    if (wallet.user?.fullName?.includes('Huỳnh') || wallet.user?.email?.includes('tuankietpro')) {
      console.log(`🎯 HUỲNH RECONCILED: Balance=${exactTotalBalance.toLocaleString('vi-VN')}đ | Available=${exactAvailableBalance.toLocaleString('vi-VN')}đ | Locked=${exactLocked.toLocaleString('vi-VN')}đ (PayOS ${totalDeposits.toLocaleString('vi-VN')} + Task ${totalJobEarnings.toLocaleString('vi-VN')} - Hold ${totalHolds.toLocaleString('vi-VN')} = ${exactTotalBalance.toLocaleString('vi-VN')}đ)`);
    }
  }

  console.log('\n==================================================');
  console.log('✅ ĐÃ ĐỒNG BỘ 100% TUYỆT ĐỐI TOÁN HỌC CHO TOÀN BỘ VÍ!');
  console.log(`👤 Đã cập nhật ${updatedCount} ví người dùng.`);
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
