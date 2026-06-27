import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { TaskService } from '@/services/task.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { TaskStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    logger.request('GET', '/api/tasks');
    getAdminFromRequest(request);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') as TaskStatus) || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;

    const taskService = new TaskService();
    const result = await taskService.getTasks({ page, limit, search, status, categoryId });

    return successResponse(result, 'Tasks retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
