const taskModel = require('../models/taskModel');
const cloudinary = require('../utils/cloudinary');
const escrowService = require('../services/escrowService');
const pool = require('../config/db');
const { success, error, paginated } = require('../utils/responseHandler');
const { TASK_STATUS, CACHE_CONFIG } = require('../utils/constants');
const { fromDbTaskStatus } = require('../utils/dbEnum');
const cacheService = require('../services/cacheService');
const redis = require('../config/redis');
const crypto = require('crypto');

/**
 * Utility to invalidate task-related cache keys (details, lists, and searches)
 * @param {string} [taskId] - Option task ID to invalidate a specific detail view cache
 * @param {string} [categoryId] - Optional category ID to selectively invalidate related list views
 */
async function invalidateTaskCache(taskId, categoryId) {
  try {
    if (!taskId) {
      return; // Safe fallback guard
    }

    await cacheService.del(`tasks:detail:${taskId}`).catch(() => {});
    
    let catId = categoryId;
    if (!catId) {
      const res = await pool.query(
        'SELECT category_id FROM tasks WHERE id = $1',
        [taskId]
      );
      if (res.rows[0]) {
        catId = res.rows[0].category_id;
      }
    }

    if (redis.isActive()) {
      // 1. Invalidate category-specific lists
      if (catId) {
        const catIndexKey = `tasks:list:index:cat:${catId}`;
        const catKeys = await redis.smembers(catIndexKey).catch(() => []);
        if (catKeys && catKeys.length > 0) {
          await Promise.all(catKeys.map(key => cacheService.del(key))).catch(() => {});
        }
        await redis.del(catIndexKey).catch(() => {});
      }

      // 2. Invalidate global list caches (category 'all')
      const allIndexKey = 'tasks:list:index:cat:all';
      const allKeys = await redis.smembers(allIndexKey).catch(() => []);
      if (allKeys && allKeys.length > 0) {
        await Promise.all(allKeys.map(key => cacheService.del(key))).catch(() => {});
      }
      await redis.del(allIndexKey).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to invalidate task cache:', err);
  }
}

/**
 * Safe integer parsing utility that checks for NaN
 * @param {any} val 
 * @returns {number|null}
 */
function parseInteger(val) {
  if (val === undefined || val === null || val === '') return null;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) return null;
  return parsed;
}

/**
 * Check permission for task updates
 */
function checkTaskPermission(task, userId) {
  if (!task) {
    return { hasPermission: false, message: 'Task not found.', status: 404 };
  }
  if (task.poster_id !== userId) {
    return { hasPermission: false, message: 'You can only update your own tasks.', status: 403 };
  }
  if (task.status !== TASK_STATUS.OPEN) {
    return { hasPermission: false, message: 'You can only update open tasks.', status: 400 };
  }
  return { hasPermission: true };
}

/**
 * Validate input payload for task creation or update
 */
