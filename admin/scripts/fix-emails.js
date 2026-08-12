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

// Helper to remove Vietnamese diacritics
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
  console.log('🔄 Bắt đầu cập nhật toàn bộ email demo người dùng sang dạng @gmail.com đẹp...');

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: '@snapon.vn' } },
        { email: { contains: 'demo.user' } }
      ]
    }
  });

  console.log(`Tìm thấy ${users.length} tài khoản demo cần làm sạch email...`);

  let updatedCount = 0;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const cleanName = removeVietnameseTones(user.fullName || `user${i+1}`);
    const randomSuffix = Math.floor(10 + Math.random() * 89);
    
    let newEmail = `${cleanName}${randomSuffix}@gmail.com`;
    
    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.user.findUnique({ where: { email: newEmail } });
      if (!existing || existing.id === user.id) break;
      newEmail = `${cleanName}${Math.floor(100 + Math.random() * 899)}@gmail.com`;
      attempts++;
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail }
      });
      updatedCount++;
      console.log(`[${updatedCount}/${users.length}] Updated ${user.fullName}: ${user.email} => ${newEmail}`);
    } catch (err) {
      console.error(`❌ Lỗi cập nhật email cho ${user.id}:`, err.message);
    }
  }

  console.log(`\n✅ Hoàn tất cập nhật ${updatedCount} email sang @gmail.com!`);
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
