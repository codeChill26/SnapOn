require('dotenv').config();
const pool = require('../config/db');

(async () => {
  const r = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY column_name
  `);
  console.log('public.users columns:');
  r.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`));
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
