'use strict';

require('dotenv').config();
const pool = require('../config/db');

const BANNERS_DATA = [
  {
    code: 'HOME_CONTENT',
    title: 'Biến ý tưởng thành nội dung thu hút',
    subtitle: 'Tìm người viết bài, sáng tạo nội dung và hỗ trợ truyền thông.',
    categorySlug: 'content',
    placement: 'HOME_FEATURED',
    actionType: 'CATEGORY',
    displayOrder: 1,
    imageUrlEnv: 'BANNER_CONTENT_IMAGE_URL',
    defaultImageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80',
  },
  {
    code: 'HOME_DESIGN',
    title: 'Thiết kế đẹp cho mọi ý tưởng',
    subtitle: 'Kết nối với designer logo, poster, UI và nhận diện thương hiệu.',
    categorySlug: 'design',
    placement: 'HOME_FEATURED',
    actionType: 'CATEGORY',
    displayOrder: 2,
    imageUrlEnv: 'BANNER_DESIGN_IMAGE_URL',
    defaultImageUrl: 'https://images.unsplash.com/photo-1561070791-26c113006238?w=800&q=80',
  },
  {
    code: 'HOME_TECH',
    title: 'Xây dựng sản phẩm bằng công nghệ',
    subtitle: 'Tìm lập trình viên web, mobile và người hỗ trợ kỹ thuật.',
    categorySlug: 'tech',
    placement: 'HOME_FEATURED',
    actionType: 'CATEGORY',
    displayOrder: 3,
    imageUrlEnv: 'BANNER_TECH_IMAGE_URL',
    defaultImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  },
  {
    code: 'HOME_RESEARCH',
    title: 'Phân tích dữ liệu, đưa ra quyết định',
    subtitle: 'Hỗ trợ khảo sát, nghiên cứu thị trường và phân tích thông tin.',
    categorySlug: 'research',
    placement: 'HOME_FEATURED',
    actionType: 'CATEGORY',
    displayOrder: 4,
    imageUrlEnv: 'BANNER_RESEARCH_IMAGE_URL',
    defaultImageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  },
  {
    code: 'HOME_STUDY_SUPPORT',
    title: 'Học hiệu quả với người đồng hành',
    subtitle: 'Kết nối gia sư và người hỗ trợ kiến thức phù hợp với bạn.',
    categorySlug: 'study',
    placement: 'HOME_FEATURED',
    actionType: 'CATEGORY',
    displayOrder: 5,
    imageUrlEnv: 'BANNER_STUDY_SUPPORT_IMAGE_URL',
    defaultImageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
  },
];

(async () => {
  console.log('🚀 Starting Home Banner seeding...');
  try {
    // 1. Fetch categories
    const categoriesResult = await pool.query('SELECT id, slug, name FROM categories');
    const categories = categoriesResult.rows;

    if (categories.length === 0) {
      console.error('❌ No categories found in database. Please run seed-categories.js first.');
      process.exit(1);
    }

    const categoryMap = new Map(categories.map(c => [c.slug, c.id]));

    // 2. Loop & Seed
    for (const data of BANNERS_DATA) {
      const categoryId = categoryMap.get(data.categorySlug);

      if (!categoryId) {
        console.warn(`⚠️ Warning: Category with slug "${data.categorySlug}" not found in DB. Skipping banner: ${data.code}`);
        continue;
      }

      const imageUrl = process.env[data.imageUrlEnv] || data.defaultImageUrl;

      await pool.query(
        `INSERT INTO banners (
          id, code, title, subtitle, image_url, category_id, placement,
          action_type, action_value, display_order, is_active
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        ON CONFLICT (code) DO UPDATE SET
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          image_url = EXCLUDED.image_url,
          category_id = EXCLUDED.category_id,
          placement = EXCLUDED.placement,
          action_type = EXCLUDED.action_type,
          display_order = EXCLUDED.display_order,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP`,
        [
          data.code,
          data.title,
          data.subtitle,
          imageUrl,
          categoryId,
          data.placement,
          data.actionType,
          categoryId, // For ACTION = CATEGORY, actionValue defaults to the category ID as well
          data.displayOrder,
        ]
      );

      console.log(`✅ Seeded banner: ${data.code} linked to category slug "${data.categorySlug}"`);
    }

    console.log('🎉 Seeding banners completed successfully!');
  } catch (err) {
    console.error('❌ Seeding banners failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
