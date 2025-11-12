import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

// GET /api/sample-orders - 获取试产订单列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const factoryId = searchParams.get('factoryId');
    const solutionId = searchParams.get('solutionId');

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (factoryId) {
      where.factoryId = factoryId;
    }
    
    if (solutionId) {
      where.solutionId = solutionId;
    }

    // 获取试产订单列表和总数
    const [sampleOrders, total] = await Promise.all([
      (prisma as any).sampleOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          factory: {
            select: {
              id: true,
              name: true,
              contactName: true,
              contactPhone: true
            }
          },
          solution: {
            select: {
              id: true,
              title: true,
              category: true,
              price: true,
              images: true
            }
          }
        }
      }),
      (prisma as any).sampleOrder.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sampleOrders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取试产订单列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取试产订单列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/sample-orders - 创建新的试产订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      factoryId,
      solutionId,
      quantity,
      deadline,
      notes,
      requirements,
      specFiles,
      estimatedCost
    } = body;

    // 验证必填字段
    if (!factoryId || !solutionId || !quantity || !deadline) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 验证工厂和解决方案是否存在
    const [factory, solution] = await Promise.all([
      (prisma as any).factory.findUnique({ where: { id: factoryId } }),
      (prisma as any).solution.findUnique({ where: { id: solutionId } })
    ]);

    if (!factory) {
      return NextResponse.json(
        { success: false, error: '工厂不存在' },
        { status: 400 }
      );
    }

    if (!solution) {
      return NextResponse.json(
        { success: false, error: '解决方案不存在' },
        { status: 400 }
      );
    }

    // 生成订单号
    const orderNumber = `SO${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 创建试产订单
    const sampleOrder = await (prisma as any).sampleOrder.create({
      data: {
        factoryId,
        solutionId,
        orderNumber,
        quantity: parseInt(quantity),
        deadline: new Date(deadline),
        notes,
        requirements,
        specFiles: specFiles || [],
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        status: 'PENDING'
      },
      include: {
        factory: {
          select: {
            id: true,
            name: true,
            contactName: true,
            contactPhone: true
          }
        },
        solution: {
          select: {
            id: true,
            title: true,
            category: true,
            price: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: sampleOrder
    }, { status: 201 });
  } catch (error) {
    console.error('创建试产订单失败:', error);
    return NextResponse.json(
      { success: false, error: '创建试产订单失败' },
      { status: 500 }
    );
  }
}