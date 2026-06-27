import { prisma } from '@/lib/prisma';
import { TaskStatus, Prisma } from '@prisma/client';

export class TaskRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: TaskStatus;
    categoryId?: string;
  }) {
    const { page, limit, search, status, categoryId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          poster: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          category: true,
          _count: {
            select: {
              applications: true,
              assignedTask: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return { tasks, total };
  }

  async findById(id: string) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        poster: true,
        category: true,
        locations: true,
        escrow: true,
        requiredSkills: {
          include: {
            skill: true,
          },
        },
        applications: {
          include: {
            tasker: true,
          },
        },
        assignedTask: {
          include: {
            tasker: true,
            application: true,
          },
        },
        reviews: true,
        users_tasks_closed_by_idTousers: true,
      },
    });
  }

  async update(id: string, data: Prisma.TaskUpdateInput) {
    return prisma.task.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.task.delete({
      where: { id },
    });
  }
}
