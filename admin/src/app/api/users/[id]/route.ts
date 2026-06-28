import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { UserService } from '@/services/user.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('GET', `/api/users/${id}`);
    getAdminFromRequest(request);

    const userService = new UserService();
    const result = await userService.getUserById(id);

    return successResponse(result, 'User details retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('PUT', `/api/users/${id}`);
    getAdminFromRequest(request);

    const body = await request.json();
    const userService = new UserService();
    const result = await userService.updateUser(id, body);

    return successResponse(result, 'User updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    logger.request('DELETE', `/api/users/${id}`);
    getAdminFromRequest(request);

    const userService = new UserService();
    const result = await userService.deleteUser(id);

    return successResponse(result, 'User deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
