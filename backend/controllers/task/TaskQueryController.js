const taskModel = require('../../models/taskModel');
const pool = require('../../config/db');
const { success, error, paginated } = require('../../utils/responseHandler');
const { CACHE_CONFIG } = require('../../utils/constants');
const cacheService = require('../../services/cacheService');
const redis = require('../../config/redis');
const crypto = require('crypto');

const TaskQueryController = {
  /**
   * GET /api/tasks
   * List all tasks with filters and pagination
   */
  async getTasks(req, res) {
    try {
      const { status, category_id, field_id, task_type, search, page, limit, post_type, work_mode, salary_unit } = req.query;

      // Support slug-to-UUID lookup if field_id is a slug
      let finalFieldId = field_id;
      if (field_id && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(field_id)) {
        const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1', [field_id]);
        if (catRes.rows[0]) {
          finalFieldId = catRes.rows[0].id;
        } else {
          return paginated(res, [], { page: parseInt(page) || 1, limit: parseInt(limit) || 10, total: 0, totalPages: 0 }, 'Tasks retrieved successfully.');
        }
      }

      // Support slug-to-UUID lookup if category_id is a slug (which is subcategory Level 2 Skill ID in this new format)
      let finalCategoryId = category_id;
      if (category_id && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(category_id)) {
        const skillRes = await pool.query('SELECT id FROM skills WHERE slug = $1', [category_id]);
        if (skillRes.rows[0]) {
          finalCategoryId = skillRes.rows[0].id;
        } else {
          // If category_id did not match a skill, check category table (for backward compatibility where category_id meant Level 1)
          const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1', [category_id]);
          if (catRes.rows[0]) {
            finalFieldId = catRes.rows[0].id;
            finalCategoryId = undefined;
          } else {
            return paginated(res, [], { page: parseInt(page) || 1, limit: parseInt(limit) || 10, total: 0, totalPages: 0 }, 'Tasks retrieved successfully.');
          }
        }
      }

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const isPage1 = pageNum === 1;

      let result;
      if (isPage1) {
        const categoryFilter = finalCategoryId || 'all';
        const fieldFilter = finalFieldId || 'all';
        const statusFilter = status || 'all';

        // Collect all query filters to build a deterministic query object
        const queryObj = {
          category_id: categoryFilter,
          field_id: fieldFilter,
          status: statusFilter,
          task_type: task_type || '',
          search: search || '',
          limit: limitNum,
          post_type: post_type || '',
          work_mode: work_mode || '',
          salary_unit: salary_unit || '',
          currentUserId: req.user ? req.user.id : null
        };

        const sortedKeys = Object.keys(queryObj).sort();
        const sortedObj = {};
        for (const key of sortedKeys) {
          sortedObj[key] = queryObj[key] === undefined ? '' : String(queryObj[key]);
        }
        const serialized = JSON.stringify(sortedObj);
        
        // Calculate the full SHA-256 hash
        const filterHash = crypto.createHash('sha256').update(serialized).digest('hex');
        const cacheKey = `tasks:list:v1:${filterHash}:${pageNum}`;

        // Cache page 1 list view
        result = await cacheService.getOrFetch(cacheKey, CACHE_CONFIG.TASK_LIST_TTL, async () => {
          return await taskModel.findAll({
            status,
            categoryId: finalCategoryId,
            fieldId: finalFieldId,
            taskType: task_type,
            search,
            page: pageNum,
            limit: limitNum,
            postType: post_type,
            workMode: work_mode,
            salaryUnit: salary_unit,
            currentUserId: req.user ? req.user.id : null,
          });
        });

        // Add to Redis index set for precise invalidation
        if (redis.isActive()) {
          const indexKey = `tasks:list:index:cat:${categoryFilter}`;
          await redis.sadd(indexKey, cacheKey).catch(() => {});
          await redis.expire(indexKey, CACHE_CONFIG.TASK_LIST_TTL * 2).catch(() => {});
        }
      } else {
        result = await taskModel.findAll({
          status,
          categoryId: finalCategoryId,
          fieldId: finalFieldId,
          taskType: task_type,
          search,
          page: pageNum,
          limit: limitNum,
          postType: post_type,
          workMode: work_mode,
          salaryUnit: salary_unit,
          currentUserId: req.user ? req.user.id : null,
        });
      }

      return paginated(res, result.tasks, result.pagination, 'Tasks retrieved successfully.');
    } catch (err) {
      console.error('Get tasks error:', err);
      return error(res, 'Failed to retrieve tasks.', 500);
    }
  },

  /**
   * GET /api/tasks/my-tasks
   * Get tasks created by the current user (Poster)
   */
  async getMyTasks(req, res) {
    try {
      const posterId = req.user.id;
      const { page, limit } = req.query;

      const result = await taskModel.findByPosterId(posterId, {
        page: parseInt(page) || undefined,
        limit: parseInt(limit) || undefined,
      });

      return paginated(res, result.tasks, result.pagination, 'My tasks retrieved successfully.');
    } catch (err) {
      console.error('Get my tasks error:', err);
      return error(res, 'Failed to retrieve your tasks.', 500);
    }
  },

  /**
   * GET /api/tasks/:id
   * Get task details by ID
   */
  async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : null;
      const cacheKey = `tasks:detail:${id}`;

      // Cache thông tin chi tiết task trong 2 phút
      const task = await cacheService.getOrFetch(cacheKey, CACHE_CONFIG.TASK_DETAIL_TTL, async () => {
        const fetchedTask = await taskModel.findById(id, null);
        if (!fetchedTask) {
          const err = new Error('Task not found.');
          err.statusCode = 404;
          throw err;
        }
        return fetchedTask;
      });

      // Tạo một bản sao nông để tránh chỉnh sửa trực tiếp đối tượng trong cache
      const taskResponse = { ...task };

      // Gán động trạng thái is_saved cho user hiện tại
      if (userId) {
        const savedRes = await pool.query(
          'SELECT 1 FROM saved_tasks WHERE task_id = $1 AND user_id = $2',
          [id, userId]
        );
        taskResponse.is_saved = savedRes.rows.length > 0;
      } else {
        taskResponse.is_saved = false;
      }

      return success(res, taskResponse, 'Task retrieved successfully.');
    } catch (err) {
      if (err.message === 'Task not found.') {
        return error(res, 'Task not found.', 404);
      }
      console.error('Get task by ID error:', err);
      return error(res, 'Failed to retrieve task.', 500);
    }
  },

  /**
   * GET /api/tasks/saved
   * Get tasks saved by the current user
   */
  async getSavedTasks(req, res) {
    try {
      const userId = req.user.id;
      const { page, limit } = req.query;

      const result = await taskModel.findSavedByUser(userId, {
        page: parseInt(page) || undefined,
        limit: parseInt(limit) || undefined,
      });

      return paginated(res, result.tasks, result.pagination, 'Saved tasks retrieved successfully.');
    } catch (err) {
      console.error('Get saved tasks error:', err);
      return error(res, 'Failed to retrieve saved tasks.', 500);
    }
  },
};

module.exports = TaskQueryController;
