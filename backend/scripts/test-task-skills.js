const pool = require('../config/db');

async function test() {
  try {
    const tasksRes = await pool.query('SELECT id, title, category_id FROM tasks');
    console.log('Tasks and their category / skills:');
    for (const t of tasksRes.rows) {
      console.log(`- Task ID: ${t.id}, Title: "${t.title}"`);
      const catRes = await pool.query('SELECT name FROM categories WHERE id = $1', [t.category_id]);
      console.log(`  Category: ${catRes.rows[0]?.name || 'N/A'}`);
      
      const skillsRes = await pool.query(`
        SELECT s.name 
        FROM task_required_skills trs
        JOIN skills s ON trs.skill_id = s.id
        WHERE trs.task_id = $1
      `, [t.id]);
      console.log(`  Skills: ${skillsRes.rows.map(r => r.name).join(', ') || 'None'}`);
      
      const subRes = await pool.query(`
        SELECT json_build_object('id', s.id, 'name', s.name, 'slug', s.slug) AS subcategory
        FROM task_required_skills trs
        JOIN skills s ON trs.skill_id = s.id
        WHERE trs.task_id = $1
        LIMIT 1
      `, [t.id]);
      console.log(`  Subcategory Subquery Result:`, subRes.rows[0]?.subcategory);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

test();
