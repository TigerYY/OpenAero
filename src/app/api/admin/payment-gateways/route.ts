import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken } from '@/backend/auth/auth.middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/payment-gateways - 获取支付网关列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    const user = (request as any).user;
    
    // TODO: 验证管理员权限
    // 这里需要检查用户是否为管理员
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // 查询支付网关
    const [gateways, total] = await Promise.all([
      prisma.paymentGateway.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.paymentGateway.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        gateways: gateways.map(gateway => ({
          id: gateway.id,
          name: gateway.name,
          provider: gateway.provider,
          isActive: gateway.isActive,
          isTestMode: gateway.isTestMode,
          config: gateway.config,
          webhookUrl: gateway.webhookUrl,
          successCount: gateway.successCount,
          failureCount: gateway.failureCount,
          totalAmount: Number(gateway.totalAmount),
          createdAt: gateway.createdAt.toISOString(),
          updatedAt: gateway.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    logger.error('获取支付网关列表失败', { error });
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/payment-gateways - 创建支付网关
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    const user = (request as any).user;
    
    // TODO: 验证管理员权限
    
    const body = await request.json();
    const { name, provider, config, webhookUrl, isTestMode = true } = body;

    // 验证输入
    if (!name || !provider || !config) {
      return NextResponse.json(
        { success: false, error: '网关名称、提供商和配置不能为空' },
        { status: 400 }
      );
    }

    // 检查是否已存在相同提供商的网关
    const existingGateway = await prisma.paymentGateway.findFirst({
      where: { provider },
    });

    if (existingGateway) {
      return NextResponse.json(
        { success: false, error: '该支付提供商已存在' },
        { status: 400 }
      );
    }

    // 创建支付网关
    const gateway = await prisma.paymentGateway.create({
      data: {
        name,
        provider,
        config,
        webhookUrl,
        isTestMode,
        isActive: true,
      },
    });

    logger.info('创建支付网关成功', {
      gatewayId: gateway.id,
      name: gateway.name,
      provider: gateway.provider,
      isTestMode: gateway.isTestMode,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: gateway.id,
        name: gateway.name,
        provider: gateway.provider,
        isActive: gateway.isActive,
        isTestMode: gateway.isTestMode,
        config: gateway.config,
        webhookUrl: gateway.webhookUrl,
        createdAt: gateway.createdAt.toISOString(),
        updatedAt: gateway.updatedAt.toISOString(),
      },
      message: '支付网关创建成功',
    });

  } catch (error) {
    logger.error('创建支付网关失败', { error });
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/payment-gateways/[id] - 更新支付网关
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    const user = (request as any).user;
    
    // TODO: 验证管理员权限
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '网关ID不能为空' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, config, webhookUrl, isActive, isTestMode } = body;

    // 检查网关是否存在
    const existingGateway = await prisma.paymentGateway.findUnique({
      where: { id },
    });

    if (!existingGateway) {
      return NextResponse.json(
        { success: false, error: '支付网关不存在' },
        { status: 404 }
      );
    }

    // 更新支付网关
    const gateway = await prisma.paymentGateway.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(config && { config }),
        ...(webhookUrl !== undefined && { webhookUrl }),
        ...(isActive !== undefined && { isActive }),
        ...(isTestMode !== undefined && { isTestMode }),
      },
    });

    logger.info('更新支付网关成功', {
      gatewayId: gateway.id,
      name: gateway.name,
      isActive: gateway.isActive,
      isTestMode: gateway.isTestMode,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: gateway.id,
        name: gateway.name,
        provider: gateway.provider,
        isActive: gateway.isActive,
        isTestMode: gateway.isTestMode,
        config: gateway.config,
        webhookUrl: gateway.webhookUrl,
        createdAt: gateway.createdAt.toISOString(),
        updatedAt: gateway.updatedAt.toISOString(),
      },
      message: '支付网关更新成功',
    });

  } catch (error) {
    logger.error('更新支付网关失败', { error });
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}