import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { ReportService } from '@/services/report.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { ReportStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    logger.request('GET', '/api/reports');
    getAdminFromRequest(request);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const status = (searchParams.get('status') as ReportStatus) || undefined;

    const reportService = new ReportService();
    const result = await reportService.getReports({ page, limit, status });

    return successResponse(result, 'Reports retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
