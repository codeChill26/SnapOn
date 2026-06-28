import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { WithdrawService } from '@/services/withdraw.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('GET', `/api/withdraws/${id}`);
    getAdminFromRequest(request);

    const withdrawService = new WithdrawService();
    const result = await withdrawService.getWithdrawById(id);

    return successResponse(result, 'Withdraw request details retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('PUT', `/api/withdraws/${id}`);
    getAdminFromRequest(request);

    const body = await request.json();
    const { status } = body;

    const withdrawService = new WithdrawService();
    const result = await withdrawService.processWithdraw(id, status);

    return successResponse(result, 'Withdraw request processed successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