async function validateTaskInput(body, currentTask, finalCategoryId) {
  const {
    title,
    description,
    category_id,
    post_type,
    work_mode,
    people_needed,
    contact_phone,
    start_date,
    min_age,
    max_age,
    min_height_cm,
    max_height_cm,
    location,
    skill_ids,
    application_deadline
  } = body;

  // Verify application deadline if provided
  if (application_deadline) {
    const parsedDeadline = new Date(application_deadline);
    if (isNaN(parsedDeadline.getTime())) {
      return { isValid: false, message: 'Invalid application deadline format.', status: 400 };
    }
    if (parsedDeadline <= new Date()) {
      return { isValid: false, message: 'Application deadline must be in the future.', status: 400 };
    }
  }

  // Merge fields for validation
  const merged = {
    title: title !== undefined ? title : (currentTask ? currentTask.title : null),
    description: description !== undefined ? description : (currentTask ? currentTask.description : null),
    category_id: category_id !== undefined ? finalCategoryId : (currentTask ? currentTask.category_id : null),
    post_type: post_type !== undefined ? post_type : (currentTask ? currentTask.post_type : 'RECRUITMENT'),
    work_mode: work_mode !== undefined ? work_mode : (currentTask ? currentTask.work_mode : 'ONSITE'),
    people_needed: people_needed !== undefined ? people_needed : (currentTask ? currentTask.people_needed : 1),
    contact_phone: contact_phone !== undefined ? contact_phone : (currentTask ? currentTask.contact_phone : null),
    start_date: start_date !== undefined ? start_date : (currentTask ? currentTask.start_date : null),
    min_age: min_age !== undefined ? min_age : (currentTask ? currentTask.min_age : null),
    max_age: max_age !== undefined ? max_age : (currentTask ? currentTask.max_age : null),
    min_height_cm: min_height_cm !== undefined ? min_height_cm : (currentTask ? currentTask.min_height_cm : null),
    max_height_cm: max_height_cm !== undefined ? max_height_cm : (currentTask ? currentTask.max_height_cm : null),
    location: location !== undefined ? location : (currentTask && currentTask.locations && currentTask.locations[0] ? currentTask.locations[0] : null),
  };

  if (!merged.title || typeof merged.title !== 'string' || merged.title.trim().length === 0) {
    return { isValid: false, message: currentTask ? 'Title cannot be empty.' : 'Title is required.', status: 400 };
  }
  if (!merged.description || typeof merged.description !== 'string' || merged.description.trim().length === 0) {
    return { isValid: false, message: currentTask ? 'Description cannot be empty.' : 'Description is required.', status: 400 };
  }
  if (!merged.category_id) {
    return { isValid: false, message: 'Field (category_id) is required.', status: 400 };
  }

  // Validate subcategories / skill_ids belong to the category_id
  const finalSkillIds = skill_ids !== undefined ? skill_ids : (currentTask ? (currentTask.required_skills || []).map(s => s.id) : []);
  if (finalSkillIds && finalSkillIds.length > 0) {
    const skillsQuery = await pool.query(
      'SELECT category_id FROM skills WHERE id = ANY($1::uuid[])',
      [finalSkillIds]
    );
    for (const skill of skillsQuery.rows) {
      if (skill.category_id !== merged.category_id) {
        return { isValid: false, message: 'One or more subcategories do not belong to the selected field.', status: 400 };
      }
    }
  }

  if (merged.work_mode === 'ONSITE' && (!merged.location || !merged.location.address || merged.location.address.trim().length === 0)) {
    return { isValid: false, message: 'Location address is required for ONSITE work mode.', status: 400 };
  }

  // Validate age range
  const parsedMinAge = parseInteger(merged.min_age);
  const parsedMaxAge = parseInteger(merged.max_age);

  if (merged.min_age !== undefined && merged.min_age !== null && parsedMinAge === null) {
    return { isValid: false, message: 'Minimum age must be a valid integer.', status: 400 };
  }
  if (merged.max_age !== undefined && merged.max_age !== null && parsedMaxAge === null) {
    return { isValid: false, message: 'Maximum age must be a valid integer.', status: 400 };
  }
  if (parsedMinAge !== null && parsedMaxAge !== null && parsedMinAge > parsedMaxAge) {
    return { isValid: false, message: 'Minimum age cannot be greater than maximum age.', status: 400 };
  }

  // Validate height range
  const parsedMinHeight = parseInteger(merged.min_height_cm);
  const parsedMaxHeight = parseInteger(merged.max_height_cm);

  if (merged.min_height_cm !== undefined && merged.min_height_cm !== null && parsedMinHeight === null) {
    return { isValid: false, message: 'Minimum height must be a valid integer.', status: 400 };
  }
  if (merged.max_height_cm !== undefined && merged.max_height_cm !== null && parsedMaxHeight === null) {
    return { isValid: false, message: 'Maximum height must be a valid integer.', status: 400 };
  }
  if (parsedMinHeight !== null && parsedMaxHeight !== null && parsedMinHeight > parsedMaxHeight) {
    return { isValid: false, message: 'Minimum height cannot be greater than maximum height.', status: 400 };
  }

  if (merged.post_type === 'RECRUITMENT') {
    const parsedPeopleNeeded = parseInteger(merged.people_needed);
    if (parsedPeopleNeeded === null || parsedPeopleNeeded < 1) {
      return { isValid: false, message: 'People needed must be at least 1 for RECRUITMENT.', status: 400 };
    }
    if (!merged.contact_phone || merged.contact_phone.trim().length === 0) {
      return { isValid: false, message: 'Contact phone is required for RECRUITMENT.', status: 400 };
    }
    if (!merged.start_date) {
      return { isValid: false, message: 'Start date is required for RECRUITMENT.', status: 400 };
    }
    const parsedStartDate = new Date(merged.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedStartDate < today) {
      return { isValid: false, message: 'Start date cannot be in the past.', status: 400 };
    }
  }

  return { isValid: true };
}

