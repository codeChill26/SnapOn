import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  logger.request('POST', '/api/auth/logout');
  const response = successResponse(null, 'Logged out successfully');
  response.cookies.delete('admin_token');
  return response;
}
