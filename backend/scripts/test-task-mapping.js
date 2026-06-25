const pool = require('../config/db');
const taskModel = require('../models/taskModel');

// Replicate mapTaskFromApi logic from mobile/src/services/taskService.ts
function mapTaskFromApi(data) {
  if (!data) return data;
  return {
    id: data.id,
    posterId: data.poster_id || data.posterId,
    categoryId: data.category_id || data.categoryId,
    title: data.title,
    description: data.description,
    taskType: data.task_type || data.taskType,
    status: data.status,
    budgetMin: data.budget_min !== undefined ? Number(data.budget_min) : Number(data.budgetMin),
    budgetMax: data.budget_max !== undefined ? Number(data.budget_max) : Number(data.budgetMax),
    finalPrice: data.final_price !== undefined ? Number(data.final_price) : (data.finalPrice ? Number(data.finalPrice) : undefined),
    deadlineStart: data.deadline_start || data.deadlineStart,
    deadlineEnd: data.deadline_end || data.deadlineEnd,
    allowInsurance: data.allow_insurance !== undefined ? data.allow_insurance : data.allowInsurance,
    createdAt: data.created_at || data.createdAt,
    applicationDeadline: data.application_deadline || data.applicationDeadline,
    closedAt: data.closed_at || data.closedAt,
    closedById: data.closed_by_id || data.closedById,
    closedReason: data.closed_reason || data.closedReason,
    posterName: data.poster_name || data.posterName,
    categoryName: data.category_name || data.categoryName,
    field: (() => {
      if (!data.field) return undefined;
      const f = typeof data.field === 'string' ? JSON.parse(data.field) : data.field;
      return {
        id: f.id || '',
        name: f.name || '',
        slug: f.slug || '',
        icon: f.icon || '',
        color: f.color || '',
      };
    })(),
    subcategory: (() => {
      if (!data.subcategory) return undefined;
      const sub = typeof data.subcategory === 'string' ? JSON.parse(data.subcategory) : data.subcategory;
      return {
        id: sub.id || '',
        categoryId: sub.category_id || sub.categoryId || '',
        name: sub.name || '',
        slug: sub.slug || '',
      };
    })(),
    skills: (() => {
      const rawSkills = data.required_skills || data.skills;
      if (!rawSkills) return undefined;
      const parsed = typeof rawSkills === 'string' ? JSON.parse(rawSkills) : rawSkills;
      return Array.isArray(parsed) ? parsed.map((s) => ({
        id: s.id || '',
        categoryId: s.category_id || s.categoryId || '',
        name: s.name || '',
        slug: s.slug || '',
      })) : undefined;
    })(),
  };
}

async function test() {
  try {
    const tasksRes = await pool.query('SELECT id, title FROM tasks LIMIT 5');
    for (const t of tasksRes.rows) {
      const dbTask = await taskModel.findById(t.id);
      console.log(`\nDB Task Title: "${dbTask.title}"`);
      console.log('subcategory raw type:', typeof dbTask.subcategory, dbTask.subcategory);
      console.log('required_skills raw type:', typeof dbTask.required_skills, dbTask.required_skills);
      
      const mapped = mapTaskFromApi(dbTask);
      console.log('Mapped Subcategory:', mapped.subcategory);
      console.log('Mapped Skills:', mapped.skills);
      
      const subcategoryName = mapped.subcategory?.name || (mapped.skills && mapped.skills[0]?.name) || 'Chưa phân loại';
      console.log('Resulting Subcategory Name:', subcategoryName);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

test();
