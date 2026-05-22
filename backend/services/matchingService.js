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
   * Calculate score for a single application
   */
  async calculateScore(application, task) {
    const taskerId = application.tasker_id;
    const budgetMax = parseFloat(task.budget_max);
    const bidPrice = parseFloat(application.bid_price);

    // 1. Price Score: lower bid = higher score
    const priceScore = budgetMax > 0 ? 1 - (bidPrice / budgetMax) : 0;

    // 2. Rating Score: average_rating / 5
    const { averageRating } = await taskerProfileModel.getAverageRating(taskerId);
    const ratingScore = averageRating / 5;

    // 3. Distance Score: closer = higher score (max 50km considered)
    let distanceScore = 0.5; // Default if no location data
    const taskerLocation = await taskerProfileModel.getLocation(taskerId);

    if (task.locations && task.locations.length > 0 && taskerLocation) {
      const taskLocation = task.locations[0];
      const distance = this.calculateDistance(
        taskerLocation.latitude,
        taskerLocation.longitude,
        parseFloat(taskLocation.latitude),
        parseFloat(taskLocation.longitude)
      );

      if (distance !== null) {
        const maxDistance = 50; // 50km maximum
        distanceScore = Math.max(0, 1 - (distance / maxDistance));
      }
    }

    // 4. Completion Rate Score
    const completionRate = await taskerProfileModel.getCompletionRate(taskerId);
    const completionScore = completionRate;

    // 5. Response Time Score: faster response = higher score (max 120 minutes)
    const avgResponseTime = await taskerProfileModel.getAverageResponseTime(taskerId);
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
      applicationId: application.id,
      taskerId: application.tasker_id,
      taskerName: application.tasker_name,
      taskerAvatar: application.tasker_avatar,
      bidPrice: application.bid_price,
      estimatedTime: application.estimated_time,
      message: application.message,
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

    // Calculate scores for all applications
    const scoredApplications = await Promise.all(
      pendingApplications.map((app) => this.calculateScore(app, task))
    );

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
