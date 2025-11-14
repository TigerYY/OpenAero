import { NextRequest } from 'next/server';
import { OrderStatus } from '@prisma/client';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
} from '@/lib/api-helpers';
import { getUserOrders, createOrder } from '@/lib/order';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const orderQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  status: z.nativeEnum(OrderStatus).optional(),
  search: z.string().optional(),
});

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      solutionId: z.string().min(1, '解决方案ID不能为空'),
      quantity: z.number().int().positive('数量必须大于0'),
      price: z.number().positive('价格必须大于0'),
    })
  ).min(1, '订单项不能为空'),
  notes: z.string().optional(),
  shippingAddress: z.any().optional(),
  billingAddress: z.any().optional(),
});

/**
 * GET /api/orders - 获取用户订单列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = orderQuerySchema.safeParse({
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

    return createPaginatedResponse(
      result.orders,
      page,
      limit,
      result.total,
      '获取订单列表成功'
    );
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return createErrorResponse(
      '获取订单列表失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * POST /api/orders - 创建新订单
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const body = await request.json();
    const validationResult = createOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse(
        '订单数据验证失败',
        400,
        { errors: validationResult.error.errors }
      );
    }

    const { items, notes, shippingAddress, billingAddress } = validationResult.data;

    const orderData = {
      userId: user.id,
      items,
      notes,
      shippingAddress,
      billingAddress,
    };

    const order = await createOrder(orderData);

    return createSuccessResponse(order, '订单创建成功');
  } catch (error) {
    console.error('创建订单失败:', error);
    return createErrorResponse(
      '创建订单失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}