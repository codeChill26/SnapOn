import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { EscrowService, DisputeAction } from '@/services/escrow.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError, BadRequestError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('GET', `/api/disputes/${id}`);
    getAdminFromRequest(request);

    const escrowService = new EscrowService();
    const result = await escrowService.getEscrowById(id);

    return successResponse(result, 'Escrow details retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('PUT', `/api/disputes/${id}`);
    getAdminFromRequest(request);

    const body = await request.json();
    const { action } = body as { action?: string };

    const escrowService = new EscrowService();

    if (action === 'MARK_REFUNDED') {
      const result = await escrowService.markManualRefundDone(id);
      return successResponse(result, 'Manual refund marked as done');
    }

    if (action !== 'RELEASE' && action !== 'REFUND') {
      throw new BadRequestError('action must be RELEASE, REFUND, or MARK_REFUNDED');
    }

    const result = await escrowService.resolveDispute(id, action as DisputeAction);
    return successResponse(result, 'Dispute resolved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
