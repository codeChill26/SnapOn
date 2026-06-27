import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { ReportService } from '@/services/report.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('GET', `/api/reports/${id}`);
    getAdminFromRequest(request);

    const reportService = new ReportService();
    const result = await reportService.getReportById(id);

    return successResponse(result, 'Report details retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('PUT', `/api/reports/${id}`);
    getAdminFromRequest(request);

    const body = await request.json();
    const { status } = body;

    const reportService = new ReportService();
    const result = await reportService.updateReportStatus(id, status);

    return successResponse(result, 'Report status updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
