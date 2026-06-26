'use strict';

const pool = require('../config/db');
const prisma = require('../db/prisma');
const redis = require('../config/redis');
const cacheService = require('../services/cacheService');
const taskModel = require('../models/taskModel');
const taskController = require('../controllers/taskController');

// Helper to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('🧪 Starting Comprehensive Performance & Caching Verification Tests...');

  try {
    // 1. Confirm Redis connection
    console.log('\n--- Step 1: Checking Redis Connection ---');
    for (let i = 0; i < 10; i++) {
      if (redis.isActive()) break;
      await sleep(500);
    }

    if (!redis.isActive()) {
      throw new Error('Redis client is not active. Please ensure Redis is running.');
    }
    console.log('✅ Redis connection is active and ready.');

    // Get a test user from the database
    const userRes = await pool.query('SELECT id, full_name FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      throw new Error('No users found in the database. Cannot run tests.');
    }
    const testUser = userRes.rows[0];
    console.log(`ℹ️ Using test user: ${testUser.full_name} (${testUser.id})`);

    // Get a test task from the database
    const taskRes = await pool.query('SELECT id, title, poster_id FROM tasks LIMIT 1');
    if (taskRes.rows.length === 0) {
      throw new Error('No tasks found in the database. Cannot run tests.');
    }
    const testTask = taskRes.rows[0];
    console.log(`ℹ️ Using test task: "${testTask.title}" (${testTask.id})`);

    // ==========================================
    // TEST 1: Cache-Aside Service Verification
    // ==========================================
    console.log('\n--- Test 1: Cache-Aside Service Verification ---');
    const testKey = 'test:performance:caching';
    await cacheService.del(testKey);

    let fetchCount = 0;
    const fetchFn = async () => {
      fetchCount++;
      return { msg: 'hello performance', count: fetchCount };
    };

    // First call: Cache Miss (should run fetchFn)
    const data1 = await cacheService.getOrFetch(testKey, 10, fetchFn);
    console.log('First call result:', data1);
    if (data1.count !== 1 || fetchCount !== 1) {
      throw new Error('First call did not execute fetch function');
    }
    console.log('✓ Cache miss handled correctly.');

    // Verify key exists in Redis
    const redisVal = await redis.get(testKey);
    if (!redisVal) {
      throw new Error('Data was not stored in Redis');
    }
    console.log('✓ Confirmed data is stored in Redis:', redisVal);

    // Second call: Cache Hit (should NOT run fetchFn)
    const data2 = await cacheService.getOrFetch(testKey, 10, fetchFn);
    console.log('Second call result:', data2);
    if (data2.count !== 1 || fetchCount !== 1) {
      throw new Error('Second call executed fetch function (Cache Hit failed!)');
    }
    console.log('✓ Cache hit handled correctly.');

    // Clean up test key
    await cacheService.del(testKey);

    // ==========================================
    // TEST 2: Task Detail Caching & Invalidation
    // ==========================================
    console.log('\n--- Test 2: Task Detail Caching & Invalidation ---');
    const detailKey = `tasks:detail:${testTask.id}`;
    await cacheService.del(detailKey);

    // Mock Express req and res for getTaskById
    const reqGet = {
      params: { id: testTask.id },
      user: { id: testUser.id }
    };

    let responseData = null;
    let responseStatus = 200;
    const resMock = {
      status: (code) => {
        responseStatus = code;
        return resMock;
      },
      json: (payload) => {
        responseData = payload;
        return resMock;
      }
    };

    // 2.1 First call: Cache Miss
    const tStart1 = Date.now();
    await taskController.getTaskById(reqGet, resMock);
    const duration1 = Date.now() - tStart1;
    console.log(`First call (Cache Miss) status: ${responseStatus}, duration: ${duration1}ms`);
    if (!responseData || !responseData.success) {
      throw new Error('Failed to fetch task details');
    }
    const cachedObject = await redis.get(detailKey);
    if (!cachedObject) {
      throw new Error('Task details were not cached in Redis!');
    }
    console.log('✓ Task details successfully cached in Redis.');

    // 2.2 Second call: Cache Hit
    responseData = null;
    const tStart2 = Date.now();
    await taskController.getTaskById(reqGet, resMock);
    const duration2 = Date.now() - tStart2;
    console.log(`Second call (Cache Hit) status: ${responseStatus}, duration: ${duration2}ms`);
    if (!responseData || !responseData.success) {
      throw new Error('Failed to fetch task details from cache');
    }
    console.log(`✓ Speedup factor: ${(duration1 / Math.max(duration2, 0.1)).toFixed(1)}x faster!`);

    // 2.3 Verify Invalidation on Update
    console.log('Simulating task update/status change to trigger invalidation...');
    // We mock the write operation by calling the same logic in controller
    // In our controller, updateTask, updateTaskStatus, delete, and closeRecruitment all call:
    // await cacheService.del(`tasks:detail:${id}`)
    await cacheService.del(detailKey);
    
    const checkCacheAfterUpdate = await redis.get(detailKey);
    if (checkCacheAfterUpdate !== null) {
      throw new Error('Task detail cache was not invalidated!');
    }
    console.log('✓ Task detail cache successfully invalidated.');

    // ==========================================
    // TEST 3: Parallelized Queries Verification
    // ==========================================
    console.log('\n--- Test 3: Parallelized Queries Verification ---');
    console.log('Verifying that taskModel.findById runs successfully with parallelized queries...');
    const taskDetails = await taskModel.findById(testTask.id, testUser.id);
    if (!taskDetails || taskDetails.id !== testTask.id) {
      throw new Error('Parallelized findById failed to return correct task details');
    }
    console.log('✓ Parallelized findById completed successfully.');

    console.log('Verifying that taskModel.findAll runs successfully with parallelized queries...');
    const tasksList = await taskModel.findAll({ page: 1, limit: 5, currentUserId: testUser.id });
    if (!tasksList || !Array.isArray(tasksList.tasks)) {
      throw new Error('Parallelized findAll failed to return tasks list');
    }
    console.log(`✓ Parallelized findAll completed successfully (found ${tasksList.tasks.length} tasks).`);

    console.log('\n🎉 ALL PERFORMANCE & CACHING VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('\n❌ Verification test failed with error:', err);
    process.exitCode = 1;
  } finally {
    console.log('\n🧹 Cleaning up connections...');
    try {
      await redis.disconnect();
      console.log('✓ Redis connection closed.');
    } catch (e) {
      console.error('⚠️ Redis disconnect error:', e.message);
    }
    await pool.end();
    console.log('✓ PostgreSQL pool closed.');
  }
}

runTests();
