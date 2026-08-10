import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { loginSchema } from '@/validators/auth.validator';
import { handleApiError, ValidationError } from '@/lib/errors';
import { successResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    logger.request('POST', '/api/auth/login');
    const body = await request.json();
    
    // Validate request body
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.flatten().fieldErrors);
    }

    const { email, password } = validation.data;
    const authService = new AuthService();
    const result = await authService.login(email, password);

    // Set cookie
    const response = successResponse(result.user, 'Logged in successfully');
    response.cookies.set({
      name: 'admin_token',
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Login Error', error);
    return handleApiError(error);
  }
}
