import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { BannerService } from '@/services/banner.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('GET', `/api/banners/${id}`);
    getAdminFromRequest(request);

    const bannerService = new BannerService();
    const result = await bannerService.getBannerById(id);

    return successResponse(result, 'Banner details retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('PUT', `/api/banners/${id}`);
    getAdminFromRequest(request);

    const body = await request.json();
    const bannerService = new BannerService();
    const result = await bannerService.updateBanner(id, body);

    return successResponse(result, 'Banner updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('DELETE', `/api/banners/${id}`);
    getAdminFromRequest(request);

    const bannerService = new BannerService();
    const result = await bannerService.deleteBanner(id);

    return successResponse(result, 'Banner deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
