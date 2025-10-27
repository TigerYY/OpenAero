import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface ReportConfig {
  type: 'users' | 'orders' | 'solutions' | 'reviews' | 'revenue';
  format: 'json' | 'csv';
  dateRange: {
    start: string;
    end: string;
  };
  filters?: {
    status?: string;
    category?: string;
    role?: string;
    rating?: number;
  };
  groupBy?: string;
  metrics?: string[];
}

// 生成用户报表
async function generateUserReport(filters: any) {
  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      },
      role: filters.role || undefined,
    },
    include: {
      _count: {
        select: {
          orders: true,
          solutions: true,
          reviews: true,
        },
      },
    },
  });

  return users.map(user => ({
    id: user.id,
    name: user.name || '未设置',
    email: user.email,
    role: user.role,
    ordersCount: user._count.orders,
    solutionsCount: user._count.solutions,
    reviewsCount: user._count.reviews,
    createdAt: user.createdAt,
  }));
}

// 生成订单报表
async function generateOrderReport(filters: any) {
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      },
      status: filters.status || undefined,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      orderSolutions: true,
    },
  });

  return orders.map(order => ({
    id: order.id,
    userEmail: order.user.email,
    userName: order.user.name || '未设置',
    itemsCount: order.orderSolutions.length,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
  }));
}

// 生成方案报表
async function generateSolutionReport(filters: any) {
  const solutions = await prisma.solution.findMany({
    where: {
      createdAt: {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      },
      status: filters.status || undefined,
      category: filters.category || undefined,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
  });

  return solutions.map(solution => ({
    id: solution.id,
    title: solution.title,
    category: solution.category,
    price: solution.price,
    status: solution.status,
    creatorEmail: solution.user.email,
    creatorName: solution.user.name || '未设置',
    reviewsCount: solution._count.reviews,
    createdAt: solution.createdAt,
  }));
}

// 生成评价报表
async function generateReviewReport(filters: any) {
  const reviews = await prisma.review.findMany({
    where: {
      createdAt: {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      },
      rating: filters.rating ? { gte: filters.rating } : undefined,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      solution: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return reviews.map(review => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    userEmail: review.user.email,
    userName: review.user.name || '未设置',
    solutionId: review.solution.id,
    solutionTitle: review.solution.title,
    createdAt: review.createdAt,
  }));
}

// 生成收益报表
async function generateRevenueReport(filters: any) {
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      },
      status: 'DELIVERED',
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return orders.map(order => ({
    id: order.id,
    orderId: order.id,
    userEmail: order.user.email,
    userName: order.user.name || '未设置',
    amount: Number(order.total),
    platformFee: Number(order.total) * 0.1, // 假设平台费用为10%
    creatorShare: Number(order.total) * 0.9, // 创作者分成90%
    createdAt: order.createdAt,
  }));
}

// 转换为CSV格式
function convertToCSV(data: any[], type: string) {
  if (!data.length) return '';

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}

export async function POST(request: NextRequest) {
  try {
    const config: ReportConfig = await request.json();

    let data: any[] = [];

    // 根据报表类型生成数据
    switch (config.type) {
      case 'users':
        data = await generateUserReport(config.filters);
        break;
      case 'orders':
        data = await generateOrderReport(config.filters);
        break;
      case 'solutions':
        data = await generateSolutionReport(config.filters);
        break;
      case 'reviews':
        data = await generateReviewReport(config.filters);
        break;
      case 'revenue':
        data = await generateRevenueReport(config.filters);
        break;
      default:
        return NextResponse.json({ error: '不支持的报表类型' }, { status: 400 });
    }

    // 根据格式返回数据
    if (config.format === 'csv') {
      const csv = convertToCSV(data, config.type);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${config.type}_report.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
      config,
    });

  } catch (error) {
    console.error('生成报表失败:', error);
    return NextResponse.json(
      { error: '生成报表失败' },
      { status: 500 }
    );
  }
}

// 获取预定义报表模板
export async function GET() {
  const templates = [
    {
      id: 'user-activity',
      name: '用户活动报表',
      description: '用户注册、活跃度和行为分析',
      type: 'users',
      defaultFilters: {},
      metrics: ['registrations', 'orders', 'solutions', 'reviews'],
    },
    {
      id: 'sales-performance',
      name: '销售业绩报表',
      description: '订单和收益统计分析',
      type: 'orders',
      defaultFilters: { status: 'DELIVERED' },
      metrics: ['total_orders', 'revenue', 'avg_order_value'],
    },
    {
      id: 'solution-analytics',
      name: '方案分析报表',
      description: '方案发布、销售和评价统计',
      type: 'solutions',
      defaultFilters: { status: 'PUBLISHED' },
      metrics: ['published_solutions', 'sales', 'ratings'],
    },
    {
      id: 'review-insights',
      name: '评价洞察报表',
      description: '用户评价和满意度分析',
      type: 'reviews',
      defaultFilters: {},
      metrics: ['total_reviews', 'avg_rating', 'satisfaction'],
    },
    {
      id: 'revenue-breakdown',
      name: '收益分解报表',
      description: '平台和创作者收益详细分析',
      type: 'revenue',
      defaultFilters: {},
      metrics: ['platform_revenue', 'creator_revenue', 'commission'],
    },
  ];

  return NextResponse.json({
    success: true,
    templates,
  });
}