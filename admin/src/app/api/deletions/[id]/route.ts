import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { DeletionService } from '@/services/deletion.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('GET', `/api/deletions/${id}`);
    getAdminFromRequest(request);

    const deletionService = new DeletionService();
    const result = await deletionService.getDeletionRequestById(id);

    return successResponse(result, 'Deletion request details retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('PUT', `/api/deletions/${id}`);
    getAdminFromRequest(request);

    const body = await request.json();
    const { action } = body; // 'APPROVE' | 'REJECT'

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return Response.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }

    const deletionService = new DeletionService();
    const result = await deletionService.processDeletionRequest(id, action);

    return successResponse(result, `Deletion request ${action.toLowerCase()}d successfully`);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('DELETE', `/api/deletions/${id}`);
    getAdminFromRequest(request);

    const deletionService = new DeletionService();
    await deletionService.deleteRequest(id);

    return successResponse(null, 'Deletion request deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