/**
 * Execute DB update queries for task details, skills, and location
 */
/**
 * Load the task and check ownership/status permissions
 */
async function loadTask(id, userId) {
  const task = await taskModel.findById(id);
  const permCheck = checkTaskPermission(task, userId);
  return { task, permCheck };
}

/**
 * Resolve category UUID if needed, then validate input fields
 */
async function validateUpdateInput(body, task) {
  const { category_id } = body;
  let finalCategoryId = category_id;
  if (category_id && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(category_id)) {
    const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1', [category_id]);
    if (catRes.rows[0]) {
      finalCategoryId = catRes.rows[0].id;
    }
  }
  const validation = await validateTaskInput(body, task, finalCategoryId);
  return {
    isValid: validation.isValid,
    message: validation.message,
    status: validation.status,
    finalCategoryId
  };
}

/**
 * Construct the payload of fields to update based on the current task state
 */
function applyTaskUpdates(body, currentTask, finalCategoryId) {
  const {
    title,
    description,
    task_type,
    budget_min,
    budget_max,
    deadline_start,
    deadline_end,
    allow_insurance,
    images,
    post_type,
    work_mode,
    salary_unit,
    employment_type,
    people_needed,
    contact_phone,
    start_date,
    experience_level,
    education_level,
    gender_requirement,
    min_age,
    max_age,
    min_height_cm,
    max_height_cm,
    hashtags,
    application_deadline,
    skill_ids,
    location
  } = body;

  const cleanHashtags = hashtags !== undefined 
    ? (hashtags || []).map(h => h.replace(/^#+/, '').trim()).filter(h => h.length > 0)
    : currentTask.hashtags;

  const updatedFields = {
    categoryId: finalCategoryId !== undefined ? finalCategoryId : currentTask.category_id,
    title: title !== undefined ? title : currentTask.title,
    description: description !== undefined ? description : currentTask.description,
    taskType: task_type !== undefined ? task_type : currentTask.task_type,
    budgetMin: budget_min !== undefined ? budget_min : currentTask.budget_min,
    budgetMax: budget_max !== undefined ? budget_max : currentTask.budget_max,
    deadlineStart: deadline_start !== undefined ? deadline_start : currentTask.deadline_start,
    deadlineEnd: deadline_end !== undefined ? deadline_end : currentTask.deadline_end,
    allowInsurance: allow_insurance !== undefined ? allow_insurance : currentTask.allow_insurance,
    images: images !== undefined ? images : currentTask.images,
    postType: post_type !== undefined ? post_type : currentTask.post_type,
    workMode: work_mode !== undefined ? work_mode : currentTask.work_mode,
    salaryUnit: salary_unit !== undefined ? salary_unit : currentTask.salary_unit,
    employmentType: employment_type !== undefined ? employment_type : currentTask.employment_type,
    peopleNeeded: post_type === 'SERVICE_OFFER' ? null : (people_needed !== undefined ? people_needed : currentTask.people_needed),
    contactPhone: contact_phone !== undefined ? contact_phone : currentTask.contact_phone,
    startDate: start_date !== undefined ? start_date : currentTask.start_date,
    experienceLevel: experience_level !== undefined ? experience_level : currentTask.experience_level,
    educationLevel: education_level !== undefined ? education_level : currentTask.education_level,
    genderRequirement: post_type === 'SERVICE_OFFER' ? 'NO_REQUIREMENT' : (gender_requirement !== undefined ? gender_requirement : currentTask.gender_requirement),
    minAge: post_type === 'SERVICE_OFFER' ? null : (min_age !== undefined ? min_age : currentTask.min_age),
    maxAge: post_type === 'SERVICE_OFFER' ? null : (max_age !== undefined ? max_age : currentTask.max_age),
    minHeightCm: post_type === 'SERVICE_OFFER' ? null : (min_height_cm !== undefined ? min_height_cm : currentTask.min_height_cm),
    maxHeightCm: post_type === 'SERVICE_OFFER' ? null : (max_height_cm !== undefined ? max_height_cm : currentTask.max_height_cm),
    hashtags: cleanHashtags,
    applicationDeadline: application_deadline !== undefined ? application_deadline : currentTask.application_deadline,
  };

  return { updatedFields, skill_ids, location };
}

/**
 * Execute DB update queries for task details, skills, and location
 */
async function updateDatabase(id, updatePayload) {
  const { updatedFields, skill_ids, location } = updatePayload;
  await taskModel.update(id, updatedFields);

  if (skill_ids !== undefined) {
    await pool.query('DELETE FROM task_required_skills WHERE task_id = $1', [id]);
    if (skill_ids && skill_ids.length > 0) {
      await taskModel.addRequiredSkills(id, skill_ids);
    }
  }

  if (location !== undefined) {
    await pool.query('DELETE FROM task_locations WHERE task_id = $1', [id]);
    if (location && location.address) {
      await taskModel.addLocation(id, {
        locationType: location.location_type || 'TASK_LOCATION',
        address: location.address,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
      });
    }
  }
}

/**
 * Invalidate the task detail and list cache keys
 */
async function invalidateCache(id, finalCategoryId) {
  await invalidateTaskCache(id, finalCategoryId);
}

/**
 * Handle notification events for updated tasks
 */
function handleNotifications(fullUpdatedTask) {
  sendTaskUpdateNotification(fullUpdatedTask);
}

/**
 * Construct and send the JSON response
 */
function buildResponse(res, fullUpdatedTask) {
  return success(res, fullUpdatedTask, 'Task updated successfully.');
}

/**
 * Placeholder/trigger for task updates notifications
 */
function sendTaskUpdateNotification(task) {
  // Can be hooked to push notification service / socket notifications
  console.log(`[NOTIFICATION] Task ${task.id} updated successfully.`);
}

/**
 * Task Controller — Handles task CRUD operations
 */
const taskController = {
  /**
   * POST /api/tasks
   * Create a new task (Poster only)
   */
  async createTask(req, res) {
    try {
      const posterId = req.user.id;
      const {
        title,
        description,
        category_id,
        task_type = 'ONLINE',
        budget_min,
        budget_max,
        deadline_start,
        deadline_end,
        allow_insurance,
        skill_ids,
        location,
        images,
        post_type = 'RECRUITMENT',
        work_mode = 'ONSITE',
        salary_unit = 'PER_JOB',
        employment_type = 'ONE_TIME',
        people_needed = 1,
        contact_phone,
        start_date,
        experience_level = 'NO_REQUIREMENT',
        education_level = 'NO_REQUIREMENT',
        gender_requirement = 'NO_REQUIREMENT',
        min_age,
        max_age,
        min_height_cm,
        max_height_cm,
        hashtags,
        application_deadline,
      } = req.body;

      // Validate base inputs
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return error(res, 'Title is required.', 400);
      }
      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return error(res, 'Description is required.', 400);
      }
      if (!category_id) {
        return error(res, 'Field (category_id) is required.', 400);
      }
      if (!skill_ids || !Array.isArray(skill_ids) || skill_ids.length === 0) {
        return error(res, 'Specific subcategory (skill_ids) is required.', 400);
      }

      const parsedBudgetMin = budget_min !== undefined ? parseFloat(budget_min) : null;
      if (parsedBudgetMin === null || isNaN(parsedBudgetMin)) {
        return error(res, 'Price / Budget is required.', 400);
      }

      if (work_mode === 'ONSITE' && (!location || !location.address || location.address.trim().length === 0)) {
        return error(res, 'Location address is required for ONSITE work mode.', 400);
      }

      const parsedMinAge = parseInteger(min_age);
      const parsedMaxAge = parseInteger(max_age);

      if (min_age !== undefined && min_age !== null && parsedMinAge === null) {
        return error(res, 'Minimum age must be a valid integer.', 400);
      }
      if (max_age !== undefined && max_age !== null && parsedMaxAge === null) {
        return error(res, 'Maximum age must be a valid integer.', 400);
      }
      if (parsedMinAge !== null && parsedMaxAge !== null && parsedMinAge > parsedMaxAge) {
        return error(res, 'Minimum age cannot be greater than maximum age.', 400);
      }

      const parsedMinHeight = parseInteger(min_height_cm);
      const parsedMaxHeight = parseInteger(max_height_cm);

      if (min_height_cm !== undefined && min_height_cm !== null && parsedMinHeight === null) {
        return error(res, 'Minimum height must be a valid integer.', 400);
      }
      if (max_height_cm !== undefined && max_height_cm !== null && parsedMaxHeight === null) {
        return error(res, 'Maximum height must be a valid integer.', 400);
      }
      if (parsedMinHeight !== null && parsedMaxHeight !== null && parsedMinHeight > parsedMaxHeight) {
        return error(res, 'Minimum height cannot be greater than maximum height.', 400);
      }

      // Check conditional validations for RECRUITMENT vs SERVICE_OFFER
      if (post_type === 'RECRUITMENT') {
        const parsedPeopleNeeded = parseInteger(people_needed);
        if (parsedPeopleNeeded === null || parsedPeopleNeeded < 1) {
          return error(res, 'People needed must be a valid integer and at least 1 for RECRUITMENT.', 400);
        }
        if (!contact_phone || contact_phone.trim().length === 0) {
          return error(res, 'Contact phone is required for RECRUITMENT.', 400);
        }
        if (!start_date) {
          return error(res, 'Start date is required for RECRUITMENT.', 400);
        }
        const parsedStartDate = new Date(start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedStartDate < today) {
          return error(res, 'Start date cannot be in the past.', 400);
        }
      }

      // Support slug-to-UUID lookup if category_id is a slug
      let finalCategoryId = category_id;
      if (category_id && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(category_id)) {
        const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1', [category_id]);
        if (catRes.rows[0]) {
          finalCategoryId = catRes.rows[0].id;
        }
      }

      // Validate that skill_ids belong to the finalCategoryId
      if (skill_ids && skill_ids.length > 0) {
        const skillsQuery = await pool.query(
          'SELECT category_id FROM skills WHERE id = ANY($1::uuid[])',
          [skill_ids]
        );
        for (const skill of skillsQuery.rows) {
          if (skill.category_id !== finalCategoryId) {
            return error(res, 'One or more subcategories do not belong to the selected field.', 400);
          }
        }
      }

      // Clean hashtags
      const cleanHashtags = (hashtags || []).map(h => h.replace(/^#+/, '').trim()).filter(h => h.length > 0);

      // 1. Create the task
      const task = await taskModel.create({
        posterId: posterId,
        categoryId: finalCategoryId,
        title,
        description,
        taskType: task_type,
        budgetMin: budget_min,
        budgetMax: budget_max,
        deadlineStart: deadline_start || null,
        deadlineEnd: deadline_end || null,
        allowInsurance: allow_insurance || false,
        images: images || [],
        postType: post_type,
        workMode: work_mode,
        salaryUnit: salary_unit,
        employmentType: employment_type,
        peopleNeeded: post_type === 'SERVICE_OFFER' ? null : people_needed,
        contactPhone: contact_phone,
        startDate: start_date,
        experienceLevel: experience_level,
        educationLevel: education_level,
        genderRequirement: post_type === 'SERVICE_OFFER' ? 'NO_REQUIREMENT' : gender_requirement,
        minAge: post_type === 'SERVICE_OFFER' ? null : min_age,
        maxAge: post_type === 'SERVICE_OFFER' ? null : max_age,
        minHeightCm: post_type === 'SERVICE_OFFER' ? null : min_height_cm,
        maxHeightCm: post_type === 'SERVICE_OFFER' ? null : max_height_cm,
        hashtags: cleanHashtags,
        applicationDeadline: application_deadline || null,
      });

      // 2. Add required skills (if provided)
      if (skill_ids && skill_ids.length > 0) {
        await taskModel.addRequiredSkills(task.id, skill_ids);
      }

      // 3. Add location (if provided)
      if (location && location.address) {
        await taskModel.addLocation(task.id, {
          locationType: location.location_type || 'TASK_LOCATION',
          address: location.address,
          latitude: location.latitude || null,
          longitude: location.longitude || null,
        });
      }

      // 4. Fetch the complete task with all relations
      const fullTask = await taskModel.findById(task.id);

      await invalidateTaskCache(task.id);

      return success(res, fullTask, 'Task created successfully.', 201);
    } catch (err) {
      console.error('Create task error:', err);
      return error(res, 'Failed to create task.', 500);
    }
  },

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
          currentUserId: req.user.id
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
            currentUserId: req.user.id,
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
          currentUserId: req.user.id,
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

      // Cache thông tin chi tiết task (không chứa trạng thái is_saved của user cụ thể) trong 2 phút
      const task = await cacheService.getOrFetch(cacheKey, CACHE_CONFIG.TASK_DETAIL_TTL, async () => {
        // Truy vấn với user ID là null để is_saved trong cache luôn là false
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
   * PATCH /api/tasks/:id/status
   * Update task status (Poster only — owner check)
   */
  async updateTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Lock base task row
        const locked = await client.query(
          'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
          [id]
        );
        const baseTask = locked.rows[0];
        if (!baseTask) {
          const e = new Error('Task not found.');
          e.statusCode = 404;
          throw e;
        }

        // Check ownership
        if (baseTask.poster_id !== userId) {
          const e = new Error('You can only update your own tasks.');
          e.statusCode = 403;
          throw e;
        }

        const currentStatus = fromDbTaskStatus(baseTask.status);

        // Validate status transition
        const validTransitions = {
          [TASK_STATUS.OPEN]: [TASK_STATUS.CANCELLED],
          [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED],
          [TASK_STATUS.COMPLETED]: [],
          [TASK_STATUS.CANCELLED]: [],
        };

        const allowedStatuses = validTransitions[currentStatus] || [];
        if (!allowedStatuses.includes(status)) {
          const e = new Error(`Cannot transition from ${currentStatus} to ${status}.`);
          e.statusCode = 400;
          throw e;
        }

        await taskModel.updateStatus(id, status, client);

        // Escrow side-effects
        if (currentStatus === TASK_STATUS.IN_PROGRESS && status === TASK_STATUS.COMPLETED) {
          await escrowService.releaseForTask(id, client);
        }
        if (currentStatus === TASK_STATUS.IN_PROGRESS && status === TASK_STATUS.CANCELLED) {
          await escrowService.refundForTask(id, client);
        }

        await client.query('COMMIT');
      } catch (txErr) {
        try { await client.query('ROLLBACK'); } catch {}
        throw txErr;
      } finally {
        client.release();
      }

      // Clear task cache
      await invalidateTaskCache(id);

      const updatedTask = await taskModel.findById(id);
      return success(res, updatedTask, `Task status updated to ${status}.`);
    } catch (err) {
      console.error('Update task status error:', err);
      const statusCode = err.statusCode || 500;
      return error(res, err.message || 'Failed to update task status.', statusCode);
    }
  },

  /**
   * PATCH /api/tasks/:id
   * Update task details (Poster only — owner check)
   */
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // 1. Load task and check permissions
      const { task, permCheck } = await loadTask(id, userId);
      if (!permCheck.hasPermission) {
        return error(res, permCheck.message, permCheck.status);
      }

      // 2. Validate input
      const validation = await validateUpdateInput(req.body, task);
      if (!validation.isValid) {
        return error(res, validation.message, validation.status);
      }

      const { finalCategoryId } = validation;

      // 3. Apply updates and write to Database
      const updatePayload = applyTaskUpdates(req.body, task, finalCategoryId);
      await updateDatabase(id, updatePayload);

      // 4. Invalidate Cache
      await invalidateCache(id, finalCategoryId);

      // 5. Handle Notifications
      const fullUpdatedTask = await taskModel.findById(id);
      handleNotifications(fullUpdatedTask);

      // 6. Build and send response
      return buildResponse(res, fullUpdatedTask);
    } catch (err) {
      console.error('Update task error:', err);
      return error(res, 'Failed to update task.', 500);
    }
  },

  /**
   * DELETE /api/tasks/:id
   * Delete a task (Poster only — owner check)
   */
  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // 1. Check task exists
      const task = await taskModel.findById(id);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      // 2. Check ownership
      if (task.poster_id !== userId) {
        return error(res, 'You can only delete your own tasks.', 403);
      }

      const categoryId = task.category_id;

      // 3. Perform delete
      await taskModel.delete(id);

      // Clear task cache
      await invalidateTaskCache(id, categoryId);

      return success(res, null, 'Task deleted successfully.');
    } catch (err) {
      console.error('Delete task error:', err);
      return error(res, 'Failed to delete task.', 500);
    }
  },

  /**
   * POST /api/tasks/upload-images
   * Upload multiple base64 image strings to Cloudinary and return their URLs
   */
  async uploadTaskImages(req, res) {
    try {
      const { images } = req.body; // Expects { images: [ "base64...", "base64..." ] }
      if (!images || !Array.isArray(images) || images.length === 0) {
        return error(res, 'No images provided.', 400);
      }

      const { validateBase64Image } = require('../utils/fileValidator');

      // Validate each image
      for (const base64 of images) {
        try {
          validateBase64Image(base64, 5); // 5MB limit
        } catch (valErr) {
          return error(res, valErr.message, 400);
        }
      }

      console.log(`Uploading ${images.length} images to Cloudinary...`);
      const uploadPromises = images.map((base64) => cloudinary.uploadImage(base64));
      const urls = await Promise.all(uploadPromises);

      return success(res, { urls }, 'Images uploaded successfully.');
    } catch (err) {
      console.error('Upload task images controller error:', err);
      return error(res, err.message || 'Failed to upload images.', 500);
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

  /**
   * POST /api/tasks/:id/save
   * Save a task for the current user
   */
  async saveTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = await taskModel.findBaseById(id);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      await taskModel.saveForUser(userId, id);

      return success(res, { taskId: id, isSaved: true }, 'Task saved successfully.');
    } catch (err) {
      console.error('Save task error:', err);
      return error(res, 'Failed to save task.', 500);
    }
  },

  /**
   * DELETE /api/tasks/:id/save
   * Remove a saved task for the current user
   */
  async unsaveTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await taskModel.unsaveForUser(userId, id);

      return success(res, { taskId: id, isSaved: false }, 'Task removed from saved list.');
    } catch (err) {
      console.error('Unsave task error:', err);
      return error(res, 'Failed to remove saved task.', 500);
    }
  },

  /**
   * PATCH /api/tasks/:id/close-recruitment
   * Close recruitment early for a task (Poster only)
   */
  async closeRecruitment(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { closed_reason } = req.body;
      const userId = req.user.id;

      await client.query('BEGIN');

      // 1. Lock the task row
      const lockedTaskRes = await client.query(
        'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
        [id]
      );
      const lockedTask = lockedTaskRes.rows[0];
      if (!lockedTask) {
        const e = new Error('Task not found.');
        e.statusCode = 404;
        throw e;
      }

      if (lockedTask.poster_id !== userId) {
        const e = new Error('You can only close recruitment for your own tasks.');
        e.statusCode = 403;
        throw e;
      }

      const currentStatus = fromDbTaskStatus(lockedTask.status);
      if (currentStatus !== TASK_STATUS.OPEN) {
        const e = new Error('You can only close recruitment for open tasks.');
        e.statusCode = 400;
        throw e;
      }

      // 2. Close the task recruitment in DB
      const updatedTask = await taskModel.closeRecruitment(id, userId, closed_reason || null, client);

      // 3. Reject pending applications
      await client.query(
        "UPDATE task_applications SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE task_id = $1 AND status = 'pending'",
        [id]
      );

      // 4. Cancel assignments that haven't started yet (status = 'assigned')
      const assignedRes = await client.query(
        "SELECT * FROM assigned_tasks WHERE task_id = $1 AND status = 'assigned' FOR UPDATE",
        [id]
      );
      const unstartedAssignments = assignedRes.rows;

      for (const assoc of unstartedAssignments) {
        // Cancel assignment
        await client.query(
          "UPDATE assigned_tasks SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [assoc.id]
        );

        // Refund escrow for this tasker
        await escrowService.refundForTasker(id, assoc.tasker_id, client);
      }

      await client.query('COMMIT');

      // Socket.io & Notifications (outside transaction)
      const io = req.app.get('io');
      if (io) {
        // Notify rejected taskers
        const rejectedAppsRes = await pool.query(
          "SELECT tasker_id FROM task_applications WHERE task_id = $1 AND status = 'rejected'",
          [id]
        );
        for (const row of rejectedAppsRes.rows) {
          io.to(row.tasker_id).emit('application_rejected', {
            taskId: id,
            taskTitle: lockedTask.title,
            reason: closed_reason || 'Recruitment closed by poster.'
          });
        }

        // Notify cancelled taskers
        for (const assoc of unstartedAssignments) {
          io.to(assoc.tasker_id).emit('assignment_cancelled', {
            taskId: id,
            taskTitle: lockedTask.title,
            reason: closed_reason || 'Recruitment closed by poster.'
          });
        }
      }

      // Clear task cache
      await invalidateTaskCache(id);

      return success(res, updatedTask, 'Recruitment closed successfully.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Close recruitment error:', err);
      const statusCode = err.statusCode || 500;
      return error(res, err.message || 'Failed to close recruitment.', statusCode);
    } finally {
      client.release();
    }
  },
};

module.exports = taskController;
