import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { db as prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 检查用户是否为创作者
    if (session.user.role !== 'CREATOR') {
      return NextResponse.json(
        { error: '只有创作者可以访问此接口' },
        { status: 403 }
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