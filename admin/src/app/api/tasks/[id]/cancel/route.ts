import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { TaskService } from '@/services/task.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError, BadRequestError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('POST', `/api/tasks/${id}/cancel`);
    const admin = getAdminFromRequest(request);

    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string') {
      throw new BadRequestError('Cancellation reason is required');
    }

    const taskService = new TaskService();
    const result = await taskService.cancelTask(id, reason, admin.id);

    return successResponse(result, 'Task cancelled successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
