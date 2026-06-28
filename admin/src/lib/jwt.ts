import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errors';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'snapon_admin_super_secret_jwt_key_2026';

export interface AdminPayload {
  id: string;
  email: string;
  role: string;
  fullName: string;
  avatarUrl?: string | null;
}

export function signToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string): AdminPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}

export function getAdminFromRequest(request: NextRequest): AdminPayload {
  // Try Cookie first
  const cookieToken = request.cookies.get('admin_token')?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  // Try Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.substring(7);
    return verifyToken(headerToken);
  }

  throw new UnauthorizedError('Authentication token is missing');
}
