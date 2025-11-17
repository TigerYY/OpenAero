import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

import { checkCreatorAuth } from '@/lib/api-auth-helpers';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await checkCreatorAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const session = authResult.session;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 获取创作者档案
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return NextResponse.json(
        { error: '创作者档案不存在' },
        { status: 404 }
      );
    }

    // 获取最近的订单
    const recentOrders = await prisma.order.findMany({
      where: {
        orderSolutions: {
          some: {
            solution: {
              creatorId: creatorProfile.id
            }
          }
        }
      },
      include: {
        orderSolutions: {
          include: {
            solution: {
              select: {
                id: true,
                title: true,
                price: true
              }
            }
          },
          where: {
            solution: {
              creatorId: creatorProfile.id
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // 格式化数据
    const formattedOrders = recentOrders.map(order => {
      const solutionTitle = order.orderSolutions[0]?.solution?.title || '未知方案';
      const amount = order.orderSolutions.reduce((sum, item) => sum + Number(item.price), 0);
      
      return {
        id: order.id,
        solutionTitle,
        amount,
        createdAt: order.createdAt.toISOString(),
        status: order.status
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedOrders
    });

  } catch (error) {
    console.error('获取最近订单失败:', error);
    
    return NextResponse.json(
      { error: '获取最近订单失败' },
      { status: 500 }
    );
  }
}