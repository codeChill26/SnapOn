import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { BannerService } from '@/services/banner.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.request('GET', '/api/banners');
    getAdminFromRequest(request);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const search = searchParams.get('search') || undefined;

    const bannerService = new BannerService();
    const result = await bannerService.getBanners({ page, limit, search });

    return successResponse(result, 'Banners retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.request('POST', '/api/banners');
    getAdminFromRequest(request);

    const body = await request.json();
    const bannerService = new BannerService();
    const result = await bannerService.createBanner(body);

    return successResponse(result, 'Banner created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
