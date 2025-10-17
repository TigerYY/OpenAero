import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { ApiResponse } from '@/types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
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

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  // Handle known AppError instances
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.statusCode,
      } as ApiResponse,
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: validationErrors,
        code: 400,
      } as ApiResponse,
      { status: 400 }
    );
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any;
    
    switch (prismaError.code) {
      case 'P2002':
        return NextResponse.json(
          {
            success: false,
            error: 'A record with this information already exists',
            code: 409,
          } as ApiResponse,
          { status: 409 }
        );
      
      case 'P2025':
        return NextResponse.json(
          {
            success: false,
            error: 'Record not found',
            code: 404,
          } as ApiResponse,
          { status: 404 }
        );
      
      case 'P2003':
        return NextResponse.json(
          {
            success: false,
            error: 'Foreign key constraint failed',
            code: 400,
          } as ApiResponse,
          { status: 400 }
        );
      
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Database operation failed',
            code: 500,
          } as ApiResponse,
          { status: 500 }
        );
    }
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 500,
    } as ApiResponse,
    { status: 500 }
  );
}

export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse<ApiResponse>>
) {
  return async (...args: T): Promise<NextResponse<ApiResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
  }
}

export function validateId(id: string, fieldName: string = 'ID'): void {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError(`Invalid ${fieldName}: must be a non-empty string`);
  }
}

export function validatePaginationParams(page: number, limit: number): void {
  if (page < 1) {
    throw new ValidationError('Page must be greater than 0');
  }
  
  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }
}
