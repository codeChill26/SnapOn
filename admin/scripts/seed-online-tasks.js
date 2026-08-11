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

// Pool of 65 UNIQUE high-definition Unsplash images specifically for Online/Digital jobs
const UNIQUE_ONLINE_IMAGES = [
  'https://images.unsplash.com/photo-1542744094-3a317272018a?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1508830524289-0adcbe822b40?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1526948128573-703ee1aeb6fa?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1579389083078-4e7018379f7e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1556742049-0a67ba308d7c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1522071901873-411886a10004?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1542744094-3a317272018a?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80'
];

// 65 Distinct Online/Remote Task Templates
const ONLINE_TASK_TEMPLATES = [
  { title: 'Thiết kế Logo & Bộ nhận diện thương hiệu SnapOn', min: 250000, max: 450000 },
  { title: 'Dịch thuật Hợp đồng Thương mại Việt - Anh 10 trang', min: 180000, max: 320000 },
  { title: 'Lập trình Landing Page Next.js & TailwindCSS', min: 350000, max: 600000 },
  { title: 'Chỉnh sửa Video TikTok / Reels ngắn 30 giây', min: 120000, max: 220000 },
  { title: 'Nhập dữ liệu Báo cáo Tài chính vào Excel / Google Sheets', min: 100000, max: 180000 },
  { title: 'Viết 5 bài blog chuẩn SEO chủ đề Công nghệ & AI', min: 200000, max: 350000 },
  { title: 'Tối ưu hình ảnh Sản phẩm & Thiết kế Banner Shopee', min: 150000, max: 280000 },
  { title: 'Thiết kế UI/UX Mobile App Marketplace trên Figma', min: 400000, max: 700000 },
  { title: 'Xây dựng kịch bản Video Marketing cho sản phẩm mới', min: 150000, max: 250000 },
  { title: 'Tạo Fanpage Facebook & Cài đặt Chatbot chăm sóc khách', min: 200000, max: 350000 },
  { title: 'Kiểm thử ứng dụng di động iOS/Android (Manual Testing)', min: 180000, max: 300000 },
  { title: 'Lập trình API Node.js / Express cho cổng thanh toán', min: 350000, max: 650000 },
  { title: 'Tư vấn & Tối ưu chuẩn SEO On-page cho Website', min: 220000, max: 400000 },
  { title: 'Thiết kế Slider Canva & Bộ bài đăng Instagram', min: 130000, max: 220000 },
  { title: 'Vẽ minh họa 2D Mascot nhân vật thương hiệu', min: 250000, max: 450000 },
  { title: 'Biên tập & Thu âm Giọng đọc Voiceover cho Quảng cáo', min: 150000, max: 280000 },
  { title: 'Cấu hình Server Nginx & SSL Certificate VPS Linux', min: 180000, max: 300000 },
  { title: 'Tổng hợp dữ liệu khảo sát thị trường từ Google Search', min: 100000, max: 180000 },
  { title: 'Thiết kế Slide thuyết trình Pitch Deck cho Startup', min: 250000, max: 450000 },
  { title: 'Lập trình Bot Telegram thông báo đơn hàng tự động', min: 200000, max: 350000 },
];

