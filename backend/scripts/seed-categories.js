'use strict';

require('dotenv').config();
const pool = require('../config/db');

const CATEGORIES_TO_SEED = [
  {
    name: 'Errands (Chạy vặt)',
    slug: 'errands',
    subcategories: [
      { name: 'Mua đồ hộ', slug: 'buy-goods' },
      { name: 'Giao đồ tận nơi', slug: 'deliver-items' },
      { name: 'Xếp hàng hộ', slug: 'queue-up' },
      { name: 'Việc vặt tổng hợp', slug: 'general-errands' }
    ]
  },
  {
    name: 'Nội dung & Viết lách',
    slug: 'content',
    subcategories: [
      { name: 'Viết caption mạng xã hội', slug: 'social-caption' },
      { name: 'Viết bài blog', slug: 'blog-post' },
      { name: 'Viết bài chuẩn SEO', slug: 'seo-post' },
      { name: 'Dịch thuật & Biên tập', slug: 'translation-editing' }
    ]
  },
  {
    name: 'Thiết kế',
    slug: 'design',
    subcategories: [
      { name: 'Thiết kế logo', slug: 'logo-design' },
      { name: 'Thiết kế banner', slug: 'banner-design' },
      { name: 'Thiết kế poster', slug: 'poster-design' },
      { name: 'Thiết kế Canva', slug: 'canva-design' }
    ]
  },
  {
    name: 'Công nghệ',
    slug: 'tech',
    subcategories: [
      { name: 'Thiết kế landing page', slug: 'landing-page-dev' },
      { name: 'Phát triển website', slug: 'website-dev' },
      { name: 'Sửa lỗi lập trình', slug: 'bug-fixing' }
    ]
  },
  {
    name: 'Bốc xếp & Vận chuyển',
    slug: 'carrying',
    subcategories: [
      { name: 'Bốc xếp đồ đạc', slug: 'loading-goods' },
      { name: 'Chuyển nhà nhẹ', slug: 'house-moving' },
      { name: 'Vận chuyển hàng nhỏ', slug: 'small-cargo' }
    ]
  },
  {
    name: 'Nhiếp ảnh & Truyền thông',
    slug: 'photography',
    subcategories: [
      { name: 'Chụp ảnh sản phẩm', slug: 'product-photo' },
      { name: 'Quay video TikTok', slug: 'tiktok-video' },
      { name: 'Chỉnh sửa ảnh', slug: 'photo-edit' }
    ]
  },
  {
    name: 'Nghiên cứu',
    slug: 'research',
    subcategories: [
      { name: 'Khảo sát thị trường', slug: 'market-survey' },
      { name: 'Tìm kiếm thông tin', slug: 'info-research' }
    ]
  },
  {
    name: 'Quản lý & Hỗ trợ',
    slug: 'manager',
    subcategories: [
      { name: 'Trợ lý online', slug: 'online-assistant' },
      { name: 'Quản lý Fanpage', slug: 'page-admin' }
    ]
  },
  {
    name: 'Giải trí & Sự kiện',
    slug: 'entertainment',
    subcategories: [
      { name: 'Hỗ trợ sự kiện', slug: 'event-support' },
      { name: 'Biểu diễn', slug: 'performance' }
    ]
  },
  {
    name: 'Hỗ trợ học tập',
    slug: 'study',
    subcategories: [
      { name: 'Gia sư online', slug: 'online-tutor' },
      { name: 'Hỗ trợ làm bài tập', slug: 'homework-help' }
    ]
  },
  {
    name: 'Việc khác',
    slug: 'others',
    subcategories: [
      { name: 'Việc tự do', slug: 'freelance-misc' },
      { name: 'Hỗ trợ cá nhân', slug: 'personal-help' }
    ]
  }
];

(async () => {
  console.log('Seeding categories and subcategories (skills) into PostgreSQL database...');
  try {
    console.log('🧹 Clearing existing skills...');
    await pool.query('TRUNCATE TABLE skills CASCADE;');
    
    console.log('🧹 Clearing existing categories (CASCADE)...');
    await pool.query('TRUNCATE TABLE categories CASCADE;');

    for (const cat of CATEGORIES_TO_SEED) {
      const catInsert = await pool.query(
        'INSERT INTO categories (id, name, slug) VALUES (gen_random_uuid(), $1, $2) RETURNING id',
        [cat.name, cat.slug]
      );
      const categoryId = catInsert.rows[0].id;
      console.log(`✅ Seeded category: ${cat.name} (${cat.slug}) -> UUID: ${categoryId}`);

      if (cat.subcategories && cat.subcategories.length > 0) {
        for (const sub of cat.subcategories) {
          await pool.query(
            'INSERT INTO skills (id, category_id, name, slug) VALUES (gen_random_uuid(), $1, $2, $3)',
            [categoryId, sub.name, sub.slug]
          );
        }
        console.log(`   └─ Seeded ${cat.subcategories.length} subcategories for ${cat.name}`);
      }
    }
    console.log('🎉 Database seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await pool.end();
  }
})();
