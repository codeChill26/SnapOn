'use strict';

require('dotenv').config();
const pool = require('../config/db');

const CATEGORIES_TO_SEED = [
  { name: 'Content / Translate', slug: 'content' },
  { name: 'Design', slug: 'design' },
  { name: 'Tech', slug: 'tech' },
  { name: 'Research', slug: 'research' },
  { name: 'Study Help', slug: 'study' },
  { name: 'Others', slug: 'others' }
];

(async () => {
  console.log('Seeding categories into PostgreSQL database...');
  try {
    console.log('🧹 Clearing existing categories (CASCADE)...');
    await pool.query('TRUNCATE TABLE categories CASCADE;');

    for (const cat of CATEGORIES_TO_SEED) {
      await pool.query(
        'INSERT INTO categories (id, name, slug) VALUES (gen_random_uuid(), $1, $2)',
        [cat.name, cat.slug]
      );
      console.log(`✅ Seeded category: ${cat.name} (${cat.slug})`);
    }
    console.log('🎉 Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await pool.end();
  }
})();
