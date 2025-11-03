import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

// GET /api/sample-orders/[id] - 获取单个试产订单详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sampleOrder = await (prisma as any).sampleOrder.findUnique({
      where: { id: params.id },
      include: {
        factory: {
          select: {
            id: true,
            name: true,
            contactName: true,
            contactPhone: true,
            contactEmail: true,
            address: true,
            leadTime: true,
            capacity: true
          }
        },
        solution: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            price: true,
            images: true,
            features: true,
            specs: true
          }
        }
      }
    });

    if (!sampleOrder) {
      return NextResponse.json(
        { success: false, error: '试产订单不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sampleOrder
    });
  } catch (error) {
    console.error('获取试产订单详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取试产订单详情失败' },
      { status: 500 }
    );
  }
}

// PUT /api/sample-orders/[id] - 更新试产订单
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      status,
      quantity,
      deadline,
      notes,
      requirements,
      specFiles,
      resultFiles,
      estimatedCost,
      actualCost
    } = body;

    // 检查试产订单是否存在
    const existingSampleOrder = await (prisma as any).sampleOrder.findUnique({
      where: { id: params.id }
    });

    if (!existingSampleOrder) {
      return NextResponse.json(
        { success: false, error: '试产订单不存在' },
        { status: 404 }
      );
    }

    // 准备更新数据
    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
      
      // 根据状态更新时间戳
      switch (status) {
        case 'CONFIRMED':
          updateData.confirmedAt = new Date();
          break;
        case 'IN_PROGRESS':
          updateData.startedAt = new Date();
          break;
        case 'COMPLETED':
          updateData.completedAt = new Date();
          break;
        case 'DELIVERED':
          updateData.deliveredAt = new Date();
          break;
      }
    }
    
    if (quantity !== undefined) {
      updateData.quantity = parseInt(quantity);
    }
    
    if (deadline) {
      updateData.deadline = new Date(deadline);
    }
    
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    if (requirements !== undefined) {
      updateData.requirements = requirements;
    }
    
    if (specFiles !== undefined) {
      updateData.specFiles = specFiles;
    }
    
    if (resultFiles !== undefined) {
      updateData.resultFiles = resultFiles;
    }
    
    if (estimatedCost !== undefined) {
      updateData.estimatedCost = estimatedCost ? parseFloat(estimatedCost) : null;
    }
    
    if (actualCost !== undefined) {
      updateData.actualCost = actualCost ? parseFloat(actualCost) : null;
    }

    // 更新试产订单
    const sampleOrder = await (prisma as any).sampleOrder.update({
      where: { id: params.id },
      data: updateData,
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
    });
  } catch (error) {
    console.error('更新试产订单失败:', error);
    return NextResponse.json(
      { success: false, error: '更新试产订单失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/sample-orders/[id] - 删除试产订单
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 检查试产订单是否存在
    const existingSampleOrder = await (prisma as any).sampleOrder.findUnique({
      where: { id: params.id }
    });

    if (!existingSampleOrder) {
      return NextResponse.json(
        { success: false, error: '试产订单不存在' },
        { status: 404 }
      );
    }

    // 检查订单状态，只有待确认和已取消的订单可以删除
    if (!['PENDING', 'CANCELLED'].includes(existingSampleOrder.status)) {
      return NextResponse.json(
        { success: false, error: '只有待确认或已取消的订单可以删除' },
        { status: 400 }
      );
    }

    // 删除试产订单
    await (prisma as any).sampleOrder.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: '试产订单删除成功'
    });
  } catch (error) {
    console.error('删除试产订单失败:', error);
    return NextResponse.json(
      { success: false, error: '删除试产订单失败' },
      { status: 500 }
    );
  }
}