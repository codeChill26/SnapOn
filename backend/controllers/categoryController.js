'use strict';

const prisma = require('../db/prisma');
const redis = require('../config/redis');
const { success } = require('../utils/responseHandler');

exports.getCategories = async (req, res, next) => {
  try {
    const cacheKey = 'categories:structured';

    // 1. Try to read from Redis cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      try {
        const categories = JSON.parse(cachedData);
        return success(res, categories);
      } catch (parseErr) {
        // Fall back to database if JSON parsing fails
      }
    }

    // 2. Cache miss: Fetch from PostgreSQL
    const categories = await prisma.category.findMany({
      include: {
        skills: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Structure data to match mobile expectations (renaming skills -> subcategories)
    const structuredCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      subcategories: cat.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        apiCategoryId: cat.slug, // mapping helper for API filtering on mobile
      })),
    }));

    // 3. Cache in Redis with 24 hours TTL (86400 seconds)
    await redis.set(cacheKey, JSON.stringify(structuredCategories), 86400).catch(() => {});

    return success(res, structuredCategories);
  } catch (err) {
    next(err);
  }
};
