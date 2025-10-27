import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/factories/[id] - 获取单个工厂详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const factory = await (prisma as any).factory.findUnique({
      where: { id: params.id },
      include: {
        sampleOrders: {
          include: {
            solution: {
              select: {
                id: true,
                title: true,
                category: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { sampleOrders: true }
        }
      }
    });

    if (!factory) {
      return NextResponse.json(
        { success: false, error: '工厂不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: factory
    });
  } catch (error) {
    console.error('获取工厂详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取工厂详情失败' },
      { status: 500 }
    );
  }
}

// PUT /api/factories/[id] - 更新工厂信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      name,
      contactName,
      contactPhone,
      contactEmail,
      address,
      categories,
      description,
      capacity,
      leadTime,
      minOrder,
      status
    } = body;

    // 检查工厂是否存在
    const existingFactory = await (prisma as any).factory.findUnique({
      where: { id: params.id }
    });

    if (!existingFactory) {
      return NextResponse.json(
        { success: false, error: '工厂不存在' },
        { status: 404 }
      );
    }

    // 更新工厂信息
    const factory = await (prisma as any).factory.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(contactName && { contactName }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(address && { address }),
        ...(categories && { categories }),
        ...(description !== undefined && { description }),
        ...(capacity !== undefined && { capacity: capacity ? parseInt(capacity) : null }),
        ...(leadTime !== undefined && { leadTime: leadTime ? parseInt(leadTime) : null }),
        ...(minOrder !== undefined && { minOrder: minOrder ? parseInt(minOrder) : null }),
        ...(status && { status })
      }
    });

    return NextResponse.json({
      success: true,
      data: factory
    });
  } catch (error) {
    console.error('更新工厂信息失败:', error);
    return NextResponse.json(
      { success: false, error: '更新工厂信息失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/factories/[id] - 删除工厂
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 检查工厂是否存在
    const existingFactory = await (prisma as any).factory.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { sampleOrders: true }
        }
      }
    });

    if (!existingFactory) {
      return NextResponse.json(
        { success: false, error: '工厂不存在' },
        { status: 404 }
      );
    }

    // 检查是否有关联的试产订单
    if (existingFactory._count.sampleOrders > 0) {
      return NextResponse.json(
        { success: false, error: '该工厂存在关联的试产订单，无法删除' },
        { status: 400 }
      );
    }

    // 删除工厂
    await (prisma as any).factory.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: '工厂删除成功'
    });
  } catch (error) {
    console.error('删除工厂失败:', error);
    return NextResponse.json(
      { success: false, error: '删除工厂失败' },
      { status: 500 }
    );
  }
}