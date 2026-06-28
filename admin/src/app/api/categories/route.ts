import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { CategoryService } from '@/services/category.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.request('GET', '/api/categories');
    getAdminFromRequest(request);

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '');
    const limit = parseInt(searchParams.get('limit') || '');
    const search = searchParams.get('search') || undefined;

    const categoryService = new CategoryService();
    
    // If no page/limit provided, return full list
    if (isNaN(page) || isNaN(limit)) {
      const list = await categoryService.getAllCategories();
      return successResponse(list, 'All categories retrieved successfully');
    }

    const result = await categoryService.getCategories({ page, limit, search });
    return successResponse(result, 'Categories retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.request('POST', '/api/categories');
    getAdminFromRequest(request);

    const body = await request.json();
    const categoryService = new CategoryService();
    const result = await categoryService.createCategory(body);

    return successResponse(result, 'Category created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
