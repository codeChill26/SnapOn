import { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/jwt';
import { UserService } from '@/services/user.service';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { UserStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    logger.request('GET', '/api/users');
    getAdminFromRequest(request); // Protect route

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') as UserStatus) || undefined;

    const userService = new UserService();
    const result = await userService.getUsers({ page, limit, search, status });

    return successResponse(result, 'Users retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.request('POST', '/api/users');
    getAdminFromRequest(request); // Protect route

    const body = await request.json();
    const userService = new UserService();
    const result = await userService.createUser(body);

    return successResponse(result, 'User created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