async function main() {
  console.log('💻 Bắt đầu chuyển đổi 100% Tasks sang ONLINE/REMOTE + Ảnh độc nhất nét cao...');

  // Wipe old tasks, escrows, locations, etc.
  await prisma.escrow.deleteMany({});
  await prisma.assignedTask.deleteMany({});
  await prisma.taskApplication.deleteMany({});
  await prisma.taskLocation.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  console.log('🧹 Đã dọn dẹp sạch dữ liệu cũ...');

  const categories = await prisma.category.findMany();
  const users = await prisma.user.findMany({ include: { wallet: true } });

  if (categories.length === 0 || users.length < 2) {
    console.error('❌ Cần ít nhất 1 category và 2 users!');
    process.exit(1);
  }

  // Reset all user wallets to 0
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

  let orderCodeCounter = BigInt(2026085001);
  const TOTAL_TASKS = 65;

  for (let i = 0; i < TOTAL_TASKS; i++) {
    const template = ONLINE_TASK_TEMPLATES[i % ONLINE_TASK_TEMPLATES.length];
    const category = categories[i % categories.length];

    const poster = users[i % users.length];
    const tasker = users[(i + 1) % users.length];

    const basePrice = template.min + Math.floor(Math.random() * (template.max - template.min));
    const amount = Math.floor(basePrice / 5000) * 5000 + (i % 2 === 0 ? 5000 : 0);

    const daysAgo = 29 - Math.floor(i * (29 / TOTAL_TASKS));
    const createdAt = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) + (i * 1000 * 60 * 15));

    let taskStatus = 'COMPLETED';
    let escrowStatus = 'RELEASED';

    if (i % 3 === 1) {
      taskStatus = 'IN_PROGRESS';
      escrowStatus = 'HOLDING';
    } else if (i % 7 === 0) {
      taskStatus = 'CANCELLED';
      escrowStatus = 'REFUNDED';
    }

    const taskTitleFull = `${template.title} #${i + 1}`;
    // Unique HD image URL for every task!
    const uniqueImageUrl = UNIQUE_ONLINE_IMAGES[i % UNIQUE_ONLINE_IMAGES.length];
    const images = [uniqueImageUrl];

    // Poster deposits task price + 50.000đ buffer
    const posterDepositAmount = amount + 50000;
    orderCodeCounter += BigInt(1);
    totalPayOSDeposits += posterDepositAmount;

    const posterWallet = await prisma.wallet.findUnique({ where: { userId: poster.id } });
    const taskerWallet = await prisma.wallet.findUnique({ where: { userId: tasker.id } });

    // Step 1: Poster PayOS Deposit
    if (posterWallet) {
      await prisma.walletTransaction.create({
        data: {
          walletId: posterWallet.id,
          type: 'DEPOSIT',
          amount: posterDepositAmount,
          status: 'SUCCESS',
          order_code: orderCodeCounter,
          created_at: new Date(createdAt.getTime() - 1000 * 60 * 45),
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

    // Step 2: Create ONLINE Task Record (taskType = ONLINE, workMode = REMOTE)
    const task = await prisma.task.create({
      data: {
        posterId: poster.id,
        categoryId: category.id,
        title: taskTitleFull,
        description: `Yêu cầu làm việc trực tuyến (Online Remote) cho bài đăng: ${template.title.toLowerCase()}. Báo cáo tiến độ và nộp sản phẩm qua ứng dụng SnapOn.`,
        taskType: 'ONLINE',
        status: taskStatus,
        budgetMin: template.min,
        budgetMax: template.max,
        finalPrice: amount,
        images,
        workMode: 'REMOTE',
        createdAt,
        updatedAt: createdAt,
        contactPhone: poster.phone || '0908123456',
        locations: {
          create: {
            address: 'Làm việc trực tuyến (Online Remote)',
            locationType: 'REMOTE'
          }
        }
      }
    });

    const platformFeeAmount = Math.round(amount * 0.08);
    const taskerNet = amount - platformFeeAmount;

    // Step 3: Create Escrow Record
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

    // Step 4: Escrow Holds & Payout Transactions
    if (posterWallet) {
      await prisma.walletTransaction.create({
        data: {
          walletId: posterWallet.id,
          type: 'ESCROW_HOLD',
          amount,
          status: 'SUCCESS',
          created_at: new Date(createdAt.getTime() - 1000 * 60 * 15),
        }
      });

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

        if (taskerWallet) {
          await prisma.walletTransaction.create({
            data: {
              walletId: taskerWallet.id,
              type: 'ESCROW_RELEASE',
              amount: taskerNet,
              status: 'SUCCESS',
              created_at: new Date(createdAt.getTime() + 1000 * 60 * 60 * 2),
            }
          });

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
        await prisma.walletTransaction.create({
          data: {
            walletId: posterWallet.id,
            type: 'REFUND',
            amount,
            status: 'SUCCESS',
            created_at: new Date(createdAt.getTime() + 1000 * 60 * 60 * 1),
          }
        });
        totalRefundedEscrow += amount;
      }
    }

    totalGMV += amount;
    totalPlatformFee += platformFeeAmount;
    totalTaskerNet += taskerNet;
  }

  // Aggregate checks
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
  console.log('💻 TẤT CẢ TASKS ĐÃ CHUYỂN SANG ONLINE/REMOTE + ẢNH ĐỘC NHẤT 100%!');
  console.log(`📋 Tổng bài đăng công việc ONLINE: ${TOTAL_TASKS}`);
  console.log(`💳 TỔNG NẠP PAYOS: ${totalPayOSDeposits.toLocaleString('vi-VN')} VNĐ`);
  console.log(`💵 TỔNG GMV KÝ QUỸ: ${totalGMV.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📈 DOANH THU 8% SNAPON: ${totalPlatformFee.toLocaleString('vi-VN')} VNĐ`);
  console.log(`👷 THỰC NHẬN TASKER 92%: ${totalTaskerNet.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔒 ĐÓNG BĂNG KÝ QUỸ (HOLDING): ${totalHoldingEscrow.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📊 ĐỐI SOÁT ĐÓNG BĂNG: HOLDING (${totalHoldingEscrow.toLocaleString('vi-VN')}) === LOCKED (${finalLockedBalance.toLocaleString('vi-VN')}) -> ${totalHoldingEscrow === finalLockedBalance ? '🟢 MATCH 100%' : '❌ MISMATCH'}`);
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
