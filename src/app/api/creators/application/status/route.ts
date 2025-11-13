/**
 * 创作者申请状态查询 API
 * GET /api/creators/application/status - 获取当前用户的申请状态
 */

import { NextRequest } from 'next/server';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';
import { getUserApplicationStatus } from '@/lib/creator-application';

export const dynamic = 'force-dynamic';

/**
 * GET /api/creators/application/status - 获取申请状态
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const application = await getUserApplicationStatus(user.id);

    if (!application) {
      return createSuccessResponse(null, '您还没有提交创作者申请');
    }

    return createSuccessResponse(application, '获取申请状态成功');
  } catch (error) {
    console.error('获取申请状态失败:', error);
    return createErrorResponse(
      '获取申请状态失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

