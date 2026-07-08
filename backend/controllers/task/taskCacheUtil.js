const pool = require('../../config/db');
const cacheService = require('../../services/cacheService');
const redis = require('../../config/redis');

async function invalidateTaskCache(taskId, categoryId) {
  try {
    if (!taskId) {
      return;
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
      if (catId) {
        const catIndexKey = `tasks:list:index:cat:${catId}`;
        const catKeys = await redis.smembers(catIndexKey).catch(() => []);
        if (catKeys && catKeys.length > 0) {
          await Promise.all(catKeys.map(key => cacheService.del(key))).catch(() => {});
        }
        await redis.del(catIndexKey).catch(() => {});
      }

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

module.exports = {
  invalidateTaskCache
};
