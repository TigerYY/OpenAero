import { RevenueStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken } from '@/backend/auth/auth.middleware';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { RevenueService } from '@/lib/revenue.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/revenue - 获取创作者收益数据
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    // 检查用户是否为创作者
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!creatorProfile) {
      return NextResponse.json(
        { success: false, error: '您不是创作者，无法查看收益数据' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') as RevenueStatus | null;

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {
      creatorId: creatorProfile.id,
    };

    if (status && Object.values(RevenueStatus).includes(status)) {
      where.status = status;
    }

    // 查询收益分成记录
    const [revenueShares, total] = await Promise.all([
      prisma.revenueShare.findMany({
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
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.revenueShare.count({ where }),
    ]);

    // 获取收益统计
    const stats = await getRevenueStats(creatorProfile.id);

    // 获取创作者收益总额
    const creatorRevenue = Number(creatorProfile.revenue);

    return NextResponse.json({
      success: true,
      data: {
        revenueShares: revenueShares.map(rs => ({
          id: rs.id,
          totalAmount: Number(rs.totalAmount),
          platformFee: Number(rs.platformFee),
          creatorRevenue: Number(rs.creatorRevenue),
          status: rs.status,
          settledAt: rs.settledAt?.toISOString(),
          withdrawnAt: rs.withdrawnAt?.toISOString(),
          withdrawMethod: rs.withdrawMethod,
          withdrawAccount: rs.withdrawAccount,
          createdAt: rs.createdAt.toISOString(),
          order: {
            id: rs.order.id,
            orderNumber: rs.order.orderNumber,
            createdAt: rs.order.createdAt.toISOString(),
          },
          solution: {
            id: rs.solution.id,
            title: rs.solution.title,
            price: Number(rs.solution.price),
          },
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats,
        profile: {
          totalRevenue: creatorRevenue,
        },
      },
    });

  } catch (error) {
    logger.error('获取收益数据失败', { error });
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/revenue/withdraw - 申请收益提现
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    // 检查用户是否为创作者
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!creatorProfile) {
      return NextResponse.json(
        { success: false, error: '您不是创作者，无法申请提现' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount, withdrawMethod, withdrawAccount } = body;

    // 验证输入
    if (!amount || !withdrawMethod || !withdrawAccount) {
      return NextResponse.json(
        { success: false, error: '提现金额、提现方式和提现账户不能为空' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: '提现金额必须大于0' },
        { status: 400 }
      );
    }

    // 处理提现
    const result = await RevenueService.withdrawRevenue(
      creatorProfile.id,
      amount,
      withdrawMethod,
      withdrawAccount
    );

    logger.info('收益提现申请成功', {
      creatorId: creatorProfile.id,
      amount: amount,
      withdrawMethod: withdrawMethod,
      withdrawAccount: withdrawAccount,
    });

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId: result,
        amount: amount,
        withdrawMethod: withdrawMethod,
        withdrawAccount: withdrawAccount,
        processedAt: new Date().toISOString(),
      },
      message: '提现申请已提交，将在1-3个工作日内处理',
    });

  } catch (error) {
    logger.error('收益提现申请失败', { error });
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '提现申请失败' 
      },
      { status: 400 }
    );
  }
}

/**
 * 获取收益统计
 */
async function getRevenueStats(creatorId: string) {
  try {
    // 获取总收益
    const totalRevenue = await prisma.revenueShare.aggregate({
      where: { creatorId },
      _sum: {
        creatorRevenue: true,
      },
    });

    // 获取总订单数
    const totalOrders = await prisma.revenueShare.count({
      where: { creatorId },
    });

    // 获取平台费用总额
    const totalPlatformFee = await prisma.revenueShare.aggregate({
      where: { creatorId },
      _sum: {
        platformFee: true,
      },
    });

    // 按状态统计
    const statusBreakdown = await prisma.revenueShare.groupBy({
      by: ['status'],
      where: { creatorId },
      _count: {
        id: true,
      },
      _sum: {
        creatorRevenue: true,
      },
    });

    // 转换为前端需要的格式
    const statusStats: Record<string, { count: number; revenue: number }> = {};
    statusBreakdown.forEach(item => {
      statusStats[item.status] = {
        count: item._count.id,
        revenue: Number(item._sum.creatorRevenue || 0),
      };
    });

    // 确保所有状态都有默认值
    Object.values(RevenueStatus).forEach(status => {
      if (!statusStats[status]) {
        statusStats[status] = { count: 0, revenue: 0 };
      }
    });

    return {
      totalRevenue: Number(totalRevenue._sum.creatorRevenue || 0),
      totalOrders,
      totalPlatformFee: Number(totalPlatformFee._sum.platformFee || 0),
      statusBreakdown: statusStats,
    };
  } catch (error) {
    logger.error('获取收益统计失败', { creatorId, error });
    throw error;
  }
}