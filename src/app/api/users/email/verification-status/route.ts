/**
 * 邮箱验证状态检查 API
 * GET /api/users/email/verification-status - 检查当前用户的邮箱验证状态
 */

import { NextRequest } from 'next/server';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';
import { getServerUser } from '@/lib/auth/auth-service';

/**
 * GET - 获取邮箱验证状态
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    // 检查邮箱验证状态
    const isVerified = !!user.email_confirmed_at;
    const email = user.email || '';

    return createSuccessResponse({
      email,
      isVerified,
      verifiedAt: user.email_confirmed_at || null,
      needsVerification: !isVerified,
    });
  } catch (error: unknown) {
    console.error('Get email verification status error:', error);
    return createErrorResponse(
      '获取邮箱验证状态失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

