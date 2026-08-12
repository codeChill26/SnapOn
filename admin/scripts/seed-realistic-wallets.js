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
  console.log('💳 Đang điều chỉnh số dư ví & nạp tiền PayOS thực tế (Tổng ~10.000.000 VNĐ)...');

  // Clear existing wallet transactions
  await prisma.walletTransaction.deleteMany({});
  console.log('🧹 Đã xóa toàn bộ giao dịch ví cũ...');

  const wallets = await prisma.wallet.findMany({
    include: { user: true }
  });

  console.log(`Tìm thấy ${wallets.length} tài khoản người dùng...`);

  let totalDepositedAmount = 0;
  let orderCodeCounter = BigInt(2026080001);

  // Distribute ~10,000,000 VNĐ total deposits across ~60 users
  // Each depositing user gets 1-2 deposit transactions of 100,000đ, 150,000đ, 200,000đ, 250,000đ, 300,000đ
  const DEPOSIT_AMOUNTS = [100000, 150000, 200000, 250000, 300000, 500000];

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const userCreatedAt = new Date(wallet.user.createdAt);
    const now = new Date();

    // 85% of users have deposits
    if (Math.random() < 0.85) {
      const txCount = Math.random() < 0.7 ? 1 : 2; // 1 or 2 deposits
      let userTotalBalance = 0;

      for (let t = 0; t < txCount; t++) {
        orderCodeCounter += BigInt(1);
        const amount = DEPOSIT_AMOUNTS[Math.floor(Math.random() * DEPOSIT_AMOUNTS.length)];
        userTotalBalance += amount;
        totalDepositedAmount += amount;

        // Calculate timestamp spread over last 30 days
        const timeOffset = (t + 1) * ((now.getTime() - userCreatedAt.getTime()) / (txCount + 1));
        const created_at = new Date(userCreatedAt.getTime() + timeOffset);

        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEPOSIT',
            amount,
            status: 'SUCCESS',
            order_code: orderCodeCounter,
            created_at,
          }
        });
      }

      // Update wallet balance
      const lockedBalance = Math.random() < 0.3 ? Math.min(100000, userTotalBalance) : 0;
      const availableBalance = userTotalBalance - lockedBalance;

      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: userTotalBalance,
          availableBalance,
          lockedBalance,
        }
      });
    } else {
      // Zero balance for new un-deposited users
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: 0,
          availableBalance: 0,
          lockedBalance: 0,
        }
      });
    }
  }

  console.log(`\n✅ Hoàn tất điều chỉnh dữ liệu ví!`);
  console.log(`💰 Tổng tiền nạp PayOS thực tế: ${totalDepositedAmount.toLocaleString('vi-VN')} VNĐ`);
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
