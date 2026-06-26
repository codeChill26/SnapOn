import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource Not Found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource Conflict') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation Failed', public errors?: any) {
    super(message, 422);
  }
}

export function handleApiError(error: unknown) {
  console.error('[API Error] Logged:', error);
  
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        data: error instanceof ValidationError ? { errors: error.errors } : null,
      },
      { status: error.statusCode }
    );
  }
  
  // Handle potential prisma errors e.g. code P2002 (unique constraint)
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; message?: string };
    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          message: 'A resource with this unique value already exists.',
          data: null,
        },
        { status: 409 }
      );
    }
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          message: 'Resource not found or record to update not found.',
          data: null,
        },
        { status: 404 }
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: error instanceof Error ? error.message : 'Internal Server Error',
      data: null,
    },
    { status: 500 }
  );
}
