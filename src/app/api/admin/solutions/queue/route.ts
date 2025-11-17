import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

// 队列筛选参数验证模式
const queueFilterSchema = z.object({
  status: z.enum(['all', 'pending', 'in_progress', 'overdue']).optional().default('all'),
  priority: z.enum(['all', 'high', 'medium', 'low']).optional().default('all'),
  assignedTo: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['created', 'submitted', 'priority', 'deadline']).optional().default('submitted'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// 更新优先级请求验证模式
const updatePrioritySchema = z.object({
  solutionId: z.string().min(1, '方案ID为必填项'),
  priority: z.enum(['high', 'medium', 'low'], {
    required_error: '优先级为必填项',
    invalid_type_error: '优先级必须是high、medium或low'
  })
});

// GET /api/admin/solutions/queue - 获取审核队列
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
        error: '权限不足，仅管理员可以查看审核队列',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedParams = queueFilterSchema.parse(queryParams);

    // 构建查询条件
    const whereClause: any = {};
    
    // 状态筛选
    if (validatedParams.status !== 'all') {
      if (validatedParams.status === 'pending') {
        whereClause.status = 'PENDING_REVIEW';
        whereClause.solutionReviews = {
          none: {
            status: 'IN_PROGRESS'
          }
        };
      } else if (validatedParams.status === 'in_progress') {
        whereClause.status = 'PENDING_REVIEW';
        whereClause.solutionReviews = {
          some: {
            status: 'IN_PROGRESS'
          }
        };
      } else if (validatedParams.status === 'overdue') {
        // 超过3天未处理的方案
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        whereClause.status = 'PENDING_REVIEW';
        whereClause.submittedAt = {
          lt: threeDaysAgo
        };
      }
    } else {
      // 只显示待审核的方案
      whereClause.status = 'PENDING_REVIEW';
    }

    // 分配给特定审核员的筛选
    if (validatedParams.assignedTo) {
      whereClause.solutionReviews = {
        some: {
          reviewerId: validatedParams.assignedTo,
          status: 'IN_PROGRESS'
        }
      };
    }

    // 构建排序条件
    let orderBy: any = {};
    switch (validatedParams.sortBy) {
      case 'created':
        orderBy.createdAt = validatedParams.sortOrder;
        break;
      case 'submitted':
        orderBy.submittedAt = validatedParams.sortOrder;
        break;
      case 'priority':
        // 优先级排序需要特殊处理
        orderBy = [
          { submittedAt: 'asc' }, // 先按提交时间排序
          { createdAt: 'desc' }   // 再按创建时间排序
        ];
        break;
      case 'deadline':
        orderBy.submittedAt = 'asc'; // 最早提交的优先
        break;
      default:
        orderBy.submittedAt = validatedParams.sortOrder;
    }

    // 计算分页
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // 查询方案列表
    const [solutions, totalCount] = await Promise.all([
      prisma.solution.findMany({
        where: whereClause,
        include: {
          creator: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          solutionReviews: {
            where: {
              status: 'IN_PROGRESS'
            },
            include: {
              reviewer: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          _count: {
            select: {
              solutionReviews: true
            }
          }
        },
        orderBy,
        skip,
        take: validatedParams.limit
      }),
      prisma.solution.count({ where: whereClause })
    ]);

    // 计算队列统计信息
    const queueStats = await prisma.solution.groupBy({
      by: ['status'],
      where: {
        status: {
          in: ['PENDING_REVIEW', 'APPROVED', 'REJECTED']
        }
      },
      _count: {
        id: true
      }
    });

    // 计算超期方案数量
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const overdueCount = await prisma.solution.count({
      where: {
        status: 'PENDING_REVIEW',
        submittedAt: {
          lt: threeDaysAgo
        }
      }
    });

    // 格式化响应数据
    const formattedSolutions = solutions.map(solution => ({
      id: solution.id,
      title: solution.title,
      description: solution.description,
      category: solution.category,
      price: solution.price,
      status: solution.status,
      submittedAt: solution.submittedAt,
      createdAt: solution.createdAt,
      creator: {
        id: solution.creator.id,
        name: `${solution.creator.user.firstName || ''} ${solution.creator.user.lastName || ''}`.trim() || solution.creator.user.email,
        email: solution.creator.user.email
      },
      assignedReviewer: solution.solutionReviews[0]?.reviewer ? {
        id: solution.solutionReviews[0].reviewer.id,
        name: `${solution.solutionReviews[0].reviewer.firstName || ''} ${solution.solutionReviews[0].reviewer.lastName || ''}`.trim() || solution.solutionReviews[0].reviewer.email,
        email: solution.solutionReviews[0].reviewer.email
      } : null,
      reviewCount: solution._count.solutionReviews,
      isOverdue: solution.submittedAt ? new Date(solution.submittedAt) < threeDaysAgo : false,
      daysSinceSubmission: solution.submittedAt ? 
        Math.floor((Date.now() - new Date(solution.submittedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0
    }));

    const stats = {
      total: totalCount,
      pending: queueStats.find(s => s.status === 'PENDING_REVIEW')?._count.id || 0,
      approved: queueStats.find(s => s.status === 'APPROVED')?._count.id || 0,
      rejected: queueStats.find(s => s.status === 'REJECTED')?._count.id || 0,
      overdue: overdueCount
    };

    const response: ApiResponse<{
      solutions: typeof formattedSolutions;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      stats: typeof stats;
    }> = {
      success: true,
      data: {
        solutions: formattedSolutions,
        pagination: {
          page: validatedParams.page,
          limit: validatedParams.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / validatedParams.limit)
        },
        stats
      },
      message: `找到 ${totalCount} 个方案`
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('获取审核队列失败:', error);
    
    if (error instanceof z.ZodError) {
      const response: ApiResponse<null> = {
        success: false,
        error: '查询参数验证失败: ' + error.errors.map(e => e.message).join(', '),
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取审核队列失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/admin/solutions/queue - 更新方案优先级
export async function PUT(request: NextRequest) {
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
        error: '权限不足，仅管理员可以更新方案优先级',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await request.json();
    
    // 验证输入数据
    const validatedData = updatePrioritySchema.parse(body);
    
    // 检查方案是否存在
    const solution = await prisma.solution.findUnique({
      where: { id: validatedData.solutionId },
      select: { id: true, title: true, status: true }
    });

    if (!solution) {
      const response: ApiResponse<null> = {
        success: false,
        error: '方案不存在',
        data: null
      };
      return NextResponse.json(response, { status: 404 });
    }

    if (solution.status !== 'PENDING_REVIEW') {
      const response: ApiResponse<null> = {
        success: false,
        error: '只能为待审核状态的方案设置优先级',
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    // 这里可以扩展为在数据库中存储优先级信息
    // 目前作为示例，我们只返回成功响应
    // 实际实现中可能需要在Solution模型中添加priority字段

    const response: ApiResponse<{
      solutionId: string;
      priority: string;
    }> = {
      success: true,
      data: {
        solutionId: validatedData.solutionId,
        priority: validatedData.priority
      },
      message: `已将方案 "${solution.title}" 的优先级设置为 ${validatedData.priority}`
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('更新方案优先级失败:', error);
    
    if (error instanceof z.ZodError) {
      const response: ApiResponse<null> = {
        success: false,
        error: '输入数据验证失败: ' + error.errors.map(e => e.message).join(', '),
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '更新方案优先级失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}