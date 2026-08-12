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

// High-definition Unsplash images mapped to specific task categories
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

// Realistic tasks templates
const TASK_TEMPLATES = [
  {
    title: 'Sửa chữa đường điện âm tường & lắp ổ cắm thông minh',
    desc: 'Cần thợ điện có tay nghề đến kiểm tra đường dây bị chập áp aptomat và thay mới 4 ổ cắm âm tường tại Q.3, TP.HCM.',
    type: 'ELECTRICITY',
    budgetMin: 350000,
    budgetMax: 500000,
    amount: 450000,
    workMode: 'ONSITE',
  },
  {
    title: 'Dọn dẹp tổng vệ sinh nhà 3 tầng ăn Tết / đón khách',
    desc: 'Tìm 2 nữ dọn dẹp vệ sinh nhà phố 3 tầng, hút bụi, lau kính, làm sạch bếp và nhà vệ sinh trong 4 tiếng.',
    type: 'CLEANING',
    budgetMin: 400000,
    budgetMax: 600000,
    amount: 500000,
    workMode: 'ONSITE',
  },
  {
    title: 'Thiết kế bộ nhận diện thương hiệu & Logo nhận diện SnapOn',
    desc: 'Cần Designer thiết kế lại bộ Logo vector, Card visit và Banner mạng xã hội chuẩn nhận diện thương hiệu hiện đại.',
    type: 'DESIGN',
    budgetMin: 800000,
    budgetMax: 1500000,
    amount: 1200000,
    workMode: 'REMOTE',
  },
  {
    title: 'Sửa bồn rửa bát bị rò rỉ nước & thay vòi hoa sen',
    desc: 'Bồn rửa bát dưới bếp bị ngấm nước đường ống xả. Cần thợ ống nước qua xử lý triệt để trong ngày.',
    type: 'PLUMBING',
    budgetMin: 250000,
    budgetMax: 400000,
    amount: 350000,
    workMode: 'ONSITE',
  },
  {
    title: 'Vận chuyển giao hồ sơ hợp đồng gấp từ Bình Thạnh đi Q.1',
    desc: 'Giao tài liệu niêm phong gấp trong vòng 45 phút, cần tài xế giao hàng cẩn thận, có chụp ảnh xác nhận.',
    type: 'DELIVERY',
    budgetMin: 100000,
    budgetMax: 180000,
    amount: 150000,
    workMode: 'ONSITE',
  },
  {
    title: 'Lắp đặt hệ thống camera an ninh 4 mắt cho cửa hàng',
    desc: 'Lắp 4 mắt camera IP không dây, đi dây nguồn gọn gàng và cài đặt xem ứng dụng trên điện thoại.',
    type: 'ELECTRICITY',
    budgetMin: 900000,
    budgetMax: 1500000,
    amount: 1200000,
    workMode: 'ONSITE',
  },
  {
    title: 'Lau kính mặt ngoài & Vệ sinh sofa vải cao cấp',
    desc: 'Giặt khô sofa phòng khách và vệ sinh cửa kính chung cư tầng cao sạch sẽ chuyên nghiệp.',
    type: 'CLEANING',
    budgetMin: 500000,
    budgetMax: 800000,
    amount: 650000,
    workMode: 'ONSITE',
  },
  {
    title: 'Thiết kế UI/UX Mobile App Marketplace SnapOn',
    desc: 'Thiết kế 5 màn hình chính ứng dụng di động tìm việc củng cố giao diện mượt mà trên Figma.',
    type: 'DESIGN',
    budgetMin: 1500000,
    budgetMax: 2500000,
    amount: 2000000,
    workMode: 'REMOTE',
  },
  {
    title: 'Thông tắc đường ống thoát nước ban công & máy giặt',
    desc: 'Đường ống thoát nước mưa ngoài ban công bị nghẽn đọng nước. Cần máy lò xo thông tắc nhanh.',
    type: 'PLUMBING',
    budgetMin: 300000,
    budgetMax: 500000,
    amount: 400000,
    workMode: 'ONSITE',
  },
  {
    title: 'Chụp ảnh sản phẩm đồ ăn menu nhà hàng đăng ShopeeFood',
    desc: 'Cần thợ chụp ảnh có đèn chiếu sáng chuyên nghiệp chụp 15 món ăn làm menu đăng bài trên ứng dụng.',
    type: 'DESIGN',
    budgetMin: 700000,
    budgetMax: 1200000,
    amount: 900000,
    workMode: 'ONSITE',
  },
  {
    title: 'Sửa tủ lạnh side-by-side không làm lạnh ngăn mát',
    desc: 'Tủ lạnh LG vẫn chạy quạt nhưng ngăn dưới không mát. Cần thợ điện lạnh qua kiểm tra ga và quạt gió.',
    type: 'ELECTRICITY',
    budgetMin: 450000,
    budgetMax: 800000,
    amount: 600000,
    workMode: 'ONSITE',
  },
  {
    title: 'Vận chuyển chuyển đồ trọ sinh viên từ Thủ Đức về Q.10',
    desc: 'Chuyển 5 thùng đồ, 1 tủ quần áp vải và 1 xe máy. Cần xe bán tải nhỏ và 1 bốc xếp hỗ trợ.',
    type: 'DELIVERY',
    budgetMin: 350000,
    budgetMax: 600000,
    amount: 450000,
    workMode: 'ONSITE',
  },
  {
    title: 'Tẩy rửa giặt rèm cửa căn hộ penthouse 120m2',
    desc: 'Tháo rèm mang đi giặt hấp và treo lại hoàn thiện trong vòng 24 giờ cho chủ nhà.',
    type: 'CLEANING',
    budgetMin: 700000,
    budgetMax: 1100000,
    amount: 850000,
    workMode: 'ONSITE',
  },
  {
    title: 'Lắp máy lọc nước RO 9 lõi âm tủ bếp',
    desc: 'Khoan mặt đá nhân tạo bếp và kết nối đường cấp xả nước cho máy lọc nước Karofi.',
    type: 'PLUMBING',
    budgetMin: 200000,
    budgetMax: 350000,
    amount: 280000,
    workMode: 'ONSITE',
  },
  {
    title: 'Vẽ minh họa Mascot nhân vật hoạt hình SnapOn',
    desc: 'Vẽ 3 dáng nhân vật hoạt hình linh vật SnapOn chuẩn 2Dvector màu sắc tươi sáng.',
    type: 'DESIGN',
    budgetMin: 600000,
    budgetMax: 1000000,
    amount: 800000,
    workMode: 'REMOTE',
  }
];

