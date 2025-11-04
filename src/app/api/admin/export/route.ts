import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getStatusText } from '@/lib/solution-status-workflow';
import { SolutionStatus } from '@/shared/types/solutions';

export async function POST(request: NextRequest) {
  try {
    const { type, format, dateRange } = await request.json();

    // 验证参数
    if (!type || !format) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (!['users', 'orders', 'solutions', 'reviews'].includes(type)) {
      return NextResponse.json(
        { success: false, error: '不支持的数据类型' },
        { status: 400 }
      );
    }

    if (!['csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { success: false, error: '不支持的导出格式' },
        { status: 400 }
      );
    }

    // 计算时间范围
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateRange) {
      startDate = new Date(dateRange.start);
      endDate = new Date(dateRange.end);
    }

    let data: any[] = [];
    let headers: string[] = [];
    let filename = '';

    // 根据类型获取数据
    switch (type) {
      case 'users':
        const users = await prisma.user.findMany({
          where: {
            ...(startDate && endDate && {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            })
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            emailVerified: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        data = users.map(user => ({
          ID: user.id,
          邮箱: user.email,
          姓名: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.firstName || user.lastName || '未设置'),
          角色: user.role === 'USER' ? '用户' : user.role === 'CREATOR' ? '创作者' : '管理员',
          邮箱验证: user.emailVerified ? '已验证' : '未验证',
          注册时间: user.createdAt.toISOString().split('T')[0]
        }));

        headers = ['ID', '邮箱', '姓名', '角色', '邮箱验证', '注册时间'];
        filename = `users_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'orders':
        const orders = await prisma.order.findMany({
          where: {
            ...(startDate && endDate && {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            })
          },
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        data = orders.map(order => ({
          订单ID: order.id,
          用户邮箱: order.user.email,
          用户姓名: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || '未设置',
          订单状态: getOrderStatusText(order.status),
          订单金额: Number(order.total),
          创建时间: order.createdAt.toISOString().split('T')[0]
        }));

        headers = ['订单ID', '用户邮箱', '用户姓名', '订单状态', '订单金额', '创建时间'];
        filename = `orders_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'solutions':
        const solutions = await prisma.solution.findMany({
          where: {
            ...(startDate && endDate && {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            })
          },
          select: {
            id: true,
            title: true,
            category: true,
            price: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        data = solutions.map(solution => ({
          方案ID: solution.id,
          方案标题: solution.title,
          分类: solution.category,
          价格: Number(solution.price),
          状态: getStatusText(solution.status as SolutionStatus),
          创作者邮箱: solution.user.email,
          创作者姓名: `${solution.user.firstName || ''} ${solution.user.lastName || ''}`.trim() || '未设置',
          创建时间: solution.createdAt.toISOString().split('T')[0]
        }));

        headers = ['方案ID', '方案标题', '分类', '价格', '状态', '创作者邮箱', '创作者姓名', '创建时间'];
        filename = `solutions_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'reviews':
        const reviews = await prisma.review.findMany({
          where: {
            ...(startDate && endDate && {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            })
          },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            },
            solution: {
              select: {
                title: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        data = reviews.map(review => ({
          评价ID: review.id,
          评分: review.rating,
          评价内容: review.comment || '无评价内容',
          用户邮箱: review.user.email,
          用户姓名: `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim() || '未设置',
          方案标题: review.solution.title,
          评价时间: review.createdAt.toISOString().split('T')[0]
        }));

        headers = ['评价ID', '评分', '评价内容', '用户邮箱', '用户姓名', '方案标题', '评价时间'];
        filename = `reviews_${new Date().toISOString().split('T')[0]}`;
        break;
    }

    // 生成CSV格式
    if (format === 'csv') {
      const csvContent = generateCSV(data, headers);
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      });
    }

    // PDF格式暂时返回错误（需要额外的PDF生成库）
    if (format === 'pdf') {
      return NextResponse.json(
        { success: false, error: 'PDF导出功能正在开发中' },
        { status: 501 }
      );
    }

    // 如果没有匹配的格式，返回错误
    return NextResponse.json(
      { success: false, error: '不支持的导出格式' },
      { status: 400 }
    );

  } catch (error) {
    console.error('数据导出失败:', error);
    return NextResponse.json(
      { success: false, error: '数据导出失败' },
      { status: 500 }
    );
  }
}

// 生成CSV内容
function generateCSV(data: any[], headers: string[]): string {
  const csvRows = [];
  
  // 添加BOM以支持中文
  csvRows.push('\uFEFF');
  
  // 添加表头
  csvRows.push(headers.join(','));
  
  // 添加数据行
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // 处理包含逗号或引号的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// 获取订单状态文本
function getOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': '待处理',
    'CONFIRMED': '已确认',
    'PROCESSING': '处理中',
    'SHIPPED': '已发货',
    'DELIVERED': '已送达',
    'CANCELLED': '已取消',
    'REFUNDED': '已退款'
  };
  return statusMap[status] || status;
}