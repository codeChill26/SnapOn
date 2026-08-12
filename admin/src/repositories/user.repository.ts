import { prisma } from '@/lib/prisma';
import { UserStatus, Prisma } from '@prisma/client';

export class UserRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: UserStatus;
  }) {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          taskerProfile: true,
          _count: {
            select: {
              postedTasks: true,
              assignedTasks: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        taskerProfile: true,
        verifications: {
          include: {
            documents: true,
          },
          orderBy: { reviewedAt: 'desc' },
        },
        wallet: {
          include: {
            transactions: {
              orderBy: { created_at: 'desc' },
              take: 15,
            },
          },
        },
        postedTasks: {
          include: {
            category: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        assignedTasks: {
          include: {
            task: {
              include: {
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            postedTasks: true,
            assignedTasks: true,
            reviewsReceived: true,
            reportsReceived: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
    });
  }
}
