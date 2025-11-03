import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken } from '@/backend/auth/auth.middleware';
import { ApiResponse } from '@/types';

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: NextResponse;
}

/**
 * Helper function to authenticate token and return a structured result
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const authResponse = await authenticateToken(request);
  
  if (authResponse) {
    // Authentication failed, return the error response
    return {
      success: false,
      error: authResponse
    };
  }
  
  // Authentication successful, extract user from request
  const user = (request as any).user;
  if (!user) {
    return {
      success: false,
      error: NextResponse.json(
        {
          success: false,
          error: 'User information not found',
          code: 401,
        } as ApiResponse,
        { status: 401 }
      )
    };
  }
  
  return {
    success: true,
    user: {
      id: user.userId,
      email: user.email,
      role: user.role
    }
  };
}