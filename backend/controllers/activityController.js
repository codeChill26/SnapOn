const pool = require('../config/db');
const { success, error, paginated } = require('../utils/responseHandler');
const { TASK_STATUS, APPLICATION_STATUS } = require('../utils/constants');
const { fromDbTaskStatus, fromDbApplicationStatus } = require('../utils/dbEnum');

const activityController = {
  async getActivities(req, res) {
    try {
      const userId = req.user.id;
      const { view = 'POSTED', status, search, page = 1, limit = 10 } = req.query;
      
      const currentPage = parseInt(page) || 1;
      const currentLimit = parseInt(limit) || 10;
      const offset = (currentPage - 1) * currentLimit;
      
      let whereClause = '';
      const queryParams = [userId];
      let paramIndex = 2;
      
      if (view === 'POSTED') {
        whereClause = 'WHERE t.poster_id = $1';
        
        if (status && status !== 'all') {
          whereClause += ` AND t.status = $${paramIndex++}`;
          queryParams.push(status);
        }
        
        if (search) {
          whereClause += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
          queryParams.push(`%${search}%`);
          paramIndex++;
        }
        
        // Count total
        const countRes = await pool.query(
          `SELECT COUNT(*) as total 
           FROM tasks t 
           LEFT JOIN categories c ON t.category_id = c.id
           ${whereClause}`,
          queryParams
        );
        const total = parseInt(countRes.rows[0].total);
        
        // Fetch tasks
        const tasksRes = await pool.query(
          `SELECT t.id,
                  'POSTED'::text AS activity_type,
                  json_build_object(
                    'id', t.id,
                    'title', t.title,
                    'description', t.description,
                    'postType', t.post_type,
                    'status', t.status,
                    'images', t.images,
                    'field', CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END,
                    'subcategory', (SELECT json_build_object('id', s.id, 'name', s.name, 'slug', s.slug)
                                     FROM task_required_skills trs
                                     JOIN skills s ON trs.skill_id = s.id
                                     WHERE trs.task_id = t.id
                                     LIMIT 1),
                    'budgetMin', t.budget_min,
                    'budgetMax', t.budget_max,
                    'salaryUnit', t.salary_unit,
                    'createdAt', t.created_at,
                    'updatedAt', t.updated_at
                  ) AS post,
                  NULL::json AS participation,
                  json_build_object(
                    'applicantCount', (SELECT COUNT(*) FROM task_applications WHERE task_id = t.id),
                    'hireRequestCount', 0
                  ) AS stats
           FROM tasks t
           LEFT JOIN categories c ON t.category_id = c.id
           ${whereClause}
           ORDER BY t.updated_at DESC
           LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
          [...queryParams, currentLimit, offset]
        );
        
        const data = tasksRes.rows.map(row => {
          row.post.status = fromDbTaskStatus(row.post.status);
          return row;
        });
        
        return paginated(res, data, {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages: Math.ceil(total / currentLimit),
          hasNext: currentPage * currentLimit < total
        }, 'Activities retrieved successfully.');
        
      } else if (view === 'PARTICIPATING') {
        whereClause = 'WHERE ta.tasker_id = $1';
        
        if (status && status !== 'all') {
          if (status === 'PENDING') {
            whereClause += ` AND ta.status = 'PENDING'`;
          } else if (status === 'ACCEPTED') {
            whereClause += ` AND ta.status = 'ACCEPTED' AND t.status = 'OPEN'`;
          } else if (status === 'IN_PROGRESS') {
            whereClause += ` AND ta.status = 'ACCEPTED' AND t.status = 'IN_PROGRESS'`;
          } else if (status === 'COMPLETED') {
            whereClause += ` AND ta.status = 'ACCEPTED' AND t.status = 'COMPLETED'`;
          } else if (status === 'ENDED') {
            whereClause += ` AND (ta.status IN ('REJECTED', 'CANCELLED') OR t.status = 'CANCELLED')`;
          }
        }
        
        if (search) {
          whereClause += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
          queryParams.push(`%${search}%`);
          paramIndex++;
        }
        
        // Count total
        const countRes = await pool.query(
          `SELECT COUNT(*) as total 
           FROM task_applications ta
           JOIN tasks t ON ta.task_id = t.id
           LEFT JOIN categories c ON t.category_id = c.id
           ${whereClause}`,
          queryParams
        );
        const total = parseInt(countRes.rows[0].total);
        
        // Fetch applications
        const appsRes = await pool.query(
          `SELECT ta.id,
                  'PARTICIPATING'::text AS activity_type,
                  json_build_object(
                    'id', t.id,
                    'title', t.title,
                    'description', t.description,
                    'postType', t.post_type,
                    'status', t.status,
                    'images', t.images,
                    'field', CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END,
                    'subcategory', (SELECT json_build_object('id', s.id, 'name', s.name, 'slug', s.slug)
                                     FROM task_required_skills trs
                                     JOIN skills s ON trs.skill_id = s.id
                                     WHERE trs.task_id = t.id
                                     LIMIT 1),
                    'budgetMin', t.budget_min,
                    'budgetMax', t.budget_max,
                    'salaryUnit', t.salary_unit,
                    'poster', json_build_object('id', u_owner.id, 'fullName', u_owner.full_name, 'avatarUrl', u_owner.avatar_url, 'phone', u_owner.phone),
                    'createdAt', t.created_at,
                    'updatedAt', t.updated_at
                  ) AS post,
                  json_build_object(
                    'id', ta.id,
                    'type', 'JOB_APPLICATION',
                    'status', ta.status,
                    'createdAt', t.created_at,
                    'updatedAt', t.updated_at
                  ) AS participation,
                  json_build_object(
                    'applicantCount', 0,
                    'hireRequestCount', 0
                  ) AS stats
           FROM task_applications ta
           JOIN tasks t ON ta.task_id = t.id
           LEFT JOIN categories c ON t.category_id = c.id
           JOIN users u_owner ON t.poster_id = u_owner.id
           ${whereClause}
           ORDER BY t.updated_at DESC
           LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
          [...queryParams, currentLimit, offset]
        );
        
        const data = appsRes.rows.map(row => {
          row.post.status = fromDbTaskStatus(row.post.status);
          row.participation.status = fromDbApplicationStatus(row.participation.status);
          return row;
        });
        
        return paginated(res, data, {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages: Math.ceil(total / currentLimit),
          hasNext: currentPage * currentLimit < total
        }, 'Activities retrieved successfully.');
      } else {
        return error(res, 'Invalid view param.', 400);
      }
    } catch (err) {
      console.error('getActivities error:', err);
      return error(res, 'Failed to retrieve activities.', 500);
    }
  },

  async getActivitySummary(req, res) {
    try {
      const userId = req.user.id;
      
      const postedTotal = pool.query(`SELECT COUNT(*) FROM tasks WHERE poster_id = $1`, [userId]);
      const postedOpen = pool.query(`SELECT COUNT(*) FROM tasks WHERE poster_id = $1 AND status = 'OPEN'`, [userId]);
      const postedInProgress = pool.query(`SELECT COUNT(*) FROM tasks WHERE poster_id = $1 AND status = 'IN_PROGRESS'`, [userId]);
      const postedCompleted = pool.query(`SELECT COUNT(*) FROM tasks WHERE poster_id = $1 AND status = 'COMPLETED'`, [userId]);
      const postedCancelled = pool.query(`SELECT COUNT(*) FROM tasks WHERE poster_id = $1 AND status = 'CANCELLED'`, [userId]);
      
      const partTotal = pool.query(`SELECT COUNT(*) FROM task_applications WHERE tasker_id = $1`, [userId]);
      const partPending = pool.query(`SELECT COUNT(*) FROM task_applications WHERE tasker_id = $1 AND status = 'PENDING'`, [userId]);
      const partAccepted = pool.query(`SELECT COUNT(*) FROM task_applications ta JOIN tasks t ON ta.task_id = t.id WHERE ta.tasker_id = $1 AND ta.status = 'ACCEPTED' AND t.status = 'OPEN'`, [userId]);
      const partInProgress = pool.query(`SELECT COUNT(*) FROM task_applications ta JOIN tasks t ON ta.task_id = t.id WHERE ta.tasker_id = $1 AND ta.status = 'ACCEPTED' AND t.status = 'IN_PROGRESS'`, [userId]);
      const partCompleted = pool.query(`SELECT COUNT(*) FROM task_applications ta JOIN tasks t ON ta.task_id = t.id WHERE ta.tasker_id = $1 AND ta.status = 'ACCEPTED' AND t.status = 'COMPLETED'`, [userId]);
      const partEnded = pool.query(`SELECT COUNT(*) FROM task_applications ta JOIN tasks t ON ta.task_id = t.id WHERE ta.tasker_id = $1 AND (ta.status IN ('REJECTED', 'CANCELLED') OR t.status = 'CANCELLED')`, [userId]);
      
      const results = await Promise.all([
        postedTotal, postedOpen, postedInProgress, postedCompleted, postedCancelled,
        partTotal, partPending, partAccepted, partInProgress, partCompleted, partEnded
      ]);
      
      const summary = {
        posted: {
          total: parseInt(results[0].rows[0].count),
          open: parseInt(results[1].rows[0].count),
          inProgress: parseInt(results[2].rows[0].count),
          completed: parseInt(results[3].rows[0].count),
          cancelled: parseInt(results[4].rows[0].count)
        },
        participating: {
          total: parseInt(results[5].rows[0].count),
          pending: parseInt(results[6].rows[0].count),
          accepted: parseInt(results[7].rows[0].count),
          inProgress: parseInt(results[8].rows[0].count),
          completed: parseInt(results[9].rows[0].count),
          ended: parseInt(results[10].rows[0].count)
        }
      };
      
      return success(res, summary, 'Activity summary retrieved successfully.');
    } catch (err) {
      console.error('getActivitySummary error:', err);
      return error(res, 'Failed to retrieve activity summary.', 500);
    }
  }
};

module.exports = activityController;
