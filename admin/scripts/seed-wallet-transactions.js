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
  console.log('💳 Bắt đầu tạo lịch sử nạp tiền PayOS và biến động số dư ví cho người dùng...');

  // Get all wallets
  const wallets = await prisma.wallet.findMany({
    include: { user: true }
  });

  console.log(`Tìm thấy ${wallets.length} ví người dùng...`);

  let totalTxCount = 0;
  let orderCodeCounter = BigInt(1723000000);

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const userCreatedAt = new Date(wallet.user.createdAt);
    const now = new Date();

    // Generate 2-4 transactions per user
    const txCount = 2 + Math.floor(Math.random() * 3);

    for (let t = 0; t < txCount; t++) {
      orderCodeCounter += BigInt(1);
      
      // Calculate transaction time after user registration
      const timeOffset = (t + 1) * ((now.getTime() - userCreatedAt.getTime()) / (txCount + 1));
      const created_at = new Date(userCreatedAt.getTime() + timeOffset);

      // Determine transaction type
      // t === 0 => Always a PayOS DEPOSIT
      const type = t === 0 ? 'DEPOSIT' : (Math.random() < 0.6 ? 'DEPOSIT' : Math.random() < 0.7 ? 'ESCROW_HOLD' : 'ESCROW_RELEASE');
      const amount = Math.floor(1 + Math.random() * 20) * 100000; // 100k to 2M

      try {
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type,
            amount,
            status: 'SUCCESS',
            order_code: type === 'DEPOSIT' ? orderCodeCounter : null,
            created_at,
          }
        });
        totalTxCount++;
      } catch (err) {
        // Ignore duplicate order_code if any
      }
    }
  }

  console.log(`\n✅ Đã tạo thành công ${totalTxCount} giao dịch ví & nạp tiền PayOS vào DB!`);
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
