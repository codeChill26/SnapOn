import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { SkillService } from '@/services/skill.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('GET', `/api/skills/${id}`);
    getAdminFromRequest(request);

    const skillService = new SkillService();
    const result = await skillService.getSkillById(id);

    return successResponse(result, 'Skill details retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('PUT', `/api/skills/${id}`);
    getAdminFromRequest(request);

    const body = await request.json();
    const skillService = new SkillService();
    const result = await skillService.updateSkill(id, body);

    return successResponse(result, 'Skill updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('DELETE', `/api/skills/${id}`);
    getAdminFromRequest(request);

    const skillService = new SkillService();
    const result = await skillService.deleteSkill(id);

    return successResponse(result, 'Skill deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
