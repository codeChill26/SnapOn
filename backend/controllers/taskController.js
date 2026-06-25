const taskModel = require('../models/taskModel');
const cloudinary = require('../utils/cloudinary');
const escrowService = require('../services/escrowService');
const pool = require('../config/db');
const { success, error, paginated } = require('../utils/responseHandler');
const { TASK_STATUS } = require('../utils/constants');
const { fromDbTaskStatus } = require('../utils/dbEnum');

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

      if (min_age !== undefined && min_age !== null && max_age !== undefined && max_age !== null) {
        if (parseInt(min_age) > parseInt(max_age)) {
          return error(res, 'Minimum age cannot be greater than maximum age.', 400);
        }
      }

      if (min_height_cm !== undefined && min_height_cm !== null && max_height_cm !== undefined && max_height_cm !== null) {
        if (parseInt(min_height_cm) > parseInt(max_height_cm)) {
          return error(res, 'Minimum height cannot be greater than maximum height.', 400);
        }
      }

      // Check conditional validations for RECRUITMENT vs SERVICE_OFFER
      if (post_type === 'RECRUITMENT') {
        const parsedPeopleNeeded = parseInt(people_needed);
        if (isNaN(parsedPeopleNeeded) || parsedPeopleNeeded < 1) {
          return error(res, 'People needed must be at least 1 for RECRUITMENT.', 400);
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

      const result = await taskModel.findAll({
        status,
        categoryId: finalCategoryId,
        fieldId: finalFieldId,
        taskType: task_type,
        search,
        page: parseInt(page) || undefined,
        limit: parseInt(limit) || undefined,
        postType: post_type,
        workMode: work_mode,
        salaryUnit: salary_unit,
        currentUserId: req.user.id,
      });

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

      const task = await taskModel.findById(id, req.user.id);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      return success(res, task, 'Task retrieved successfully.');
    } catch (err) {
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
      const {
        title,
        description,
        category_id,
        task_type,
        budget_min,
        budget_max,
        deadline_start,
        deadline_end,
        allow_insurance,
        skill_ids,
        location,
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
      } = req.body;

      // 1. Check task exists
      const task = await taskModel.findById(id);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      // 2. Check ownership
      if (task.poster_id !== userId) {
        return error(res, 'You can only update your own tasks.', 403);
      }

      // 3. Check status is OPEN (cannot update tasks once matched or completed)
      if (task.status !== TASK_STATUS.OPEN) {
        return error(res, 'You can only update open tasks.', 400);
      }

      // Resolve category UUID if slug is sent
      let finalCategoryId = category_id;
      if (category_id && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(category_id)) {
        const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1', [category_id]);
        if (catRes.rows[0]) {
          finalCategoryId = catRes.rows[0].id;
        }
      }

      // Verify application deadline if provided in update
      if (application_deadline) {
        const parsedDeadline = new Date(application_deadline);
        if (isNaN(parsedDeadline.getTime())) {
          return error(res, 'Invalid application deadline format.', 400);
        }
        if (parsedDeadline <= new Date()) {
          return error(res, 'Application deadline must be in the future.', 400);
        }
      }

      // Merge current fields for validation
      const merged = {
        title: title !== undefined ? title : task.title,
        description: description !== undefined ? description : task.description,
        category_id: category_id !== undefined ? finalCategoryId : task.category_id,
        budget_min: budget_min !== undefined ? budget_min : task.budget_min,
        budget_max: budget_max !== undefined ? budget_max : task.budget_max,
        post_type: post_type !== undefined ? post_type : task.post_type,
        work_mode: work_mode !== undefined ? work_mode : task.work_mode,
        salary_unit: salary_unit !== undefined ? salary_unit : task.salary_unit,
        employment_type: employment_type !== undefined ? employment_type : task.employment_type,
        people_needed: people_needed !== undefined ? people_needed : task.people_needed,
        contact_phone: contact_phone !== undefined ? contact_phone : task.contact_phone,
        start_date: start_date !== undefined ? start_date : task.start_date,
        min_age: min_age !== undefined ? min_age : task.min_age,
        max_age: max_age !== undefined ? max_age : task.max_age,
        min_height_cm: min_height_cm !== undefined ? min_height_cm : task.min_height_cm,
        max_height_cm: max_height_cm !== undefined ? max_height_cm : task.max_height_cm,
        location: location !== undefined ? location : (task.locations && task.locations[0] ? task.locations[0] : null),
        application_deadline: application_deadline !== undefined ? application_deadline : task.application_deadline,
      };

      if (!merged.title || typeof merged.title !== 'string' || merged.title.trim().length === 0) {
        return error(res, 'Title cannot be empty.', 400);
      }
      if (!merged.description || typeof merged.description !== 'string' || merged.description.trim().length === 0) {
        return error(res, 'Description cannot be empty.', 400);
      }
      if (!merged.category_id) {
        return error(res, 'Field (category_id) is required.', 400);
      }

      // Validate that skill_ids belong to the category_id
      const finalSkillIds = skill_ids !== undefined ? skill_ids : (task.required_skills || []).map(s => s.id);
      if (finalSkillIds && finalSkillIds.length > 0) {
        const skillsQuery = await pool.query(
          'SELECT category_id FROM skills WHERE id = ANY($1::uuid[])',
          [finalSkillIds]
        );
        for (const skill of skillsQuery.rows) {
          if (skill.category_id !== merged.category_id) {
            return error(res, 'One or more subcategories do not belong to the selected field.', 400);
          }
        }
      }

      if (merged.work_mode === 'ONSITE' && (!merged.location || !merged.location.address || merged.location.address.trim().length === 0)) {
        return error(res, 'Location address is required for ONSITE work mode.', 400);
      }

      if (merged.min_age !== undefined && merged.min_age !== null && merged.max_age !== undefined && merged.max_age !== null) {
        if (parseInt(merged.min_age) > parseInt(merged.max_age)) {
          return error(res, 'Minimum age cannot be greater than maximum age.', 400);
        }
      }

      if (merged.min_height_cm !== undefined && merged.min_height_cm !== null && merged.max_height_cm !== undefined && merged.max_height_cm !== null) {
        if (parseInt(merged.min_height_cm) > parseInt(merged.max_height_cm)) {
          return error(res, 'Minimum height cannot be greater than maximum height.', 400);
        }
      }

      if (merged.post_type === 'RECRUITMENT') {
        const parsedPeopleNeeded = parseInt(merged.people_needed);
        if (isNaN(parsedPeopleNeeded) || parsedPeopleNeeded < 1) {
          return error(res, 'People needed must be at least 1 for RECRUITMENT.', 400);
        }
        if (!merged.contact_phone || merged.contact_phone.trim().length === 0) {
          return error(res, 'Contact phone is required for RECRUITMENT.', 400);
        }
        if (!merged.start_date) {
          return error(res, 'Start date is required for RECRUITMENT.', 400);
        }
      }

      // Clean hashtags if provided
      const cleanHashtags = hashtags !== undefined 
        ? (hashtags || []).map(h => h.replace(/^#+/, '').trim()).filter(h => h.length > 0)
        : task.hashtags;

      // 4. Perform update
      const updatedTask = await taskModel.update(id, {
        categoryId: finalCategoryId !== undefined ? finalCategoryId : task.category_id,
        title: title !== undefined ? title : task.title,
        description: description !== undefined ? description : task.description,
        taskType: task_type !== undefined ? task_type : task.task_type,
        budgetMin: budget_min !== undefined ? budget_min : task.budget_min,
        budgetMax: budget_max !== undefined ? budget_max : task.budget_max,
        deadlineStart: deadline_start !== undefined ? deadline_start : task.deadline_start,
        deadlineEnd: deadline_end !== undefined ? deadline_end : task.deadline_end,
        allowInsurance: allow_insurance !== undefined ? allow_insurance : task.allow_insurance,
        images: images !== undefined ? images : task.images,
        postType: post_type !== undefined ? post_type : task.post_type,
        workMode: work_mode !== undefined ? work_mode : task.work_mode,
        salaryUnit: salary_unit !== undefined ? salary_unit : task.salary_unit,
        employmentType: employment_type !== undefined ? employment_type : task.employment_type,
        peopleNeeded: post_type === 'SERVICE_OFFER' ? null : (people_needed !== undefined ? people_needed : task.people_needed),
        contactPhone: contact_phone !== undefined ? contact_phone : task.contact_phone,
        startDate: start_date !== undefined ? start_date : task.start_date,
        experienceLevel: experience_level !== undefined ? experience_level : task.experience_level,
        educationLevel: education_level !== undefined ? education_level : task.education_level,
        genderRequirement: post_type === 'SERVICE_OFFER' ? 'NO_REQUIREMENT' : (gender_requirement !== undefined ? gender_requirement : task.gender_requirement),
        minAge: post_type === 'SERVICE_OFFER' ? null : (min_age !== undefined ? min_age : task.min_age),
        maxAge: post_type === 'SERVICE_OFFER' ? null : (max_age !== undefined ? max_age : task.max_age),
        minHeightCm: post_type === 'SERVICE_OFFER' ? null : (min_height_cm !== undefined ? min_height_cm : task.min_height_cm),
        maxHeightCm: post_type === 'SERVICE_OFFER' ? null : (max_height_cm !== undefined ? max_height_cm : task.max_height_cm),
        hashtags: cleanHashtags,
        applicationDeadline: application_deadline !== undefined ? application_deadline : task.application_deadline,
      });

      // Update skills if skill_ids provided
      if (skill_ids !== undefined) {
        await pool.query('DELETE FROM task_required_skills WHERE task_id = $1', [id]);
        if (skill_ids && skill_ids.length > 0) {
          await taskModel.addRequiredSkills(id, skill_ids);
        }
      }

      // Update location if location provided
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

      const fullUpdatedTask = await taskModel.findById(id);

      return success(res, fullUpdatedTask, 'Task updated successfully.');
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

      // 3. Perform delete
      await taskModel.delete(id);

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
    try {
      const { id } = req.params;
      const { closed_reason } = req.body;
      const userId = req.user.id;

      const task = await taskModel.findById(id);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      if (task.poster_id !== userId) {
        return error(res, 'You can only close recruitment for your own tasks.', 403);
      }

      if (task.status !== TASK_STATUS.OPEN) {
        return error(res, 'You can only close recruitment for open tasks.', 400);
      }

      const updatedTask = await taskModel.closeRecruitment(id, userId, closed_reason || null);
      return success(res, updatedTask, 'Recruitment closed successfully.');
    } catch (err) {
      console.error('Close recruitment error:', err);
      return error(res, 'Failed to close recruitment.', 500);
    }
  },
};

module.exports = taskController;
