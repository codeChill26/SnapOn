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
  console.log('🔍 Bắt đầu kiểm tra chi tiết các con số Kế Toán Ví...');

  // 1. All WalletTransactions
  const allTx = await prisma.walletTransaction.findMany();

  let sumAllDeposits = 0;
  let sumAllJobEarnings = 0;
  let sumAllEscrowHolds = 0;
  let sumAllRefunds = 0;

  for (const tx of allTx) {
    const amt = Number(tx.amount || 0);
    if (tx.type === 'DEPOSIT') sumAllDeposits += amt;
    else if (tx.type === 'ESCROW_RELEASE') sumAllJobEarnings += amt;
    else if (tx.type === 'ESCROW_HOLD') sumAllEscrowHolds += amt;
    else if (tx.type === 'REFUND') sumAllRefunds += amt;
  }

  // 2. All Wallets
  const allWallets = await prisma.wallet.findMany();
  let sumWalletBalance = 0;
  let sumWalletAvailable = 0;
  let sumWalletLocked = 0;

  for (const w of allWallets) {
    sumWalletBalance += Number(w.balance || 0);
    sumWalletAvailable += Number(w.availableBalance || 0);
    sumWalletLocked += Number(w.lockedBalance || 0);
  }

  // 3. Escrow Table
  const allEscrows = await prisma.escrow.findMany();
  let sumHoldingEscrows = 0;
  let sumReleasedEscrows = 0;
  let sumPlatformFees = 0;
  let sumTaskerNet = 0;

  for (const e of allEscrows) {
    const amt = Number(e.amount || 0);
    const fee = Number(e.platformFeeAmount || 0);
    if (e.status === 'HOLDING') {
      sumHoldingEscrows += amt;
    } else if (e.status === 'RELEASED') {
      sumReleasedEscrows += amt;
      sumPlatformFees += fee;
      sumTaskerNet += (amt - fee);
    }
  }

  console.log('==================================================');
  console.log(`💳 TỔNG NẠP PAYOS (Tất cả DEPOSIT tx): ${sumAllDeposits.toLocaleString('vi-VN')} VNĐ`);
  console.log(`👷 TỔNG THỰC NHẬN LÀM TASK (Tất cả ESCROW_RELEASE tx): ${sumAllJobEarnings.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔒 TỔNG ĐÓNG BĂNG KÝ QUỸ (Escrow status HOLDING): ${sumHoldingEscrows.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔒 TỔNG ĐÓNG BĂNG VÍ (Wallet.lockedBalance): ${sumWalletLocked.toLocaleString('vi-VN')} VNĐ`);
  console.log(`💵 TỔNG SỐ DƯ VÍ KHẢ DỤNG (Wallet.availableBalance): ${sumWalletAvailable.toLocaleString('vi-VN')} VNĐ`);
  console.log(`💰 TỔNG SỐ DƯ VÍ (Wallet.balance): ${sumWalletBalance.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📈 DOANH THU 8% SNAPON ĐÃ THU: ${sumPlatformFees.toLocaleString('vi-VN')} VNĐ`);
  console.log('==================================================');

  // Verify Equation:
  // Total Balance across all wallets MUST EQUAL:
  // Total Deposits + Total Tasker Earnings + Total Refunds - Total Released Escrows (Paid out by posters)
  const expectedTotalBalance = sumAllDeposits + sumAllJobEarnings + sumAllRefunds - sumReleasedEscrows;
  console.log(`\n🧮 PHÉP TÍNH KIỂM TRA ĐỐI SOÁT:`);
  console.log(`   Nạp PayOS (${sumAllDeposits.toLocaleString()}) + Thu Nhập Tasker (${sumAllJobEarnings.toLocaleString()}) - Ký Quỹ Đã Giải Ngân (${sumReleasedEscrows.toLocaleString()}) = ${expectedTotalBalance.toLocaleString()} VNĐ`);
  console.log(`   Tổng Số Dư Thực Tế Trong Bảng Ví = ${sumWalletBalance.toLocaleString()} VNĐ`);
  console.log(`   Chênh lệch = ${(sumWalletBalance - expectedTotalBalance).toLocaleString()} VNĐ -> ${sumWalletBalance === expectedTotalBalance ? '🟢 MATCH 100%' : '❌ MISMATCH'}`);
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
