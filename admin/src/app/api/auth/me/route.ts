import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.request('GET', '/api/auth/me');
    const admin = getAdminFromRequest(request);
    return successResponse(admin, 'Profile retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
