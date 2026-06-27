import { BannerRepository } from '../repositories/banner.repository';
import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError } from '../lib/errors';

export class BannerService {
  private bannerRepository = new BannerRepository();

  async getBanners(params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    return this.bannerRepository.findMany(params);
  }

  async getBannerById(id: string) {
    const banner = await this.bannerRepository.findById(id);
    if (!banner) {
      throw new NotFoundError('Banner not found');
    }
    return banner;
  }

  async createBanner(data: Prisma.bannersUncheckedCreateInput) {
    const existing = await this.bannerRepository.findByCode(data.code);
    if (existing) {
      throw new ConflictError(`Banner with code "${data.code}" already exists`);
    }
    return this.bannerRepository.create(data);
  }

  async updateBanner(id: string, data: Prisma.bannersUpdateInput) {
    const banner = await this.bannerRepository.findById(id);
    if (!banner) {
      throw new NotFoundError('Banner not found');
    }

    if (data.code && typeof data.code === 'string' && data.code !== banner.code) {
      const existing = await this.bannerRepository.findByCode(data.code);
      if (existing) {
        throw new ConflictError(`Banner with code "${data.code}" already exists`);
      }
    }

    return this.bannerRepository.update(id, data);
  }

  async toggleBannerStatus(id: string, isActive: boolean) {
    const banner = await this.bannerRepository.findById(id);
    if (!banner) {
      throw new NotFoundError('Banner not found');
    }
    return this.bannerRepository.update(id, { is_active: isActive });
  }

  async deleteBanner(id: string) {
    const banner = await this.bannerRepository.findById(id);
    if (!banner) {
      throw new NotFoundError('Banner not found');
    }
    return this.bannerRepository.delete(id);
  }
}
