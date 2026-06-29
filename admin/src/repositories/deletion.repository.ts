import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class DeletionRepository {
  async findMany(params: {
    page: number;
    limit: number;
    status?: string;
  }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AccountDeletionRequestWhereInput = {};

    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.accountDeletionRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.accountDeletionRequest.count({ where }),
    ]);

    return { requests, total };
  }

  async findById(id: string) {
    return prisma.accountDeletionRequest.findUnique({
      where: { id },
    });
  }

  async updateStatus(id: string, status: string) {
    return prisma.accountDeletionRequest.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string) {
    return prisma.accountDeletionRequest.delete({
      where: { id },
    });
  }
}
