import { NextRequest, NextResponse } from 'next/server';

import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';
import { dashboardCache } from '@/lib/admin/dashboard-cache';

// GET /api/admin/dashboard/charts - 获取图表数据
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
        error: '权限不足，仅管理员可以查看图表数据',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    // 获取时间范围参数
    const timeRangeParam = request.nextUrl.searchParams.get('timeRange');
    const daysParam = request.nextUrl.searchParams.get('days');
    const days = parseInt(timeRangeParam || daysParam || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 检查缓存
    const cachedData = await dashboardCache.getCharts(days);
    if (cachedData) {
      return NextResponse.json(cachedData, { 
        status: 200,
        headers: {
          'X-Cache': 'HIT',
        },
      });
    }

    // 并行获取各种图表数据
    const [
      trendData,
      categoryDistribution,
      statusDistribution,
      revenueTrend
    ] = await Promise.all([
      // 1. 趋势数据（按天聚合）
      getTrendData(startDate, days),
      // 2. 分类分布数据
      getCategoryDistribution(),
      // 3. 状态分布数据
      getStatusDistribution(),
      // 4. 收入趋势数据
      getRevenueTrend(startDate, days),
    ]);

    const chartData = {
      trends: trendData,
      categoryDistribution,
      statusDistribution,
      revenueTrend,
    };

    const response: ApiResponse<typeof chartData> = {
      success: true,
      data: chartData,
      message: '图表数据获取成功'
    };

    // 缓存响应数据
    dashboardCache.setCharts(days, response);

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    console.error('获取图表数据失败:', error);

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取图表数据失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// 获取趋势数据（方案、用户按天聚合）
async function getTrendData(startDate: Date, days: number) {
  // 获取方案创建趋势
  const solutions = await prisma.solution.findMany({
    where: {
      created_at: { gte: startDate }
    },
    select: {
      created_at: true,
    },
    orderBy: { created_at: 'asc' }
  });

  // 获取用户注册趋势
  const users = await prisma.userProfile.findMany({
    where: {
      created_at: { gte: startDate }
    },
    select: {
      created_at: true,
    },
    orderBy: { created_at: 'asc' }
  });

  // 按天聚合数据
  const solutionTrend: Record<string, number> = {};
  const userTrend: Record<string, number> = {};

  solutions.forEach(s => {
    const date = s.created_at.toISOString().split('T')[0];
    solutionTrend[date] = (solutionTrend[date] || 0) + 1;
  });

  users.forEach(u => {
    const date = u.created_at.toISOString().split('T')[0];
    userTrend[date] = (userTrend[date] || 0) + 1;
  });

  // 生成完整的时间序列（填充缺失的日期）
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates.map(date => ({
    date,
    solutions: solutionTrend[date] || 0,
    users: userTrend[date] || 0,
  }));
}

// 获取分类分布数据
async function getCategoryDistribution() {
  const categoryStats = await prisma.solution.groupBy({
    by: ['category'],
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
    take: 10, // 只取前10个分类
  });

  const total = await prisma.solution.count();

  return categoryStats.map(cat => ({
    name: cat.category || '未分类',
    value: cat._count.category,
    percentage: total > 0 ? Math.round((cat._count.category / total) * 100 * 10) / 10 : 0,
  }));
}

// 获取状态分布数据
async function getStatusDistribution() {
  const statusStats = await prisma.solution.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  const statusNames: Record<string, string> = {
    'DRAFT': '草稿',
    'PENDING_REVIEW': '待审核',
    'APPROVED': '已批准',
    'REJECTED': '已拒绝',
    'PUBLISHED': '已发布',
    'ARCHIVED': '已归档',
  };

  return statusStats.map(stat => ({
    status: stat.status,
    name: statusNames[stat.status] || stat.status,
    count: stat._count.status,
  }));
}

// 获取收入趋势数据
async function getRevenueTrend(startDate: Date, days: number) {
  // 获取已批准方案的收入数据
  const solutions = await prisma.solution.findMany({
    where: {
      status: 'APPROVED',
      reviewed_at: { gte: startDate, not: null },
    },
    select: {
      reviewed_at: true,
      price: true,
    },
  });

  // 按天聚合收入
  const revenueByDay: Record<string, number> = {};

  solutions.forEach(s => {
    if (s.reviewed_at) {
      const date = s.reviewed_at.toISOString().split('T')[0];
      const price = parseFloat(s.price.toString());
      revenueByDay[date] = (revenueByDay[date] || 0) + price;
    }
  });

  // 生成完整的时间序列
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates.map(date => ({
    date,
    revenue: revenueByDay[date] || 0,
  }));
}

