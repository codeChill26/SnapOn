import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { SkillService } from '@/services/skill.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.request('GET', '/api/skills');
    getAdminFromRequest(request);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const search = searchParams.get('search') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;

    const skillService = new SkillService();
    const result = await skillService.getSkills({ page, limit, search, categoryId });

    return successResponse(result, 'Skills retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.request('POST', '/api/skills');
    getAdminFromRequest(request);

    const body = await request.json();
    const skillService = new SkillService();
    const result = await skillService.createSkill(body);

    return successResponse(result, 'Skill created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
