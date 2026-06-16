'use strict';

const bannerService = require('../services/bannerService');
const { success, error } = require('../utils/responseHandler');

const bannerController = {
  /**
   * GET /api/banners/home
   * Public endpoint to get active home featured banners
   */
  async getHomeBanners(req, res) {
    try {
      const banners = await bannerService.getActiveHomeBanners();

      if (banners.length === 0) {
        return success(res, [], 'Không có banner đang hoạt động');
      }

      // Configure HTTP cache control: cache for 5 minutes (300 seconds)
      res.setHeader('Cache-Control', 'public, max-age=300');

      return success(res, banners, 'Lấy danh sách banner thành công');
    } catch (err) {
      console.error('Get home banners error:', err);
      return error(res, 'Failed to retrieve home banners.', 500);
    }
  },

  /**
   * GET /api/admin/banners
   * Admin endpoint to get all banners (with simple filters)
   */
  async getBanners(req, res) {
    try {
      const { placement, isActive } = req.query;
      const filters = {};
      if (placement) filters.placement = placement;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const banners = await bannerService.listBanners(filters);
      return success(res, banners, 'Banners retrieved successfully.');
    } catch (err) {
      console.error('Admin get banners error:', err);
      return error(res, 'Failed to retrieve banners.', 500);
    }
  },

  /**
   * GET /api/admin/banners/:id
   * Admin endpoint to get banner details
   */
  async getBannerById(req, res) {
    try {
      const { id } = req.params;
      const banner = await bannerService.getBannerDetail(id);
      return success(res, banner, 'Banner retrieved successfully.');
    } catch (err) {
      console.error('Admin get banner by ID error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to retrieve banner.', status);
    }
  },

  /**
   * POST /api/admin/banners
   * Admin endpoint to create a new banner
   */
  async createBanner(req, res) {
    try {
      const banner = await bannerService.createBanner(req.body);
      return success(res, banner, 'Banner created successfully.', 201);
    } catch (err) {
      console.error('Admin create banner error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to create banner.', status);
    }
  },

  /**
   * PUT /api/admin/banners/:id
   * Admin endpoint to update banner details
   */
  async updateBanner(req, res) {
    try {
      const { id } = req.params;
      const banner = await bannerService.updateBanner(id, req.body);
      return success(res, banner, 'Banner updated successfully.');
    } catch (err) {
      console.error('Admin update banner error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to update banner.', status);
    }
  },

  /**
   * PATCH /api/admin/banners/:id/status
   * Admin endpoint to toggle active status
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const banner = await bannerService.toggleStatus(id, isActive);
      return success(res, banner, 'Banner status updated successfully.');
    } catch (err) {
      console.error('Admin update banner status error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to update banner status.', status);
    }
  },

  /**
   * DELETE /api/admin/banners/:id
   * Admin endpoint to delete a banner
   */
  async deleteBanner(req, res) {
    try {
      const { id } = req.params;
      const result = await bannerService.deleteBanner(id);
      return success(res, result, 'Banner deleted successfully.');
    } catch (err) {
      console.error('Admin delete banner error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to delete banner.', status);
    }
  },
};

module.exports = bannerController;
