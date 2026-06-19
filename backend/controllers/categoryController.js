'use strict';

const prisma = require('../db/prisma');

exports.getCategories = async (req, res, next) => {
  try {
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

    res.json({
      success: true,
      data: structuredCategories,
    });
  } catch (err) {
    next(err);
  }
};
