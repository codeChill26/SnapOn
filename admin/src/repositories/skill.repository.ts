import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class SkillRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
  }) {
    const { page, limit, search, categoryId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SkillWhereInput = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: true,
          _count: {
            select: {
              taskRequiredSkills: true,
            },
          },
        },
      }),
      prisma.skill.count({ where }),
    ]);

    return { skills, total };
  }

  async findById(id: string) {
    return prisma.skill.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  async create(data: Prisma.SkillCreateInput) {
    return prisma.skill.create({
      data,
    });
  }

  async update(id: string, data: Prisma.SkillUpdateInput) {
    return prisma.skill.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.skill.delete({
      where: { id },
    });
  }
}
