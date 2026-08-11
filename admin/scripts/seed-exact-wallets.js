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

// Realistic non-round deposit amounts (odd amounts like 125k, 185k, 215k, 145k...)
const ODD_AMOUNTS = [
  125000, 185000, 215000, 145000, 195000, 165000, 235000, 175000,
  245000, 155000, 285000, 135000, 225000, 115000, 265000, 170000,
  190000, 210000, 160000, 180000, 230000, 140000, 255000, 130000
];

async function main() {
  console.log('💳 Đang đồng bộ số dư ví = 100% tiền nạp PayOS thực tế (Tổng ~9.400.000 VNĐ, lẻ số, locked = 0)...');

  // Clear existing wallet transactions
  await prisma.walletTransaction.deleteMany({});
  console.log('🧹 Đã dọn dẹp các giao dịch ví cũ...');

  const wallets = await prisma.wallet.findMany({
    include: { user: true }
  });

  console.log(`Tìm thấy ${wallets.length} ví người dùng...`);

  // Target sum = ~9,400,000 VNĐ
  const TARGET_TOTAL = 9400000;
  let currentTotal = 0;
  let orderCodeCounter = BigInt(2026080001);

  let updatedUserCount = 0;

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    
    // Stop adding deposits when target ~9.4M is reached
    if (currentTotal < TARGET_TOTAL && i < 50) {
      orderCodeCounter += BigInt(1);
      
      // Calculate remaining needed
      const remaining = TARGET_TOTAL - currentTotal;
      let depositAmount = ODD_AMOUNTS[i % ODD_AMOUNTS.length];
      
      if (depositAmount > remaining && remaining >= 50000) {
        depositAmount = remaining;
      } else if (remaining < 50000 && currentTotal > 9000000) {
        // Adjust last element to hit target exactly
        depositAmount = remaining;
      }

      if (depositAmount > 0) {
        currentTotal += depositAmount;
        updatedUserCount++;

        const userCreatedAt = new Date(wallet.user.createdAt);
        const created_at = new Date(userCreatedAt.getTime() + 1000 * 60 * 60 * 2); // 2 hours after registration

        // 1. Create PayOS Deposit Transaction
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEPOSIT',
            amount: depositAmount,
            status: 'SUCCESS',
            order_code: orderCodeCounter,
            created_at,
          }
        });

        // 2. Set Wallet Balance EQUAL TO 100% PayOS Deposit, lockedBalance = 0
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: depositAmount,
            availableBalance: depositAmount,
            lockedBalance: 0,
          }
        });
      } else {
        // Reset wallet balance to 0
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: 0, availableBalance: 0, lockedBalance: 0 }
        });
      }
    } else {
      // Reset remaining wallets to 0
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: 0, availableBalance: 0, lockedBalance: 0 }
      });
    }
  }

  console.log(`\n✅ Đã đồng bộ 100% khớp dữ liệu!`);
  console.log(`👤 Số tài khoản có tiền nạp: ${updatedUserCount}`);
  console.log(`💵 TỔNG TIỀN NẠP PAYOS: ${currentTotal.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🟢 TỔNG SỐ DƯ KHẢ DỤNG: ${currentTotal.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔒 TỔNG ĐÓNG BĂNG KÝ QUỸ: 0 VNĐ (chờ insert task)`);
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
