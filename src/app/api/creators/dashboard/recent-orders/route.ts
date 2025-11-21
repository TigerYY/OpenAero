import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

import { requireCreatorAuth } from '@/lib/api-helpers';
import { ensureCreatorProfile } from '@/lib/creator-profile-utils';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await requireCreatorAuth(request);
    if (!authResult.success) {
      return authResult.response || NextResponse.json(
        { success: false, error: authResult.error || '未授权访问' },
        { status: 403 }
      );
    }

    const userId = authResult.user.id;

    // 确保用户有 CreatorProfile（如果用户有 CREATOR 角色但没有档案，自动创建）
    const creatorProfile = await ensureCreatorProfile(userId);

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
              creator_id: creatorProfile.id
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
              creator_id: creatorProfile.id
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
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
        createdAt: order.created_at?.toISOString() || new Date().toISOString(),
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