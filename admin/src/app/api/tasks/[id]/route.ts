import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { TaskService } from '@/services/task.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('GET', `/api/tasks/${id}`);
    getAdminFromRequest(request);

    const taskService = new TaskService();
    const result = await taskService.getTaskById(id);

    return successResponse(result, 'Task details retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('PUT', `/api/tasks/${id}`);
    getAdminFromRequest(request);

    const body = await request.json();
    const taskService = new TaskService();
    const result = await taskService.updateTask(id, body);

    return successResponse(result, 'Task updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('DELETE', `/api/tasks/${id}`);
    getAdminFromRequest(request);

    const taskService = new TaskService();
    const result = await taskService.deleteTask(id);

    return successResponse(result, 'Task deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
