import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { DeletionService } from '@/services/deletion.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.request('GET', '/api/deletions');
    getAdminFromRequest(request); // Protect route

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const status = searchParams.get('status') || undefined;

    const deletionService = new DeletionService();
    const result = await deletionService.getDeletionRequests({ page, limit, status });

    return successResponse(result, 'Deletion requests retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
