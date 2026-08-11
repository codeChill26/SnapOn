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

// Collection of curated high-quality human portrait image URLs (Pravatar & Unsplash HD Portraits)
const MALE_PORTRAITS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=300&q=80',
];

const FEMALE_PORTRAITS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80',
];

// Helper to determine if name is likely female based on middle name
function isFemale(fullName) {
  const lower = fullName.toLowerCase();
  return lower.includes('thị') || lower.includes('yến') || lower.includes('trang') || 
         lower.includes('hương') || lower.includes('linh') || lower.includes('thảo') ||
         lower.includes('mai') || lower.includes('phương');
}

async function main() {
  console.log('📸 Bắt đầu cập nhật Avatar ảnh chân dung người thật sắc nét cho người dùng...');

  const users = await prisma.user.findMany();
  console.log(`Tìm thấy ${users.length} người dùng...`);

  let updatedCount = 0;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    // Choose Pravatar or Unsplash realistic human portrait
    let avatarUrl = '';
    if (isFemale(user.fullName)) {
      const femaleIdx = (i % FEMALE_PORTRAITS.length);
      avatarUrl = FEMALE_PORTRAITS[femaleIdx];
    } else {
      const maleIdx = (i % MALE_PORTRAITS.length);
      avatarUrl = MALE_PORTRAITS[maleIdx];
    }

    // Mix in Pravatar fallback IDs for high diversity
    if (i % 3 === 0) {
      avatarUrl = `https://i.pravatar.cc/300?img=${(i % 70) + 1}`;
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl }
      });
      updatedCount++;
      console.log(`[${updatedCount}/${users.length}] Updated avatar for ${user.fullName}`);
    } catch (err) {
      console.error(`❌ Error updating avatar for ${user.id}:`, err.message);
    }
  }

  console.log(`\n✅ Hoàn tất cập nhật ${updatedCount} avatar chân dung người thật nét căng!`);
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
