const pool = require('../config/db');
const taskApplicationModel = require('../models/taskApplicationModel');
const taskerProfileModel = require('../models/taskerProfileModel');
const taskModel = require('../models/taskModel');
const { MATCHING_WEIGHTS } = require('../utils/constants');

/**
 * Matching Service — Auto-match algorithm for tasks
 * 
 * Score = (w1 × PriceScore) + (w2 × RatingScore) + (w3 × DistanceScore) 
 *       + (w4 × CompletionScore) + (w5 × ResponseTimeScore)
 */
const matchingService = {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRad(deg) {
    return deg * (Math.PI / 180);
  },

  /**
   * Batch fetch stats for multiple taskers with Redis cache
   * Reduces database load and solves N+1 queries during matching
   */
  async batchGetTaskerStats(taskerIds) {
    if (!taskerIds || taskerIds.length === 0) return {};

    const statsMap = {};
    const misses = [];

    // 1. Thử lấy dữ liệu từ Redis trước
    const redisService = require('../config/redis');
    if (redisService.isActive()) {
      await Promise.all(
        taskerIds.map(async (id) => {
          const key = `tasker:stats:${id}`;
          try {
            const cached = await redisService.get(key);
            if (cached) {
              statsMap[id] = JSON.parse(cached);
            } else {
              misses.push(id);
            }
          } catch (e) {
            misses.push(id);
          }
        })
      );
    } else {
      misses.push(...taskerIds);
    }

    if (misses.length === 0) return statsMap;

    // 2. Cache Miss: Thực hiện 3 truy vấn gộp song song trong DB
    const [ratingsRes, locationsRes, completionsRes] = await Promise.all([
      pool.query(
        `SELECT reviewee_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
         FROM reviews
         WHERE reviewee_id = ANY($1::uuid[])
         GROUP BY reviewee_id`,
        [misses]
      ),
      pool.query(
        `SELECT user_id, latitude, longitude, location_text 
         FROM tasker_profiles 
         WHERE user_id = ANY($1::uuid[])`,
        [misses]
      ),
      pool.query(
        `SELECT 
           tasker_id,
           COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
           COUNT(*) AS total
         FROM assigned_tasks
         WHERE tasker_id = ANY($1::uuid[])
         GROUP BY tasker_id`,
        [misses]
      )
    ]);

    // Map kết quả đánh giá
    const ratingsMap = {};
    ratingsRes.rows.forEach((row) => {
      ratingsMap[row.reviewee_id] = {
        averageRating: parseFloat(row.avg_rating) || 0,
        reviewCount: parseInt(row.review_count) || 0,
      };
    });

    // Map kết quả vị trí
    const locationsMap = {};
    locationsRes.rows.forEach((row) => {
      locationsMap[row.user_id] = {
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        locationText: row.location_text || null,
      };
    });

    // Map tỷ lệ hoàn thành
    const completionsMap = {};
    completionsRes.rows.forEach((row) => {
      const completed = parseInt(row.completed) || 0;
      const total = parseInt(row.total) || 0;
      completionsMap[row.tasker_id] = total > 0 ? completed / total : 0;
    });

    // 3. Tổng hợp dữ liệu và ghi cache Redis (TTL 10 phút)
    const cachePromises = [];
    misses.forEach((id) => {
      const stats = {
        averageRating: ratingsMap[id]?.averageRating || 0,
        reviewCount: ratingsMap[id]?.reviewCount || 0,
        latitude: locationsMap[id]?.latitude || null,
        longitude: locationsMap[id]?.longitude || null,
        locationText: locationsMap[id]?.locationText || null,
        completionRate: completionsMap[id] || 0,
        averageResponseTime: 30, // giá trị mặc định an toàn
      };

      statsMap[id] = stats;

      if (redisService.isActive()) {
        const key = `tasker:stats:${id}`;
        cachePromises.push(
          redisService.set(key, JSON.stringify(stats), 600).catch(() => {})
        );
      }
    });

    if (cachePromises.length > 0) {
      await Promise.all(cachePromises);
    }

    return statsMap;
  },

  /**
   * Calculate score for a single application (Single tasker - backward compatible)
   */
  async calculateScore(application, task) {
    const taskerId = application.tasker_id;
    const statsMap = await this.batchGetTaskerStats([taskerId]);
    const stats = statsMap[taskerId] || {
      averageRating: 0,
      reviewCount: 0,
      latitude: null,
      longitude: null,
      locationText: null,
      completionRate: 0,
      averageResponseTime: 30,
    };
    return this.calculateScoreWithStats(application, task, stats);
  },

  /**
   * Core score calculation using pre-fetched stats
   */
  calculateScoreWithStats(application, task, stats) {
    const budgetMax = parseFloat(task.budget_max);
    const bidPrice = parseFloat(application.bid_price);

    // 1. Price Score: lower bid = higher score
    const priceScore = budgetMax > 0 ? 1 - (bidPrice / budgetMax) : 0;

    // 2. Rating Score: average_rating / 5
    const averageRating = stats.averageRating;
    const ratingScore = averageRating / 5;

    // 3. Distance Score: closer = higher score (max 50km considered)
    let distanceScore = 0.5; // Default if no location data

    if (task.locations && task.locations.length > 0 && stats.latitude !== null && stats.longitude !== null) {
      const taskLocation = task.locations[0];
      const distance = this.calculateDistance(
        stats.latitude,
        stats.longitude,
        parseFloat(taskLocation.latitude),
        parseFloat(taskLocation.longitude)
      );

      if (distance !== null) {
        const maxDistance = 50; // 50km maximum
        distanceScore = Math.max(0, 1 - (distance / maxDistance));
      }
    }

    // 4. Completion Rate Score
    const completionScore = stats.completionRate;

    // 5. Response Time Score: faster response = higher score (max 120 minutes)
    const avgResponseTime = stats.averageResponseTime;
    const maxResponseMinutes = 120;
    const responseTimeScore = Math.max(0, 1 - (avgResponseTime / maxResponseMinutes));

    // Calculate weighted total score
    const totalScore =
      MATCHING_WEIGHTS.PRICE * priceScore +
      MATCHING_WEIGHTS.RATING * ratingScore +
      MATCHING_WEIGHTS.DISTANCE * distanceScore +
      MATCHING_WEIGHTS.COMPLETION_RATE * completionScore +
      MATCHING_WEIGHTS.RESPONSE_TIME * responseTimeScore;

    return {
      id: application.id,
      applicationId: application.id,
      taskId: application.task_id,
      taskerId: application.tasker_id,
      taskerName: application.tasker_name,
      taskerAvatar: application.tasker_avatar,
      bidPrice: application.bid_price,
      estimatedTime: application.estimated_time,
      message: application.message,
      status: application.status,
      average_rating: averageRating,
      created_at: application.created_at,
      score: Math.round(totalScore * 100) / 100,
      scores: {
        price: Math.round(priceScore * 100) / 100,
        rating: Math.round(ratingScore * 100) / 100,
        distance: Math.round(distanceScore * 100) / 100,
        completionRate: Math.round(completionScore * 100) / 100,
        responseTime: Math.round(responseTimeScore * 100) / 100,
        total: Math.round(totalScore * 100) / 100,
      },
    };
  },

  /**
   * Rank all pending applications for a task by score
   */
  async rankApplications(taskId) {
    const task = await taskModel.findById(taskId);
    if (!task) throw new Error('Task not found');

    const applications = await taskApplicationModel.findByTaskId(taskId);
    const pendingApplications = applications.filter((app) => app.status === 'PENDING');

    if (pendingApplications.length === 0) return [];

    // 1. Lấy danh sách các tasker duy nhất
    const taskerIds = [...new Set(pendingApplications.map((app) => app.tasker_id))];

    // 2. Gọi gộp truy vấn và cache Redis
    const taskerStatsMap = await this.batchGetTaskerStats(taskerIds);

    // 3. Tính toán điểm số đồng thời từ map đã chuẩn bị sẵn (Không còn N+1)
    const scoredApplications = pendingApplications.map((app) => {
      const stats = taskerStatsMap[app.tasker_id] || {
        averageRating: 0,
        reviewCount: 0,
        latitude: null,
        longitude: null,
        locationText: null,
        completionRate: 0,
        averageResponseTime: 30,
      };
      return this.calculateScoreWithStats(app, task, stats);
    });

    // Sort by total score descending
    scoredApplications.sort((a, b) => b.scores.total - a.scores.total);

    return scoredApplications;
  },

  /**
   * Auto-match: get the best matching application
   */
  async autoMatch(taskId) {
    const rankedApplications = await this.rankApplications(taskId);

    if (rankedApplications.length === 0) {
      return null;
    }

    return rankedApplications[0]; // Best match
  },
};

module.exports = matchingService;
