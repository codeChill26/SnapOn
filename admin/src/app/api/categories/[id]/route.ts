import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { CategoryService } from '@/services/category.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('GET', `/api/categories/${id}`);
    getAdminFromRequest(request);

    const categoryService = new CategoryService();
    const result = await categoryService.getCategoryById(id);

    return successResponse(result, 'Category details retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('PUT', `/api/categories/${id}`);
    getAdminFromRequest(request);

    const body = await request.json();
    const categoryService = new CategoryService();
    const result = await categoryService.updateCategory(id, body);

    return successResponse(result, 'Category updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('DELETE', `/api/categories/${id}`);
    getAdminFromRequest(request);

    const categoryService = new CategoryService();
    const result = await categoryService.deleteCategory(id);

    return successResponse(result, 'Category deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