async function main() {
  console.log('🚀 Bắt đầu Insert dữ liệu Công Việc (Tasks) kèm Ảnh nét ứng với Danh mục & Đối soát Ký quỹ...');

  // Clear existing tasks, applications, escrows
  await prisma.escrow.deleteMany({});
  await prisma.assignedTask.deleteMany({});
  await prisma.taskApplication.deleteMany({});
  await prisma.taskLocation.deleteMany({});
  await prisma.task.deleteMany({});
  console.log('🧹 Đã làm sạch dữ liệu Task & Escrow cũ...');

  // Get categories and users
  const categories = await prisma.category.findMany();
  const hirers = await prisma.user.findMany({ where: { role: 'HIRER' } });
  const taskers = await prisma.user.findMany({ where: { role: 'TASKER' } });

  if (categories.length === 0 || hirers.length === 0 || taskers.length === 0) {
    console.error('❌ Thiếu dữ liệu Danh mục hoặc Người dùng trong DB!');
    process.exit(1);
  }

  const now = new Date();
  let totalGMV = 0;
  let totalPlatformFee = 0;
  let totalTaskerNet = 0;

  let holdingGMV = 0;
  let releasedGMV = 0;
  let refundedGMV = 0;

  let createdTasksCount = 0;

  for (let i = 0; i < TASK_TEMPLATES.length; i++) {
    const template = TASK_TEMPLATES[i];
    const poster = hirers[i % hirers.length];
    const tasker = taskers[(i * 2 + 1) % taskers.length];
    const category = categories[i % categories.length];

    // Pick HD image corresponding to category
    const images = CATEGORY_IMAGES[template.type] || CATEGORY_IMAGES.DEFAULT;

    // Calculate created_at spread across last 30 days
    const daysAgo = 28 - (i * (28 / TASK_TEMPLATES.length));
    const createdAt = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    // Status distribution: ~60% COMPLETED (RELEASED), ~25% IN_PROGRESS (HOLDING), ~15% CANCELLED (REFUNDED)
    let taskStatus = 'COMPLETED';
    let escrowStatus = 'RELEASED';

    if (i % 4 === 1) {
      taskStatus = 'IN_PROGRESS';
      escrowStatus = 'HOLDING';
    } else if (i % 7 === 0) {
      taskStatus = 'CANCELLED';
      escrowStatus = 'REFUNDED';
    }

    const amount = template.amount;
    const platformFeeAmount = Math.round(amount * 0.08); // 8% SnapOn Fee
    const taskerNet = amount - platformFeeAmount;         // 92% Tasker Net

    // Create Task
    const task = await prisma.task.create({
      data: {
        posterId: poster.id,
        categoryId: category.id,
        title: template.title,
        description: template.desc,
        taskType: template.workMode === 'REMOTE' ? 'ONLINE' : 'OFFLINE',
        status: taskStatus,
        budgetMin: template.budgetMin,
        budgetMax: template.budgetMax,
        finalPrice: amount,
        images,
        workMode: template.workMode,
        createdAt,
        updatedAt: createdAt,
        contactPhone: poster.phone || '0901234567',
        locations: {
          create: {
            address: template.workMode === 'REMOTE' ? 'Làm việc từ xa (Online)' : 'Quận 1, Thành phố Hồ Chí Minh',
            locationType: template.workMode === 'REMOTE' ? 'REMOTE' : 'ONSITE'
          }
        }
      }
    });

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

    // Update wallet lockedBalance if status === 'HOLDING'
    if (escrowStatus === 'HOLDING') {
      await prisma.wallet.update({
        where: { userId: poster.id },
        data: {
          lockedBalance: { increment: amount },
          availableBalance: { decrement: amount }
        }
      }).catch(() => {});
      holdingGMV += amount;
    } else if (escrowStatus === 'RELEASED') {
      releasedGMV += amount;
    } else if (escrowStatus === 'REFUNDED') {
      refundedGMV += amount;
    }

    totalGMV += amount;
    totalPlatformFee += platformFeeAmount;
    totalTaskerNet += taskerNet;
    createdTasksCount++;

    console.log(`[${createdTasksCount}/${TASK_TEMPLATES.length}] Task: "${task.title}" | Giá: ${amount.toLocaleString('vi-VN')}đ | Phí 8%: ${platformFeeAmount.toLocaleString('vi-VN')}đ | Status: ${escrowStatus}`);
  }

  console.log('\n==================================================');
  console.log('✅ HOÀN TẤT TẠO DỮ LIỆU CÔNG VIỆC & DÒNG TIỀN KÝ QUỸ!');
  console.log(`📋 Tổng số bài đăng công việc: ${createdTasksCount}`);
  console.log(`💵 TỔNG GIAO DỊCH KÝ QUỸ (GROSS GMV 100%): ${totalGMV.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📈 TỔNG DOANH THU PHÍ NỀN TẢNG (8% SNAPON): ${totalPlatformFee.toLocaleString('vi-VN')} VNĐ`);
  console.log(`👷 TỔNG THỰC NHẬN NGƯỜI LÀM (92% TASKER NET): ${totalTaskerNet.toLocaleString('vi-VN')} VNĐ`);
  console.log(`--------------------------------------------------`);
  console.log(`✅ Tiền Đã Giải Ngân (RELEASED): ${releasedGMV.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔒 Tiền Đang Đóng Băng (HOLDING): ${holdingGMV.toLocaleString('vi-VN')} VNĐ`);
  console.log(`🔄 Tiền Đã Hoàn Trả (REFUNDED): ${refundedGMV.toLocaleString('vi-VN')} VNĐ`);
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
