const pool = require('../config/db');
const taskApplicationModel = require('../models/taskApplicationModel');

async function test() {
  try {
    const desc = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'task_applications'
    `);
    console.log('task_applications columns:', desc.rows);

    const descTasks = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tasks'
    `);
    console.log('tasks columns:', descTasks.rows);

    const res = await pool.query('SELECT DISTINCT tasker_id FROM task_applications LIMIT 1');
    if (res.rows.length > 0) {
      const taskerId = res.rows[0].tasker_id;
      console.log('Testing findByTaskerId with taskerId:', taskerId);
      const apps = await taskApplicationModel.findByTaskerId(taskerId);
      console.log('Applications:', apps);
    } else {
      console.log('No applications found, testing with a random UUID');
      const apps = await taskApplicationModel.findByTaskerId('00000000-0000-0000-0000-000000000000');
      console.log('Result:', apps);
    }
  } catch (err) {
    console.error('ERROR during query:', err);
  } finally {
    await pool.end();
  }
}

test();
