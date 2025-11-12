import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30'; // 默认30天
    const days = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 总用户数
    const totalUsers = await prisma.user.count();

    // 新注册用户数（指定时间段内）
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });

    // 活跃用户数（有方案或订单的用户）
    const activeUsers = await prisma.user.count({
      where: {
        OR: [
          {
            solutions: {
              some: {
                createdAt: {
                  gte: startDate
                }
              }
            }
          },
          {
            orders: {
              some: {
                createdAt: {
                  gte: startDate
                }
              }
            }
          }
        ]
      }
    });

    // 按日期统计新用户注册趋势
    const registrationTrend = await prisma.user.groupBy({
      by: ['createdAt'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: startDate
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // 处理注册趋势数据，按天聚合
    const trendByDay: Record<string, number> = {};
    registrationTrend.forEach(item => {
      const date = item.createdAt.toISOString().split('T')[0];
      const count = item._count?.id || 0;
      if (date && count !== undefined) {
        if (!trendByDay[date]) {
          trendByDay[date] = 0;
        }
        trendByDay[date] += count;
      }
    });

    const trendData = Object.entries(trendByDay).map(([date, count]) => ({
      date,
      count
    }));

    // 用户角色分布
    const roleDistribution = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });

    // 最近注册的用户
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true
      }
    });

    // 用户活跃度统计
    const userActivity = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            solutions: true,
            orders: true,
            reviews: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          newUsers,
          activeUsers,
          growthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : '0'
        },
        trends: {
          registration: trendData
        },
        distribution: {
          roles: roleDistribution.map(item => ({
            role: item.role,
            count: item._count?.id || 0
          }))
        },
        recentUsers: recentUsers.map(user => ({
          id: user.id,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '未设置',
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        })),
        userActivity: userActivity.map(user => ({
          id: user.id,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '未设置',
          email: user.email,
          createdAt: user.createdAt,
          solutionsCount: user._count?.solutions || 0,
          ordersCount: user._count?.orders || 0,
          reviewsCount: user._count?.reviews || 0
        }))
      }
    });

  } catch (error) {
    console.error('获取用户统计数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户统计数据失败' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}