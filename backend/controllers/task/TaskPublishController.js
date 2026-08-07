const taskModel = require('../../models/taskModel');
const cloudinary = require('../../utils/cloudinary');
const pool = require('../../config/db');
const { success, error } = require('../../utils/responseHandler');
const { TASK_STATUS } = require('../../utils/constants');
const { invalidateTaskCache } = require('./taskCacheUtil');

// Safe integer parsing utility that checks for NaN
function parseInteger(val) {
  if (val === undefined || val === null || val === '') return null;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) return null;
  return parsed;
}

// Check permission for task updates
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

// Validate input payload for task creation or update
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
    application_deadline,
    images
  } = body;

  // Verify images count if provided
  if (images !== undefined && images !== null) {
    if (!Array.isArray(images)) {
      return { isValid: false, message: 'Images must be an array of URLs.', status: 400 };
    }
    if (images.length > 10) {
      return { isValid: false, message: 'Maximum of 10 images are allowed per task.', status: 400 };
    }
  }

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

// Load the task and check ownership/status permissions
async function loadTask(id, userId) {
  const task = await taskModel.findById(id);
  const permCheck = checkTaskPermission(task, userId);
  return { task, permCheck };
}

// Resolve category UUID if needed, then validate input fields
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

// Construct the payload of fields to update based on the current task state
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

// Execute DB update queries for task details, skills, and location
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

function sendTaskUpdateNotification(task) {
  console.log(`[NOTIFICATION] Task ${task.id} updated successfully.`);
}

const TaskPublishController = {
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
      if (images !== undefined && images !== null) {
        if (!Array.isArray(images)) {
          return error(res, 'Images must be an array of URLs.', 400);
        }
        if (images.length > 10) {
          return error(res, 'Maximum of 10 images are allowed per task.', 400);
        }
      }

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return error(res, 'Title is required.', 400);
      }
      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return error(res, 'Description is required.', 400);
      }
      if (!category_id) {
        return error(res, 'Field (category_id) is required.', 400);
      }

      // Support slug-to-UUID lookup if category_id is a slug
      let finalCategoryId = category_id;
      if (category_id && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(category_id)) {
        const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1', [category_id]);
        if (catRes.rows[0]) {
          finalCategoryId = catRes.rows[0].id;
        } else {
          // If category slug does not exist in DB yet, create it on the fly
          const newCat = await pool.query('INSERT INTO categories (id, name, slug) VALUES (gen_random_uuid(), $1, $2) RETURNING id', [category_id, category_id]);
          finalCategoryId = newCat.rows[0].id;
        }
      }

      // Auto-assign skill_ids if missing
      let finalSkillIds = skill_ids;
      if (!finalSkillIds || !Array.isArray(finalSkillIds) || finalSkillIds.length === 0) {
        const skillRes = await pool.query('SELECT id FROM skills WHERE category_id = $1 LIMIT 1', [finalCategoryId]);
        if (skillRes.rows[0]) {
          finalSkillIds = [skillRes.rows[0].id];
        } else {
          const newSkill = await pool.query('INSERT INTO skills (id, name, slug, category_id) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id', ['Việc chung', 'general-' + Date.now(), finalCategoryId]);
          finalSkillIds = [newSkill.rows[0].id];
        }
      }

      const parsedBudgetMin = budget_min !== undefined ? parseFloat(budget_min) : null;
      if (parsedBudgetMin === null || isNaN(parsedBudgetMin)) {
        return error(res, 'Price / Budget is required.', 400);
      }

      const finalPhone = contact_phone && contact_phone.trim().length > 0 ? contact_phone : (req.user?.phone || '0900000000');
      const finalStartDate = start_date ? start_date : new Date().toISOString();

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
        contactPhone: finalPhone,
        startDate: finalStartDate,
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
      if (finalSkillIds && finalSkillIds.length > 0) {
        await taskModel.addRequiredSkills(task.id, finalSkillIds);
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
      await invalidateTaskCache(id, finalCategoryId);

      // 5. Handle Notifications
      const fullUpdatedTask = await taskModel.findById(id);
      sendTaskUpdateNotification(fullUpdatedTask);

      // 6. Build and send response
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

      if (images.length > 10) {
        return error(res, 'Maximum of 10 images can be uploaded at once.', 400);
      }

      const { validateBase64Image } = require('../../utils/fileValidator');

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
};

module.exports = TaskPublishController;
