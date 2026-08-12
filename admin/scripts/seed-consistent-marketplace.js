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

// High-definition category images
const CATEGORY_IMAGES = {
  ELECTRICITY: [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=600&q=80',
  ],
  CLEANING: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80',
  ],
  DELIVERY: [
    'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
  ],
  DESIGN: [
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1542744094-3a317272018a?auto=format&fit=crop&w=600&q=80',
  ],
  PLUMBING: [
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
  ],
  DEFAULT: [
    'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
  ]
};

// Diversity of Task Templates across categories
const TASK_TITLE_BASES = [
  { title: 'Sửa chữa đường điện âm tường & thay aptomat', type: 'ELECTRICITY', min: 250000, max: 450000 },
  { title: 'Dọn dẹp vệ sinh căn hộ chung cư 2 phòng ngủ', type: 'CLEANING', min: 300000, max: 500000 },
  { title: 'Thiết kế logo & nhận diện thương hiệu cửa hàng', type: 'DESIGN', min: 600000, max: 1200000 },
  { title: 'Sửa rò rỉ ống nước & vòi xịt nhà vệ sinh', type: 'PLUMBING', min: 200000, max: 350000 },
  { title: 'Giao hàng hỏa tốc hợp đồng niêm phong', type: 'DELIVERY', min: 120000, max: 200000 },
  { title: 'Lắp đặt camera IP an ninh không dây', type: 'ELECTRICITY', min: 500000, max: 900000 },
  { title: 'Giặt thảm phòng khách & sofa nỉ cao cấp', type: 'CLEANING', min: 400000, max: 700000 },
  { title: 'Thiết kế UI/UX Landing Page quảng cáo', type: 'DESIGN', min: 800000, max: 1500000 },
  { title: 'Thông tắc bồn cầu & đường xả sàn balcony', type: 'PLUMBING', min: 250000, max: 450000 },
  { title: 'Chụp ảnh sản phẩm món ăn đăng ShopeeFood', type: 'DESIGN', min: 500000, max: 900000 },
  { title: 'Sửa máy giặt lồng ngang không vắt xả', type: 'ELECTRICITY', min: 350000, max: 600000 },
  { title: 'Chuyển trọ sinh viên xe bán tải nhỏ', type: 'DELIVERY', min: 300000, max: 550000 },
  { title: 'Tẩy rửa vệ sinh máy lạnh inverter 1.5HP', type: 'CLEANING', min: 200000, max: 350000 },
  { title: 'Lắp máy lọc nước âm gầm bếp gia đình', type: 'PLUMBING', min: 200000, max: 300000 },
  { title: 'Vẽ minh họa Mascot nhân vật quà tặng', type: 'DESIGN', min: 500000, max: 850000 },
];

