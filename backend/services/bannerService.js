'use strict';

const bannerModel = require('../models/bannerModel');

/**
 * Helper to map database banner row to public DTO
 */
function mapToBannerDTO(banner) {
  if (!banner) return null;

  return {
    id: banner.id,
    code: banner.code,
    title: banner.title,
    subtitle: banner.subtitle || '',
    imageUrl: banner.image_url,
    category: banner.category_id
      ? {
          id: banner.category_id,
          code: banner.category_slug ? banner.category_slug.toUpperCase() : undefined,
          name: banner.category_name || '',
        }
      : null,
    action: {
      type: banner.action_type,
      value: banner.action_value || banner.category_id || null,
    },
    displayOrder: banner.display_order,
  };
}

/**
 * Helper to map database banner row to admin detail DTO
 */
function mapToAdminBannerDTO(banner) {
  if (!banner) return null;

  return {
    id: banner.id,
    code: banner.code,
    title: banner.title,
    subtitle: banner.subtitle || '',
    imageUrl: banner.image_url,
    categoryId: banner.category_id,
    categoryName: banner.category_name || '',
    categorySlug: banner.category_slug || '',
    placement: banner.placement,
    actionType: banner.action_type,
    actionValue: banner.action_value || '',
    displayOrder: banner.display_order,
    isActive: banner.is_active,
    startAt: banner.start_at,
    endAt: banner.end_at,
    createdAt: banner.created_at,
    updatedAt: banner.updated_at,
  };
}

const bannerService = {
  /**
   * Get active home banners for public carousel
   */
  async getActiveHomeBanners() {
    const banners = await bannerModel.findActiveBanners('HOME_FEATURED');
    return banners.map(mapToBannerDTO);
  },

  /**
   * List all banners (Admin)
   */
  async listBanners(filters = {}) {
    const banners = await bannerModel.findAll(filters);
    return banners.map(mapToAdminBannerDTO);
  },

  /**
   * Get banner detail by ID (Admin)
   */
  async getBannerDetail(id) {
    const banner = await bannerModel.findById(id);
    if (!banner) {
      const err = new Error('Banner not found.');
      err.statusCode = 404;
      throw err;
    }
    return mapToAdminBannerDTO(banner);
  },

  /**
   * Create a new banner (Admin)
   */
  async createBanner(data) {
    // Check if code already exists
    const existing = await bannerModel.findByCode(data.code);
    if (existing) {
      const err = new Error(`Banner with code "${data.code}" already exists.`);
      err.statusCode = 409;
      throw err;
    }

    const banner = await bannerModel.create({
      code: data.code,
      title: data.title,
      subtitle: data.subtitle,
      imageUrl: data.imageUrl,
      categoryId: data.categoryId,
      placement: data.placement,
      actionType: data.actionType,
      actionValue: data.actionValue,
      displayOrder: data.displayOrder,
      isActive: data.isActive !== undefined ? data.isActive : true,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
    });

    const fullBanner = await bannerModel.findById(banner.id);
    return mapToAdminBannerDTO(fullBanner);
  },

  /**
   * Update banner detail (Admin)
   */
  async updateBanner(id, data) {
    const banner = await bannerModel.findById(id);
    if (!banner) {
      const err = new Error('Banner not found.');
      err.statusCode = 404;
      throw err;
    }

    if (data.code && data.code !== banner.code) {
      const existing = await bannerModel.findByCode(data.code);
      if (existing) {
        const err = new Error(`Banner with code "${data.code}" already exists.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const updated = await bannerModel.update(id, {
      code: data.code,
      title: data.title,
      subtitle: data.subtitle,
      imageUrl: data.imageUrl,
      categoryId: data.categoryId,
      placement: data.placement,
      actionType: data.actionType,
      actionValue: data.actionValue,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
    });

    const fullBanner = await bannerModel.findById(updated.id);
    return mapToAdminBannerDTO(fullBanner);
  },

  /**
   * Toggle status of banner (Admin status patch)
   */
  async toggleStatus(id, isActive) {
    const banner = await bannerModel.findById(id);
    if (!banner) {
      const err = new Error('Banner not found.');
      err.statusCode = 404;
      throw err;
    }

    const updated = await bannerModel.updateStatus(id, isActive);
    const fullBanner = await bannerModel.findById(updated.id);
    return mapToAdminBannerDTO(fullBanner);
  },

  /**
   * Delete banner (Admin)
   */
  async deleteBanner(id) {
    const banner = await bannerModel.findById(id);
    if (!banner) {
      const err = new Error('Banner not found.');
      err.statusCode = 404;
      throw err;
    }

    await bannerModel.delete(id);
    return { id };
  },
};

module.exports = bannerService;
