'use strict';

require('dotenv').config();
const pool = require('../config/db');

const CATEGORIES_TO_SEED = [
  // Mobile categories
  { name: 'Sửa chữa', slug: 'repair' },
  { name: 'Dọn dẹp', slug: 'cleaning' },
  { name: 'Vận chuyển', slug: 'moving' },
  { name: 'Điện', slug: 'electrical' },
  { name: 'Sửa ống nước', slug: 'plumbing' },
  { name: 'Sơn sửa', slug: 'painting' },
  { name: 'Làm vườn', slug: 'gardening' },
  { name: 'Công nghệ', slug: 'it' },
  { name: 'Gia sư', slug: 'tutoring' },
  { name: 'Chăm sóc sức khỏe', slug: 'healthcare' },
  { name: 'Khác', slug: 'other' },

  // Web categories
  { name: 'Errands', slug: 'errands' },
  { name: 'Content / Translate', slug: 'content' },
  { name: 'Design', slug: 'design' },
  { name: 'Tech', slug: 'tech' },
  { name: 'Carrying', slug: 'carrying' },
  { name: 'Photography / Media', slug: 'photography' },
  { name: 'Research', slug: 'research' },
  { name: 'Manager', slug: 'manager' },
  { name: 'Entertainment', slug: 'entertainment' },
  { name: 'Study Help', slug: 'study' },
  { name: 'Others', slug: 'others' }
];

(async () => {
  console.log('Seeding categories into PostgreSQL database...');
  try {
    for (const cat of CATEGORIES_TO_SEED) {
      // Check if slug already exists
      const existing = await pool.query('SELECT id FROM categories WHERE slug = $1', [cat.slug]);
      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO categories (id, name, slug) VALUES (gen_random_uuid(), $1, $2)',
          [cat.name, cat.slug]
        );
        console.log(`✅ Seeded category: ${cat.name} (${cat.slug})`);
      } else {
        console.log(`ℹ️ Category already exists: ${cat.name} (${cat.slug})`);
      }
    }
    console.log('🎉 Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await pool.end();
  }
})();
