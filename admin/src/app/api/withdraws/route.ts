import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { WithdrawService } from '@/services/withdraw.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { WithdrawStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    logger.request('GET', '/api/withdraws');
    getAdminFromRequest(request);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const status = (searchParams.get('status') as WithdrawStatus) || undefined;

    const withdrawService = new WithdrawService();
    const result = await withdrawService.getWithdraws({ page, limit, status });

    return successResponse(result, 'Withdraw requests retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
