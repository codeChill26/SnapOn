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

// Category Images
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

// 65 Small Realistic Task Price templates targeting ~15.3M GMV (8% = ~1.224M Revenue)
const TASK_TITLE_BASES = [
  { title: 'Sửa đường điện âm tường & thay aptomat', type: 'ELECTRICITY', min: 120000, max: 250000 },
  { title: 'Dọn dẹp vệ sinh căn hộ chung cư 2 phòng ngủ', type: 'CLEANING', min: 180000, max: 320000 },
  { title: 'Thiết kế logo & nhận diện SnapOn đơn giản', type: 'DESIGN', min: 250000, max: 450000 },
  { title: 'Sửa rò rỉ vòi xịt & ống nước xả rửa', type: 'PLUMBING', min: 100000, max: 200000 },
  { title: 'Giao hàng hỏa tốc hợp đồng niêm phong', type: 'DELIVERY', min: 85000, max: 150000 },
  { title: 'Lắp đặt 2 camera IP an ninh không dây', type: 'ELECTRICITY', min: 220000, max: 380000 },
  { title: 'Giặt thảm phòng khách & ghế sofa đơn', type: 'CLEANING', min: 200000, max: 350000 },
  { title: 'Thiết kế banner & avatar mạng xã hội', type: 'DESIGN', min: 180000, max: 300000 },
  { title: 'Thông tắc bồn rửa chén & xả sàn balcony', type: 'PLUMBING', min: 130000, max: 220000 },
  { title: 'Chụp ảnh 10 món ăn đăng ShopeeFood', type: 'DESIGN', min: 250000, max: 400000 },
  { title: 'Sửa quạt máy giặt lồng ngang không quay', type: 'ELECTRICITY', min: 150000, max: 280000 },
  { title: 'Chuyển 3 thùng đồ sinh viên đi Q.10', type: 'DELIVERY', min: 120000, max: 220000 },
  { title: 'Vệ sinh bảo dưỡng máy lạnh 1.5HP', type: 'CLEANING', min: 150000, max: 250000 },
  { title: 'Lắp dây máy lọc nước âm tủ bếp', type: 'PLUMBING', min: 110000, max: 190000 },
  { title: 'Vẽ 1 dáng Mascot nhân vật hoạt hình', type: 'DESIGN', min: 200000, max: 350000 },
];

async function main() {
  console.log('🔄 Bắt đầu căn chỉnh tài chính: 65 Task giá nhỏ -> Doanh thu 8% = ~1.200.000 VNĐ...');

  // 1. Clear old data
  await prisma.escrow.deleteMany({});
  await prisma.assignedTask.deleteMany({});
  await prisma.taskApplication.deleteMany({});
  await prisma.taskLocation.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  console.log('🧹 Đã dọn dẹp dữ liệu cũ...');

  // 2. Fetch categories and users
  const categories = await prisma.category.findMany();
  const users = await prisma.user.findMany({ include: { wallet: true } });

  if (categories.length === 0 || users.length < 2) {
    console.error('❌ Cần ít nhất 1 category và 2 users trong DB!');
    process.exit(1);
  }

  // 3. Reset all user wallets to 0
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

  let orderCodeCounter = BigInt(2026082001);
  const TOTAL_TASKS = 65;

  for (let i = 0; i < TOTAL_TASKS; i++) {
    const template = TASK_TITLE_BASES[i % TASK_TITLE_BASES.length];
    const category = categories[i % categories.length];

    const poster = users[i % users.length];
    const tasker = users[(i + 1) % users.length];

    // Calculate small task price (85k - 450k) so total sum = ~15.3M GMV
    const basePrice = template.min + Math.floor(Math.random() * (template.max - template.min));
    const amount = Math.floor(basePrice / 5000) * 5000 + (i % 2 === 0 ? 5000 : 0);

    const daysAgo = 29 - Math.floor(i * (29 / TOTAL_TASKS));
    const createdAt = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) + (i * 1000 * 60 * 15));

    // Status distribution: ~55% RELEASED, ~30% HOLDING, ~15% REFUNDED
    let taskStatus = 'COMPLETED';
    let escrowStatus = 'RELEASED';

    if (i % 3 === 1) {
      taskStatus = 'IN_PROGRESS';
      escrowStatus = 'HOLDING';
    } else if (i % 7 === 0) {
      taskStatus = 'CANCELLED';
      escrowStatus = 'REFUNDED';
    }

    // Poster deposits (amount + 30.000đ buffer for wallet available balance)
    const posterDepositAmount = amount + 30000;
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
          created_at: new Date(createdAt.getTime() - 1000 * 60 * 30),
        }
      });

      await prisma.wallet.update({
        where: { id: posterWallet.id },
        data: {
          balance: { increment: posterDepositAmount },
          availableBalance: { increment: posterDepositAmount }
        }
      });
    }

    // Create Task
    const images = CATEGORY_IMAGES[template.type] || CATEGORY_IMAGES.DEFAULT;
    const task = await prisma.task.create({
      data: {
        posterId: poster.id,
        categoryId: category.id,
        title: `${template.title} #${i + 1}`,
        description: `Cần thực hiện ${template.title.toLowerCase()} nhanh chóng tại TP.HCM.`,
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
            address: `Quận ${(i % 12) + 1}, TP. Hồ Chí Minh`,
            locationType: 'ONSITE'
          }
        }
      }
    });

    // 8% SnapOn Fee & 92% Tasker Net
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

    // Reconcile Wallet Balances
    if (posterWallet) {
      if (escrowStatus === 'HOLDING') {
        await prisma.wallet.update({
          where: { id: posterWallet.id },
          data: {
            availableBalance: { decrement: amount },
            lockedBalance: { increment: amount }
          }
        });
        totalHoldingEscrow += amount;
      } else if (escrowStatus === 'RELEASED') {
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
        totalRefundedEscrow += amount;
      }
    }

    totalGMV += amount;
    totalPlatformFee += platformFeeAmount;
    totalTaskerNet += taskerNet;
  }

  // Final check
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
  console.log('🎯 CĂN CHỈNH THÀNH CÔNG DOANH THU ~1.200.000 VNĐ & 65 TASKS GIÁ NHỎ!');
  console.log(`📋 Tổng số bài đăng công việc: ${TOTAL_TASKS}`);
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
  console.log(`📊 ĐỐI SOÁT ĐÓNG BĂNG BẢNG 1 & BẢNG 2:`);
  console.log(`   - Holding Escrow (Bảng 1): ${totalHoldingEscrow.toLocaleString('vi-VN')} VNĐ`);
  console.log(`   - Locked Balance (Bảng 2): ${finalLockedBalance.toLocaleString('vi-VN')} VNĐ`);
  console.log(`   => ĐỐI SOÁT: ${totalHoldingEscrow === finalLockedBalance ? '🟢 MATCH 100%' : '❌ MISMATCH'}`);
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
