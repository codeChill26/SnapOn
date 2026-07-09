import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { EscrowService } from '@/services/escrow.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.request('GET', '/api/disputes');
    getAdminFromRequest(request);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const view = searchParams.get('view') === 'REFUND_MANUAL' ? 'REFUND_MANUAL' : 'DISPUTED';

    const escrowService = new EscrowService();
    const result = await escrowService.getEscrows({ page, limit, view });

    return successResponse(result, 'Escrow disputes retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
