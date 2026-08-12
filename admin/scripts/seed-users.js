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

const FIRST_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Đặng', 'Bùi',
  'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đào', 'Đoàn', 'Vương', 'Trịnh', 'Lương'
];

const MIDDLE_NAMES = [
  'Văn', 'Thị', 'Minh', 'Hoàng', 'Đức', 'Quang', 'Ngọc', 'Thanh', 'Anh', 'Hữu',
  'Tuấn', 'Bảo', 'Gia', 'Khánh', 'Nhật', 'Đình', 'Xuân', 'Kim', 'Trọng', 'Phương'
];

const LAST_NAMES = [
  'An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Giang', 'Hải', 'Hùng', 'Huy', 'Khoa',
  'Lâm', 'Long', 'Nam', 'Nghĩa', 'Phúc', 'Quân', 'Sơn', 'Tâm', 'Thắng', 'Thịnh',
  'Trí', 'Trung', 'Tú', 'Vinh', 'Vũ', 'Yến', 'Trang', 'Hương', 'Linh', 'Thảo'
];

const ROLES = ['HIRER', 'TASKER', 'HIRER', 'TASKER', 'TASKER'];

function removeVietnameseTones(str) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str.toLowerCase().replace(/\s+/g, "");
}

async function main() {
  console.log('🌱 Bắt đầu tạo 70 người dùng mới rải đều trong 30 ngày qua...');

  const now = new Date();
  let createdCount = 0;

  for (let i = 1; i <= 70; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const middleName = MIDDLE_NAMES[Math.floor(Math.random() * MIDDLE_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const fullName = `${firstName} ${middleName} ${lastName}`;

    const role = ROLES[i % ROLES.length];
    const cleanName = removeVietnameseTones(fullName);
    const randomSuffix = Math.floor(10 + Math.random() * 89);
    const email = `${cleanName}${randomSuffix}@gmail.com`;
    const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const firebaseUid = `demo_fb_uid_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
    const isFemale = fullName.includes('Thị') || fullName.includes('Yến') || fullName.includes('Trang') || fullName.includes('Hương') || fullName.includes('Linh') || fullName.includes('Thảo');
    const avatarUrl = isFemale 
      ? `https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80`
      : `https://i.pravatar.cc/300?img=${(i % 70) + 1}`;

    // Calculate created_at date distributed over the last 30 days (from 30 days ago to now)
    const daysAgo = 30 - ((i - 1) * (30 / 70));
    const hoursVariance = (Math.random() - 0.5) * 6;
    const createdAt = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) + (hoursVariance * 60 * 60 * 1000));

    const status = Math.random() < 0.08 ? 'BANNED' : 'ACTIVE';
    const isVerified = Math.random() < 0.8;

    try {
      const user = await prisma.user.create({
        data: {
          firebaseUid,
          fullName,
          email,
          phone,
          avatarUrl,
          status,
          isVerified,
          createdAt,
          role,
          bio: `Thành viên ${role === 'HIRER' ? 'đăng việc' : 'thực hiện công việc'} trên nền tảng SnapOn.`,
          headline: role === 'HIRER' ? 'Chủ nhà / Khách hàng' : 'Người làm dịch vụ uy tín',
          wallet: {
            create: {
              balance: Math.floor(Math.random() * 50) * 100000,
              availableBalance: Math.floor(Math.random() * 40) * 100000,
              lockedBalance: Math.floor(Math.random() * 10) * 100000,
            }
          }
        }
      });

      createdCount++;
      console.log(`[${i}/70] Created: ${fullName} (${email}) | Role: ${role} | ngày: ${createdAt.toLocaleDateString('vi-VN')}`);
    } catch (err) {
      console.error(`❌ Error creating user ${email}:`, err.message);
    }
  }

  console.log(`\n✅ Đã tạo thành công ${createdCount}/70 người dùng mới trong DB PostgreSQL!`);
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