async function main() {
  console.log('🔄 Bắt đầu dọn dẹp & tạo mới 65 Giao dịch / Công việc nhất quán 100% số dư...');

  // 1. Wipe old data
  await prisma.escrow.deleteMany({});
  await prisma.assignedTask.deleteMany({});
  await prisma.taskApplication.deleteMany({});
  await prisma.taskLocation.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  console.log('🧹 Đã dọn dẹp toàn bộ dữ liệu Task, Escrow và Transaction cũ...');

  // 2. Fetch categories and users
  const categories = await prisma.category.findMany();
  const users = await prisma.user.findMany({ include: { wallet: true } });

  if (categories.length === 0 || users.length < 2) {
    console.error('❌ Cần ít nhất 1 category và 2 users trong DB!');
    process.exit(1);
  }

  // 3. Reset all user wallets to 0 initial balances
  for (const u of users) {
    if (u.wallet) {
      await prisma.wallet.update({
        where: { id: u.wallet.id },
        data: { balance: 0, availableBalance: 0, lockedBalance: 0 }
      });
    }
  }

  const now = new Date();
  let totalPayOSDeposits = 0;
  let totalGMV = 0;
  let totalPlatformFee = 0;
  let totalTaskerNet = 0;

  let totalHoldingEscrow = 0;
  let totalReleasedEscrow = 0;
  let totalRefundedEscrow = 0;

  let orderCodeCounter = BigInt(2026081001);

  // We will generate 65 tasks
  const TOTAL_TASKS = 65;

  for (let i = 0; i < TOTAL_TASKS; i++) {
    const template = TASK_TITLE_BASES[i % TASK_TITLE_BASES.length];
    const category = categories[i % categories.length];

    // Poster and Tasker selection
    const posterIndex = i % users.length;
    const taskerIndex = (i + 1) % users.length;

    const poster = users[posterIndex];
    const tasker = users[taskerIndex];

    // Pick task amount (e.g. 185k, 245k, 320k, 450k, 650k...)
    const basePrice = template.min + Math.floor(Math.random() * (template.max - template.min));
    // Ensure odd non-round amounts
    const amount = Math.floor(basePrice / 5000) * 5000 + (i % 2 === 0 ? 5000 : 0);

    // Calculate dates spread over last 30 days
    const daysAgo = 29 - Math.floor(i * (29 / TOTAL_TASKS));
    const createdAt = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) + (i * 1000 * 60 * 15));

    // Determine status distribution:
    // ~55% COMPLETED (RELEASED), ~30% IN_PROGRESS (HOLDING), ~15% CANCELLED (REFUNDED)
    let taskStatus = 'COMPLETED';
    let escrowStatus = 'RELEASED';

    if (i % 3 === 1) {
      taskStatus = 'IN_PROGRESS';
      escrowStatus = 'HOLDING';
    } else if (i % 7 === 0) {
      taskStatus = 'CANCELLED';
      escrowStatus = 'REFUNDED';
    }

    // Step A: Ensure Poster has deposited SUFFICIENT PayOS funds BEFORE or FOR posting this task!
    // Poster deposits (amount + extra buffer for wallet balance)
    const extraBuffer = (i % 3) * 50000 + 100000; // Extra buffer so available balance isn't zero
    const posterDepositAmount = amount + extraBuffer;

    orderCodeCounter += BigInt(1);
    totalPayOSDeposits += posterDepositAmount;

    // Create PayOS Deposit for Poster
    const posterWallet = await prisma.wallet.findUnique({ where: { userId: poster.id } });
    if (posterWallet) {
      await prisma.walletTransaction.create({
        data: {
          walletId: posterWallet.id,
          type: 'DEPOSIT',
          amount: posterDepositAmount,
          status: 'SUCCESS',
          order_code: orderCodeCounter,
          created_at: new Date(createdAt.getTime() - 1000 * 60 * 30), // 30 mins before task creation
        }
      });

      // Update Poster Wallet balance initially
      await prisma.wallet.update({
        where: { id: posterWallet.id },
        data: {
          balance: { increment: posterDepositAmount },
          availableBalance: { increment: posterDepositAmount }
        }
      });
    }

    // Step B: Create Task Record
    const images = CATEGORY_IMAGES[template.type] || CATEGORY_IMAGES.DEFAULT;
    const task = await prisma.task.create({
      data: {
        posterId: poster.id,
        categoryId: category.id,
        title: `${template.title} #${i + 1}`,
        description: `Yêu cầu làm công việc ${template.title.toLowerCase()} chi tiết tại TP.HCM. Cần làm cẩn thận, đúng tiến độ.`,
        taskType: 'OFFLINE',
        status: taskStatus,
        budgetMin: template.min,
        budgetMax: template.max,
        finalPrice: amount,
        images,
        workMode: 'ONSITE',
        createdAt,
        updatedAt: createdAt,
        contactPhone: poster.phone || '0908123456',
        locations: {
          create: {
            address: `Quận ${(i % 12) + 1}, Thành phố Hồ Chí Minh`,
            locationType: 'ONSITE'
          }
        }
      }
    });

    // Step C: Calculate 8% Platform Fee and 92% Tasker Net
    const platformFeeAmount = Math.round(amount * 0.08);
    const taskerNet = amount - platformFeeAmount;

    // Create Escrow Record
    await prisma.escrow.create({
      data: {
        taskId: task.id,
        posterId: poster.id,
        taskerId: tasker.id,
        amount,
        platformFeeAmount,
        insuranceFeeAmount: 0,
        status: escrowStatus,
      }
    });

    // Step D: Reconcile Wallet Balances STRICTLY according to Escrow Status
    if (posterWallet) {
      if (escrowStatus === 'HOLDING') {
        // HOLDING: Poster's availableBalance decreases by amount, lockedBalance increases by amount
        await prisma.wallet.update({
          where: { id: posterWallet.id },
          data: {
            availableBalance: { decrement: amount },
            lockedBalance: { increment: amount }
          }
        });
        totalHoldingEscrow += amount;
      } else if (escrowStatus === 'RELEASED') {
        // RELEASED: Poster paid amount out of wallet balance. Tasker receives 92%
        await prisma.wallet.update({
          where: { id: posterWallet.id },
          data: {
            balance: { decrement: amount },
            availableBalance: { decrement: amount }
          }
        });

        const taskerWallet = await prisma.wallet.findUnique({ where: { userId: tasker.id } });
        if (taskerWallet) {
          await prisma.wallet.update({
            where: { id: taskerWallet.id },
            data: {
              balance: { increment: taskerNet },
              availableBalance: { increment: taskerNet }
            }
          });
        }
        totalReleasedEscrow += amount;
      } else if (escrowStatus === 'REFUNDED') {
        // REFUNDED: Money stays in Poster's available balance
        totalRefundedEscrow += amount;
      }
    }

    totalGMV += amount;
    totalPlatformFee += platformFeeAmount;
    totalTaskerNet += taskerNet;
  }

  // Calculate final aggregate wallet checks
  const allWallets = await prisma.wallet.findMany();
  let finalTotalBalance = 0;
  let finalAvailableBalance = 0;
  let finalLockedBalance = 0;

  for (const w of allWallets) {
    finalTotalBalance += Number(w.balance || 0);
    finalAvailableBalance += Number(w.availableBalance || 0);
    finalLockedBalance += Number(w.lockedBalance || 0);
  }

  console.log('\n==================================================');
  console.log('✅ HOÀN TẤT ĐỒNG BỘ 100% MARKETPLACE & TÀI CHÍNH!');
  console.log(`📋 Tổng số bài đăng công việc & giao dịch: ${TOTAL_TASKS}`);
  console.log(`💳 TỔNG TIỀN NẠP PAYOS: ${totalPayOSDeposits.toLocaleString('vi-VN')} VNĐ`);
  console.log(`--------------------------------------------------`);
  console.log(`💵 TỔNG GIAO DỊCH KÝ QUỸ (GROSS GMV 100%): ${totalGMV.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📈 TỔNG DOANH THU PHÍ NỀN TẢNG (8% SNAPON): ${totalPlatformFee.toLocaleString('vi-VN')} VNĐ`);
  console.log(`👷 TỔNG THỰC NHẬN NGƯỜI LÀM (92% TASKER NET): ${totalTaskerNet.toLocaleString('vi-VN')} VNĐ`);
  console.log(`--------------------------------------------------`);
  console.log(`🔒 ĐANG ĐÓNG BĂNG KÝ QUỸ (HOLDING): ${totalHoldingEscrow.toLocaleString('vi-VN')} VNĐ`);
  console.log(`✅ ĐÃ GIẢI NGÂN (RELEASED): ${totalReleasedEscrow.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔄 ĐÃ HOÀN TRẢ (REFUNDED): ${totalRefundedEscrow.toLocaleString('vi-VN')} VNĐ`);
  console.log(`--------------------------------------------------`);
  console.log(`📊 ĐỐI SOÁT VÍ TỔNG THỰC TẾ:`);
  console.log(`   - Tổng Số Dư Ví (Total Balance): ${finalTotalBalance.toLocaleString('vi-VN')} VNĐ`);
  console.log(`   - Số Dư Khả Dụng (Available): ${finalAvailableBalance.toLocaleString('vi-VN')} VNĐ`);
  console.log(`   - Số Dư Đóng Băng (Locked Balance): ${finalLockedBalance.toLocaleString('vi-VN')} VNĐ`);
  console.log(`   => ĐỐI SOÁT ĐÓNG BĂNG: HOLDING (${totalHoldingEscrow.toLocaleString('vi-VN')}) === LOCKED BALANCE (${finalLockedBalance.toLocaleString('vi-VN')}) -> ${totalHoldingEscrow === finalLockedBalance ? '🟢 MATCH 100%' : '❌ MISMATCH'}`);
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
