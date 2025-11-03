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

    // 获取方案统计
    const solutionStats = await prisma.solution.groupBy({
      by: ['status'],
      where: {
        creatorId: creatorProfile.id
      },
      _count: {
        id: true
      }
    });

    // 计算各状态方案数量
    const totalSolutions = solutionStats.reduce((sum: number, stat) => sum + stat._count.id, 0);
    const publishedSolutions = solutionStats.find(s => s.status === 'PUBLISHED')?._count.id || 0;
    const draftSolutions = solutionStats.find(s => s.status === 'DRAFT')?._count.id || 0;
    const pendingSolutions = solutionStats.find(s => s.status === 'PENDING_REVIEW')?._count.id || 0;

    // 获取收益统计
    const revenueStats = await prisma.order.aggregate({
      where: {
        orderSolutions: {
          some: {
            solution: {
              creatorId: creatorProfile.id
            }
          }
        },
        status: 'DELIVERED',
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1) // 今年开始
        }
      },
      _sum: {
        total: true
      }
    });

    // 获取本月收益
    const monthlyRevenueStats = await prisma.order.aggregate({
      where: {
        orderSolutions: {
          some: {
            solution: {
              creatorId: creatorProfile.id
            }
          }
        },
        status: 'DELIVERED',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // 本月开始
        }
      },
      _sum: {
        total: true
      }
    });

    // 获取浏览量和下载量统计 (模拟数据，因为schema中没有这些字段)
    const solutionCount = await prisma.solution.count({
      where: {
        creatorId: creatorProfile.id
      }
    });

    // 获取评分统计
    const ratingStats = await prisma.review.aggregate({
      where: {
        solution: {
          creatorId: creatorProfile.id
        }
      },
      _avg: {
        rating: true
      },
      _count: {
        id: true
      }
    });

    const stats = {
      totalSolutions,
      publishedSolutions,
      draftSolutions,
      pendingSolutions,
      totalRevenue: Number(revenueStats._sum?.total || 0),
      monthlyRevenue: Number(monthlyRevenueStats._sum?.total || 0),
      totalViews: solutionCount * 100, // 模拟数据
      totalDownloads: solutionCount * 20, // 模拟数据
      averageRating: Number(ratingStats._avg.rating || 0),
      totalReviews: ratingStats._count.id || 0
    };

    // 记录审计日志 (简化版本，直接写入数据库)
    await prisma.auditLog.create({
      data: {
        action: 'VIEW_CREATOR_STATS',
        userId: session.user.id,
        resource: 'creator_stats',
        resourceId: creatorProfile.id,
        newValues: {
          totalSolutions,
          publishedSolutions
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('获取创作者统计数据失败:', error);
    
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}