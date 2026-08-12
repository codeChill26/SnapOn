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
  console.log('🔍 Kiểm tra từng ví người dùng để tìm lỗi bất cân bằng (balance != available + locked)...');

  const wallets = await prisma.wallet.findMany({
    include: {
      user: { select: { fullName: true, email: true } },
      transactions: true
    }
  });

  let misalignedWallets = 0;

  for (const w of wallets) {
    const bal = Number(w.balance || 0);
    const avail = Number(w.availableBalance || 0);
    const locked = Number(w.lockedBalance || 0);

    // 1. Internal wallet consistency check: balance MUST equal availableBalance + lockedBalance
    if (bal !== avail + locked) {
      console.log(`⚠️ MISALIGNMENT in Wallet [${w.user?.fullName} | ${w.user?.email}]:`);
      console.log(`   balance (${bal.toLocaleString()}) != available (${avail.toLocaleString()}) + locked (${locked.toLocaleString()}) [Sum = ${(avail + locked).toLocaleString()}]`);
      misalignedWallets++;
    }

    // 2. Transaction sum check
    let txDeposits = 0;
    let txTaskerEarnings = 0;
    let txHolds = 0;
    let txRefunds = 0;

    for (const tx of w.transactions) {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'DEPOSIT') txDeposits += amt;
      else if (tx.type === 'ESCROW_RELEASE') txTaskerEarnings += amt;
      else if (tx.type === 'ESCROW_HOLD') txHolds += amt;
      else if (tx.type === 'REFUND') txRefunds += amt;
    }

    const calculatedTotalBalance = txDeposits + txTaskerEarnings + txRefunds - txHolds;
    if (bal !== calculatedTotalBalance) {
      console.log(`❌ TX SUM MISMATCH in Wallet [${w.user?.fullName} | ${w.user?.email}]:`);
      console.log(`   DB balance (${bal.toLocaleString()}) != Calculated Tx Sum (${calculatedTotalBalance.toLocaleString()}) [Deposits: ${txDeposits.toLocaleString()} + Earnings: ${txTaskerEarnings.toLocaleString()} + Refunds: ${txRefunds.toLocaleString()} - Holds: ${txHolds.toLocaleString()}]`);
    }
  }

  console.log(`\nFound ${misalignedWallets} misaligned wallets.`);
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
