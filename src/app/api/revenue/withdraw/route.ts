import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 收益状态枚举
const RevenueStatus = {
  PENDING: 'PENDING',
  SETTLED: 'SETTLED', 
  WITHDRAWN: 'WITHDRAWN',
  CANCELLED: 'CANCELLED'
} as const;

// POST /api/revenue/withdraw - 申请提现
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;
    const userId = user.userId;

    const body = await request.json();
    const { amount, withdrawMethod, withdrawAccount } = body;

    if (!amount || !withdrawMethod || !withdrawAccount) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证提现金额
    if (amount <= 0) {
      return NextResponse.json(
        { error: '提现金额必须大于0' },
        { status: 400 }
      );
    }

    // 获取用户的创作者资料
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { user_id: userId },
    });

    if (!creatorProfile) {
      return NextResponse.json(
        { error: '创作者资料不存在' },
        { status: 404 }
      );
    }

    // 检查可提现余额
    const availableRevenue = Number(creatorProfile.revenue);
    if (amount > availableRevenue) {
      return NextResponse.json(
        { error: '提现金额超过可用余额' },
        { status: 400 }
      );
    }

    // 获取可提现的收益分成记录
    const settledRevenues = await (prisma as any).revenueShare.findMany({
      where: {
        creatorId: creatorProfile.id,
        status: RevenueStatus.SETTLED,
      },
      orderBy: { settledAt: 'asc' },
    });

    let remainingAmount = amount;
    const revenueIds: string[] = [];

    // 选择要提现的收益记录
    for (const revenue of settledRevenues) {
      if (remainingAmount <= 0) break;
      
      const revenueAmount = Number(revenue.creatorRevenue);
      if (revenueAmount <= remainingAmount) {
        revenueIds.push(revenue.id);
        remainingAmount -= revenueAmount;
      } else {
        // 如果单笔收益大于剩余金额，暂不支持部分提现
        break;
      }
    }

    if (revenueIds.length === 0) {
      return NextResponse.json(
        { error: '没有可提现的收益记录' },
        { status: 400 }
      );
    }

    // 使用事务处理提现申请
    const result = await prisma.$transaction(async (tx) => {
      // 更新收益分成记录状态
      await (tx as any).revenueShare.updateMany({
        where: {
          id: { in: revenueIds },
        },
        data: {
          status: RevenueStatus.WITHDRAWN,
          withdrawnAt: new Date(),
          withdrawMethod,
          withdrawAccount,
        },
      });

      // 更新创作者收益余额
      await tx.creatorProfile.update({
        where: { id: creatorProfile.id },
        data: {
          revenue: {
            decrement: amount,
          },
        },
      });

      return {
        withdrawnAmount: amount,
        revenueCount: revenueIds.length,
        withdrawMethod,
        withdrawAccount,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: '提现申请提交成功',
    });
  } catch (error) {
    console.error('提现申请失败:', error);
    return NextResponse.json(
      { error: '提现申请失败' },
      { status: 500 }
    );
  }
}

// GET /api/revenue/withdraw - 获取提现记录
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;
    const userId = user.userId;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // 获取用户的创作者资料
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { user_id: userId },
    });

    if (!creatorProfile) {
      return NextResponse.json(
        { error: '创作者资料不存在' },
        { status: 404 }
      );
    }

    // 获取提现记录
    const [withdrawals, total] = await Promise.all([
      (prisma as any).revenueShare.findMany({
        where: {
          creatorId: creatorProfile.id,
          status: RevenueStatus.WITHDRAWN,
        },
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
            },
          },
        },
        orderBy: { withdrawnAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      (prisma as any).revenueShare.count({
        where: {
          creatorId: creatorProfile.id,
          status: RevenueStatus.WITHDRAWN,
        },
      }),
    ]);

    // 计算提现统计
    const withdrawalStats = await (prisma as any).revenueShare.aggregate({
      where: {
        creatorId: creatorProfile.id,
        status: RevenueStatus.WITHDRAWN,
      },
      _sum: {
        creatorRevenue: true,
      },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          totalWithdrawn: withdrawalStats._sum.creatorRevenue || 0,
          totalWithdrawals: withdrawalStats._count,
          availableBalance: creatorProfile.revenue,
        },
      },
    });
  } catch (error) {
    console.error('获取提现记录失败:', error);
    return NextResponse.json(
      { error: '获取提现记录失败' },
      { status: 500 }
    );
  }
}