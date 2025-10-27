import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateToken } from '@/backend/auth/auth.middleware';

export const dynamic = 'force-dynamic';

// 收益状态枚举
const RevenueStatus = {
  PENDING: 'PENDING',
  SETTLED: 'SETTLED', 
  WITHDRAWN: 'WITHDRAWN',
  CANCELLED: 'CANCELLED'
} as const;

// GET /api/revenue - 获取用户收益信息
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;
    const userId = user.userId;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    // 获取用户的创作者资料
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creatorProfile) {
      return NextResponse.json(
        { error: '创作者资料不存在' },
        { status: 404 }
      );
    }

    // 构建查询条件
    const where: any = {
      creatorId: creatorProfile.id,
    };

    if (status) {
      where.status = status;
    }

    // 获取收益分成记录
    const [revenueShares, total] = await Promise.all([
      (prisma as any).revenueShare.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
            },
          },
          solution: {
            select: {
              id: true,
              title: true,
              price: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      (prisma as any).revenueShare.count({ where }),
    ]);

    // 计算收益统计
    const stats = await (prisma as any).revenueShare.aggregate({
      where: { creatorId: creatorProfile.id },
      _sum: {
        totalAmount: true,
        platformFee: true,
        creatorRevenue: true,
      },
      _count: true,
    });

    // 按状态统计收益
    const statusStats = await (prisma as any).revenueShare.groupBy({
      by: ['status'],
      where: { creatorId: creatorProfile.id },
      _sum: {
        creatorRevenue: true,
      },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        revenueShares,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          totalRevenue: stats._sum.creatorRevenue || 0,
          totalOrders: stats._count,
          totalPlatformFee: stats._sum.platformFee || 0,
          statusBreakdown: statusStats.reduce((acc: any, item: any) => {
            acc[item.status] = {
              count: item._count,
              revenue: item._sum.creatorRevenue || 0,
            };
            return acc;
          }, {} as Record<string, { count: number; revenue: number }>),
        },
        profile: {
          totalRevenue: creatorProfile.revenue,
        },
      },
    });
  } catch (error) {
    console.error('获取收益信息失败:', error);
    return NextResponse.json(
      { error: '获取收益信息失败' },
      { status: 500 }
    );
  }
}

// POST /api/revenue - 创建收益分成记录（内部使用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, solutionId, creatorId, totalAmount } = body;

    if (!orderId || !solutionId || !creatorId || !totalAmount) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 计算收益分成
    const platformFeeRate = 0.05; // 平台费率 5%
    const creatorRevenueRate = 0.95; // 创作者收益率 95%

    const platformFee = Number(totalAmount) * platformFeeRate;
    const creatorRevenue = Number(totalAmount) * creatorRevenueRate;

    // 创建收益分成记录
    const revenueShare = await (prisma as any).revenueShare.create({
      data: {
        orderId,
        solutionId,
        creatorId,
        totalAmount: Number(totalAmount),
        platformFee,
        creatorRevenue,
        status: RevenueStatus.PENDING,
      },
      include: {
        order: true,
        solution: true,
        creator: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: revenueShare,
    });
  } catch (error) {
    console.error('创建收益分成记录失败:', error);
    return NextResponse.json(
      { error: '创建收益分成记录失败' },
      { status: 500 }
    );
  }
}