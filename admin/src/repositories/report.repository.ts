import { prisma } from '@/lib/prisma';
import { ReportStatus, Prisma } from '@prisma/client';

export class ReportRepository {
  async findMany(params: {
    page: number;
    limit: number;
    status?: ReportStatus;
  }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ReportWhereInput = {};

    if (status) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { status: 'asc' }, // Let pending reports stand out
        include: {
          reporter: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return { reports, total };
  }

  async findById(id: string) {
    return prisma.report.findUnique({
      where: { id },
      include: {
        reporter: true,
        targetUser: true,
        task: {
          include: {
            poster: true,
            category: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: ReportStatus) {
    return prisma.report.update({
      where: { id },
      data: { status },
    });
  }
}
