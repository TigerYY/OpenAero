/**
 * 支付状态同步定时任务
 * GET /api/cron/payments-sync
 * 
 * 此端点可以通过以下方式调用：
 * 1. Vercel Cron Jobs (推荐)
 * 2. GitHub Actions
 * 3. 外部定时任务服务
 * 
 * 需要在环境变量中设置 CRON_SECRET 用于安全验证
 */

import { NextRequest } from 'next/server';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';
import { syncPendingPayments } from '@/lib/payment/payment-status-sync';

export const dynamic = 'force-dynamic';

/**
 * GET - 定时同步支付状态
 */
export async function GET(request: NextRequest) {
  try {
    // 验证Cron Secret（防止未授权调用）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return createErrorResponse('未授权访问', 401);
    }

    // 执行批量同步（每次最多50条）
    const result = await syncPendingPayments(50);

    return createSuccessResponse(
      {
        ...result,
        timestamp: new Date().toISOString(),
      },
      '定时同步完成'
    );
  } catch (error: unknown) {
    console.error('定时同步支付状态失败:', error);
    return createErrorResponse(
      '定时同步失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

