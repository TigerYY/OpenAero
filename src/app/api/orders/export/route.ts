/**
 * 订单导出 API
 * GET /api/orders/export - 导出订单为CSV格式
 */

import { NextRequest } from 'next/server';
import { OrderStatus } from '@prisma/client';
import { getServerUser } from '@/lib/auth/auth-service';
import { createErrorResponse } from '@/lib/api-helpers';
import { getUserOrders } from '@/lib/order';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const exportQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1000)),
  status: z.nativeEnum(OrderStatus).optional(),
  search: z.string().optional(),
});

/**
 * GET /api/orders/export - 导出订单为CSV格式
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = exportQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      search: searchParams.get('search'),
    });

    if (!queryResult.success) {
      return createErrorResponse('查询参数无效', 400);
    }

    const { page, limit, status, search } = queryResult.data;
    const result = await getUserOrders(user.id, page, limit, status, search);

    // 生成CSV内容
    const csvHeaders = [
      '订单号',
      '订单状态',
      '订单总额',
      '下单时间',
      '更新时间',
      '商品数量',
      '支付方式',
      '支付状态',
    ];

    const csvRows = result.orders.map((order) => {
      const paymentMethod = order.paymentTransactions?.[0]?.paymentMethod || '未支付';
      const paymentStatus = order.paymentTransactions?.[0]?.status || '未支付';
      const itemCount = order.orderSolutions.reduce((sum, item) => sum + item.quantity, 0);

      return [
        order.orderNumber || order.id,
        order.status,
        Number(order.total).toFixed(2),
        new Date(order.createdAt).toLocaleString('zh-CN'),
        new Date(order.updatedAt).toLocaleString('zh-CN'),
        itemCount.toString(),
        paymentMethod,
        paymentStatus,
      ];
    });

    // 构建CSV内容
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // 添加BOM以支持Excel正确显示中文
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    return new Response(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('导出订单失败:', error);
    return createErrorResponse(
      '导出订单失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

