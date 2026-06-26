import { prisma } from '@/lib/prisma';
import { WithdrawStatus, Prisma } from '@prisma/client';

export class WithdrawRepository {
  async findMany(params: {
    page: number;
    limit: number;
    status?: WithdrawStatus;
  }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.WithdrawRequestWhereInput = {};

    if (status) {
      where.status = status;
    }

    const [withdraws, total] = await Promise.all([
      prisma.withdrawRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { status: 'asc' }, // Let pending payouts stand out
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.withdrawRequest.count({ where }),
    ]);

    return { withdraws, total };
  }

  async findById(id: string) {
    return prisma.withdrawRequest.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: WithdrawStatus) {
    return prisma.withdrawRequest.update({
      where: { id },
      data: { status },
    });
  }
}
