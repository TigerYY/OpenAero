/**
 * 创作者收益统计 API
 * GET /api/creators/dashboard/revenue - 获取创作者收益统计
 */

import { NextRequest } from 'next/server';
import { RevenueStatus } from '@prisma/client';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { ensureCreatorProfile } from '@/lib/creator-profile-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/creators/dashboard/revenue - 获取收益统计
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    // 检查用户是否为创作者（使用 roles 数组）
    const userProfile = await prisma.userProfile.findUnique({
      where: { user_id: user.id },
      select: { roles: true },
    });

    const userRoles = Array.isArray(userProfile?.roles) ? userProfile.roles : [];
    if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('只有创作者可以访问此接口', 403);
    }

    // 确保用户有 CreatorProfile（如果用户有 CREATOR 角色但没有档案，自动创建）
    const creatorProfile = await ensureCreatorProfile(user.id);

    if (!creatorProfile) {
      return createErrorResponse('创作者档案不存在', 404);
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month'; // month, year, all

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // 从最早开始
        break;
    }

    // 获取收益分成数据
    // 使用 RevenueStatus.AVAILABLE 表示已结算可提现的收益
    const revenueShares = await prisma.revenueShare.findMany({
      where: {
        creator_id: creatorProfile.id,
        status: RevenueStatus.AVAILABLE,
        created_at: {
          gte: startDate,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            created_at: true,
          },
        },
        solution: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // 计算统计数据
    const totalRevenue = revenueShares.reduce((sum, r) => sum + Number(r.creator_revenue), 0);
    const platformFee = revenueShares.reduce((sum, r) => sum + Number(r.platform_fee), 0);
    const transactionCount = revenueShares.length;

    // 按月份分组统计
    const monthlyStats: Record<string, { revenue: number; count: number }> = {};
    revenueShares.forEach((share) => {
      const monthKey = `${share.created_at.getFullYear()}-${String(share.created_at.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { revenue: 0, count: 0 };
      }
      monthlyStats[monthKey].revenue += Number(share.creator_revenue);
      monthlyStats[monthKey].count += 1;
    });

    // 按方案分组统计
    const solutionStats: Record<string, { revenue: number; count: number; title: string }> = {};
    revenueShares.forEach((share) => {
      const solutionId = share.solution_id;
      if (!solutionStats[solutionId]) {
        solutionStats[solutionId] = {
          revenue: 0,
          count: 0,
          title: share.solution.title,
        };
      }
      solutionStats[solutionId].revenue += Number(share.creator_revenue);
      solutionStats[solutionId].count += 1;
    });

    return createSuccessResponse(
      {
        period,
        totalRevenue,
        platformFee,
        transactionCount,
        monthlyStats: Object.entries(monthlyStats).map(([month, stats]) => ({
          month,
          revenue: stats.revenue,
          count: stats.count,
        })),
        solutionStats: Object.entries(solutionStats).map(([solutionId, stats]) => ({
          solutionId,
          title: stats.title,
          revenue: stats.revenue,
          count: stats.count,
        })),
        recentTransactions: revenueShares.slice(0, 10).map((share) => ({
          id: share.id,
          orderNumber: share.order.order_number,
          solutionTitle: share.solution.title,
          revenue: Number(share.creator_revenue),
          platformFee: Number(share.platform_fee),
          createdAt: share.created_at,
        })),
      },
      '获取收益统计成功'
    );
  } catch (error) {
    console.error('获取收益统计失败:', error);
    return createErrorResponse(
      '获取收益统计失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

