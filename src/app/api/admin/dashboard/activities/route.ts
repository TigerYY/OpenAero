import { NextRequest, NextResponse } from 'next/server';

import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';
import { dashboardCache } from '@/lib/admin/dashboard-cache';

// GET /api/admin/dashboard/activities - 获取实时活动流
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份和权限
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || NextResponse.json(
        {
          success: false,
          error: '未授权访问',
          data: null
        } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // 检查管理员权限
    const userRoles = authResult.user.roles || [];
    if (!userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      const response: ApiResponse<null> = {
        success: false,
        error: '权限不足，仅管理员可以查看活动流',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    // 获取查询参数
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20'), 100);
    const type = request.nextUrl.searchParams.get('type'); // 活动类型筛选
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 检查缓存（仅缓存第一页，其他页面不缓存）
    const cacheParams = { page, limit, type: type || 'all', days };
    if (page === 1) {
      const cachedData = await dashboardCache.getActivities(cacheParams);
      if (cachedData) {
        return NextResponse.json(cachedData, { 
          status: 200,
          headers: {
            'X-Cache': 'HIT',
          },
        });
      }
    }

    // 并行获取各种活动
    const [
      userRegistrations,
      solutionSubmissions,
      reviewCompletions,
      orderCreations
    ] = await Promise.all([
      // 用户注册活动
      type === 'user_registration' || !type
        ? prisma.userProfile.findMany({
            where: {
              created_at: { gte: startDate }
            },
            select: {
              id: true,
              user_id: true,
              display_name: true,
              first_name: true,
              last_name: true,
              roles: true,
              created_at: true,
            },
            orderBy: { created_at: 'desc' },
            take: type ? limit : Math.ceil(limit / 4),
          })
        : Promise.resolve([]),
      
      // 方案提交活动
      type === 'solution_submission' || !type
        ? prisma.solution.findMany({
            where: {
              status: 'PENDING_REVIEW',
              submitted_at: { gte: startDate, not: null },
            },
            select: {
              id: true,
              title: true,
              category: true,
              submitted_at: true,
              creator_id: true,
            },
            orderBy: { submitted_at: 'desc' },
            take: type ? limit : Math.ceil(limit / 4),
          })
        : Promise.resolve([]),
      
      // 审核完成活动
      type === 'review_completion' || !type
        ? prisma.solutionReview.findMany({
            where: {
              status: 'COMPLETED',
              reviewed_at: { gte: startDate, not: null },
            },
            select: {
              id: true,
              solution_id: true,
              decision: true,
              reviewed_at: true,
              reviewer_id: true,
              solution: {
                select: {
                  title: true,
                },
              },
            },
            orderBy: { reviewed_at: 'desc' },
            take: type ? limit : Math.ceil(limit / 4),
          })
        : Promise.resolve([]),
      
      // 订单创建活动
      type === 'order_creation' || !type
        ? prisma.order.findMany({
            where: {
              created_at: { gte: startDate },
            },
            select: {
              id: true,
              order_number: true,
              total: true,
              status: true,
              created_at: true,
              user_id: true,
            },
            orderBy: { created_at: 'desc' },
            take: type ? limit : Math.ceil(limit / 4),
          })
        : Promise.resolve([]),
    ]);

    // 格式化活动数据
    const activities: Array<{
      id: string;
      type: 'user_registration' | 'solution_submission' | 'review_completion' | 'order_creation';
      title: string;
      description: string;
      timestamp: Date;
      metadata?: any;
    }> = [];

    // 用户注册活动
    userRegistrations.forEach(user => {
      activities.push({
        id: `user_${user.user_id}`,
        type: 'user_registration',
        title: '新用户注册',
        description: `${user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '用户'} 注册了账户`,
        timestamp: user.created_at,
        metadata: {
          userId: user.user_id,
          roles: Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []),
        },
      });
    });

    // 方案提交活动
    // 获取创作者的显示名称
    const creatorIds = [...new Set(solutionSubmissions.map(s => s.creator_id).filter(Boolean))];
    const creators = creatorIds.length > 0
      ? await prisma.creatorProfile.findMany({
          where: { id: { in: creatorIds as string[] } },
          select: { id: true, user_id: true },
        })
      : [];
    const creatorUserIds = [...new Set(creators.map(c => c.user_id).filter(Boolean))];
    const creatorUsers = creatorUserIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { user_id: { in: creatorUserIds as string[] } },
          select: { user_id: true, display_name: true },
        })
      : [];
    const creatorUserMap = new Map(creatorUsers.map(u => [u.user_id, u.display_name || '创作者']));
    const creatorMap = new Map(creators.map(c => [c.id, creatorUserMap.get(c.user_id) || '创作者']));

    solutionSubmissions.forEach(solution => {
      const creatorName = solution.creator_id ? creatorMap.get(solution.creator_id) || '创作者' : '创作者';
      activities.push({
        id: `solution_${solution.id}`,
        type: 'solution_submission',
        title: '方案提交',
        description: `${creatorName} 提交了方案 "${solution.title}"`,
        timestamp: solution.submitted_at!,
        metadata: {
          solutionId: solution.id,
          category: solution.category,
        },
      });
    });

    // 审核完成活动
    // 获取审核员的显示名称
    const reviewerIds = [...new Set(reviewCompletions.map(r => r.reviewer_id).filter(Boolean))];
    const reviewers = reviewerIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { user_id: { in: reviewerIds as string[] } },
          select: { user_id: true, display_name: true },
        })
      : [];
    const reviewerMap = new Map(reviewers.map(r => [r.user_id, r.display_name || '审核员']));

    reviewCompletions.forEach(review => {
      const decisionText = review.decision === 'APPROVED' ? '批准' : review.decision === 'REJECTED' ? '拒绝' : '待修改';
      const reviewerName = review.reviewer_id ? reviewerMap.get(review.reviewer_id) || '审核员' : '审核员';
      activities.push({
        id: `review_${review.id}`,
        type: 'review_completion',
        title: '审核完成',
        description: `${reviewerName} ${decisionText}了方案 "${review.solution?.title || ''}"`,
        timestamp: review.reviewed_at!,
        metadata: {
          solutionId: review.solution_id,
          decision: review.decision,
        },
      });
    });

    // 订单创建活动
    // 获取用户的显示名称
    const orderUserIds = [...new Set(orderCreations.map(o => o.user_id).filter(Boolean))];
    const orderUsers = orderUserIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { user_id: { in: orderUserIds as string[] } },
          select: { user_id: true, display_name: true },
        })
      : [];
    const orderUserMap = new Map(orderUsers.map(u => [u.user_id, u.display_name || '用户']));

    orderCreations.forEach(order => {
      const userName = order.user_id ? orderUserMap.get(order.user_id) || '用户' : '用户';
      activities.push({
        id: `order_${order.id}`,
        type: 'order_creation',
        title: '订单创建',
        description: `${userName} 创建了订单 ${order.order_number || order.id}`,
        timestamp: order.created_at,
        metadata: {
          orderId: order.id,
          orderNumber: order.order_number,
          total: order.total.toString(),
          status: order.status,
        },
      });
    });

    // 按时间排序（最新的在前）
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedActivities = activities.slice(startIndex, endIndex);

    const response: ApiResponse<{
      activities: typeof paginatedActivities;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }> = {
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          page,
          limit,
          total: activities.length,
          totalPages: Math.ceil(activities.length / limit),
        },
      },
      message: '活动数据获取成功'
    };

    // 仅缓存第一页
    if (page === 1) {
      dashboardCache.setActivities(cacheParams, response);
    }

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'X-Cache': page === 1 ? 'MISS' : 'NO-CACHE',
      },
    });

  } catch (error) {
    console.error('获取活动流失败:', error);

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取活动流失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}

