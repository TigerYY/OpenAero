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
 * GET /api/creators/dashboard/stats - 获取创作者仪表盘统计数据
 */
export async function GET(_request: NextRequest) {
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

    // 统一使用 roles 数组进行权限检查
    const userRoles = Array.isArray(userProfile?.roles) ? userProfile.roles : [];

    if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('只有创作者可以访问此接口', 403);
    }

    const userId = user.id;

    // 确保用户有 CreatorProfile（如果用户有 CREATOR 角色但没有档案，自动创建）
    const creatorProfile = await ensureCreatorProfile(userId);

    if (!creatorProfile) {
      return createErrorResponse('创作者档案不存在', 404);
    }

    // 获取方案统计
    // Solution 模型使用 creator_id 字段（snake_case）
    const solutionStats = await prisma.solution.groupBy({
      by: ['status'],
      where: {
        creator_id: creatorProfile.id,
      },
      _count: {
        id: true,
      },
    });

    // 计算各状态方案数量
    const totalSolutions = solutionStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const publishedSolutions = solutionStats.find((s) => s.status === 'PUBLISHED')?._count.id || 0;
    const draftSolutions = solutionStats.find((s) => s.status === 'DRAFT')?._count.id || 0;
    const pendingSolutions = solutionStats.find((s) => s.status === 'PENDING_REVIEW')?._count.id || 0;

    // 获取收益统计（通过收益分成表）
    // RevenueShare 模型使用 creator_id 字段（snake_case）
    // 使用 RevenueStatus.AVAILABLE 表示已结算可提现的收益
    const revenueShares = await prisma.revenueShare.findMany({
      where: {
        creator_id: creatorProfile.id,
        status: RevenueStatus.AVAILABLE,
      },
      select: {
        creator_revenue: true,
        created_at: true,
      },
    });

    // 计算总收益和本月收益
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalRevenue = revenueShares
      .filter((r) => r.created_at >= yearStart)
      .reduce((sum, r) => sum + Number(r.creator_revenue), 0);

    const monthlyRevenue = revenueShares
      .filter((r) => r.created_at >= monthStart)
      .reduce((sum, r) => sum + Number(r.creator_revenue), 0);

    // 获取订单统计
    const orderStats = await prisma.order.count({
      where: {
        orderSolutions: {
          some: {
            solution: {
              creator_id: creatorProfile.id,
            },
          },
        },
      },
    });

    const monthlyOrders = await prisma.order.count({
      where: {
        orderSolutions: {
          some: {
            solution: {
              creator_id: creatorProfile.id,
            },
          },
        },
        createdAt: {
          gte: monthStart,
        },
      },
    });

    // 获取浏览量和下载量统计
    const solutionCount = await prisma.solution.count({
      where: {
        creator_id: creatorProfile.id,
      },
    });

    // 获取评分统计（通过方案评价）
    const solutionReviews = await prisma.review.findMany({
      where: {
        solution: {
          creator_id: creatorProfile.id,
        },
      },
      select: {
        rating: true,
      },
    });

    const averageRating =
      solutionReviews.length > 0
        ? solutionReviews.reduce((sum, r) => sum + r.rating, 0) / solutionReviews.length
        : 0;

    const stats = {
      totalSolutions,
      publishedSolutions,
      draftSolutions,
      pendingSolutions,
      totalRevenue,
      monthlyRevenue,
      totalOrders: orderStats,
      monthlyOrders,
      totalViews: solutionCount * 100, // 模拟数据，实际应从视图统计表获取
      totalDownloads: solutionCount * 20, // 模拟数据，实际应从下载统计表获取
      averageRating,
      totalReviews: solutionReviews.length,
    };

    return createSuccessResponse(stats, '获取统计数据成功');
  } catch (error) {
    console.error('获取创作者统计数据失败:', error);
    // 返回更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('错误详情:', { errorMessage, errorStack });
    return createErrorResponse(
      `获取统计数据失败: ${errorMessage}`,
      500,
      error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : undefined
    );
  }
}