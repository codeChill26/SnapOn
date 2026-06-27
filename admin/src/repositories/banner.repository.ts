import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class BannerRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.bannersWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [bannersList, total] = await Promise.all([
      prisma.banners.findMany({
        where,
        skip,
        take: limit,
        orderBy: { display_order: 'asc' },
        include: {
          categories: true,
        },
      }),
      prisma.banners.count({ where }),
    ]);

    return { banners: bannersList, total };
  }

  async findById(id: string) {
    return prisma.banners.findUnique({
      where: { id },
      include: {
        categories: true,
      },
    });
  }

  async findByCode(code: string) {
    return prisma.banners.findUnique({
      where: { code },
    });
  }

  async create(data: Prisma.bannersUncheckedCreateInput) {
    return prisma.banners.create({
      data,
    });
  }

  async update(id: string, data: Prisma.bannersUpdateInput) {
    return prisma.banners.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.banners.delete({
      where: { id },
    });
  }
}
