import { InventoryStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';

// 库存更新的验证模式
const updateInventorySchema = z.object({
  productId: z.string().min(1, '商品ID不能为空'),
  quantity: z.number().int().min(0, '库存数量不能为负数'),
  operation: z.enum(['SET', 'ADD', 'SUBTRACT']).default('SET'),
  reason: z.string().optional(),
  minStock: z.number().int().min(0).optional(),
  maxStock: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  reorderQty: z.number().int().min(0).optional(),
});

// 批量库存更新的验证模式
const batchUpdateInventorySchema = z.object({
  updates: z.array(updateInventorySchema).min(1, '至少需要一个更新项'),
});

// 获取库存列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') as InventoryStatus;
    const lowStock = searchParams.get('lowStock') === 'true';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (status) {
      where.status = status;
    }

    if (lowStock) {
      where.available = {
        lte: db.productInventory.fields.minStock,
      };
    }

    // 构建排序条件
    const orderBy: any = {};
    if (sortBy === 'productName') {
      orderBy.product = { name: sortOrder };
    } else if (sortBy === 'available') {
      orderBy.available = sortOrder;
    } else if (sortBy === 'quantity') {
      orderBy.quantity = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // 获取库存列表
    const [inventories, total] = await Promise.all([
      db.productInventory.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              brand: true,
              price: true,
              status: true,
              isActive: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.productInventory.count({ where }),
    ]);

    // 格式化返回数据
    const formattedInventories = inventories.map(inventory => ({
      ...inventory,
      avgCost: inventory.avgCost ? Number(inventory.avgCost) : null,
      lastCost: inventory.lastCost ? Number(inventory.lastCost) : null,
      product: {
        ...inventory.product,
        price: Number(inventory.product.price),
      },
      isLowStock: inventory.available <= inventory.minStock,
      stockValue: inventory.available * (inventory.avgCost ? Number(inventory.avgCost) : 0),
    }));

    return NextResponse.json({
      inventories: formattedInventories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取库存列表失败:', error);
    return NextResponse.json({ error: '获取库存列表失败' }, { status: 500 });
  }
}

// 更新库存
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateInventorySchema.parse(body);

    // 检查商品是否存在
    const product = await db.product.findUnique({
      where: { id: validatedData.productId },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    if (!product.inventory) {
      return NextResponse.json({ error: '商品库存记录不存在' }, { status: 404 });
    }

    // 计算新的库存数量
    let newQuantity = validatedData.quantity;
    if (validatedData.operation === 'ADD') {
      newQuantity = product.inventory.quantity + validatedData.quantity;
    } else if (validatedData.operation === 'SUBTRACT') {
      newQuantity = product.inventory.quantity - validatedData.quantity;
      if (newQuantity < 0) {
        return NextResponse.json({ error: '库存不足，无法减少指定数量' }, { status: 400 });
      }
    }

    // 计算可用库存
    const newAvailable = Math.max(0, newQuantity - product.inventory.reserved);

    // 确定库存状态
    let newStatus: InventoryStatus = InventoryStatus.IN_STOCK;
    const minStock = validatedData.minStock ?? product.inventory.minStock;
    
    if (newAvailable === 0) {
      newStatus = InventoryStatus.OUT_OF_STOCK;
    } else if (newAvailable <= minStock) {
      newStatus = InventoryStatus.LOW_STOCK;
    }

    // 更新库存
    const updatedInventory = await db.productInventory.update({
      where: { productId: validatedData.productId },
      data: {
        quantity: newQuantity,
        available: newAvailable,
        status: newStatus,
        minStock: validatedData.minStock,
        maxStock: validatedData.maxStock,
        reorderPoint: validatedData.reorderPoint,
        reorderQty: validatedData.reorderQty,
        lastStockIn: validatedData.operation === 'ADD' || validatedData.operation === 'SET' 
          ? new Date() 
          : product.inventory.lastStockIn,
        lastStockOut: validatedData.operation === 'SUBTRACT' 
          ? new Date() 
          : product.inventory.lastStockOut,
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
          },
        },
      },
    });

    // 格式化返回数据
    const formattedInventory = {
      ...updatedInventory,
      avgCost: updatedInventory.avgCost ? Number(updatedInventory.avgCost) : null,
      lastCost: updatedInventory.lastCost ? Number(updatedInventory.lastCost) : null,
      product: {
        ...updatedInventory.product,
        price: Number(updatedInventory.product.price),
      },
    };

    return NextResponse.json(formattedInventory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据验证失败', details: error.errors }, { status: 400 });
    }

    console.error('更新库存失败:', error);
    return NextResponse.json({ error: '更新库存失败' }, { status: 500 });
  }
}

// 批量更新库存
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = batchUpdateInventorySchema.parse(body);

    const results: any[] = [];
    const errors: any[] = [];

    // 使用事务处理批量更新
    await db.$transaction(async (tx) => {
      for (const update of validatedData.updates) {
        try {
          // 检查商品是否存在
          const product = await tx.product.findUnique({
            where: { id: update.productId },
            include: {
              inventory: true,
            },
          });

          if (!product || !product.inventory) {
            errors.push({
              productId: update.productId,
              error: '商品或库存记录不存在',
            });
            continue;
          }

          // 计算新的库存数量
          let newQuantity = update.quantity;
          if (update.operation === 'ADD') {
            newQuantity = product.inventory.quantity + update.quantity;
          } else if (update.operation === 'SUBTRACT') {
            newQuantity = product.inventory.quantity - update.quantity;
            if (newQuantity < 0) {
              errors.push({
                productId: update.productId,
                error: '库存不足，无法减少指定数量',
              });
              continue;
            }
          }

          // 计算可用库存
          const newAvailable = Math.max(0, newQuantity - product.inventory.reserved);

          // 确定库存状态
          let newStatus: InventoryStatus = InventoryStatus.IN_STOCK;
          const minStock = update.minStock ?? product.inventory.minStock;
          
          if (newAvailable === 0) {
            newStatus = InventoryStatus.OUT_OF_STOCK;
          } else if (newAvailable <= minStock) {
            newStatus = InventoryStatus.LOW_STOCK;
          }

          // 更新库存
          const updatedInventory = await tx.productInventory.update({
            where: { productId: update.productId },
            data: {
              quantity: newQuantity,
              available: newAvailable,
              status: newStatus,
              minStock: update.minStock,
              maxStock: update.maxStock,
              reorderPoint: update.reorderPoint,
              reorderQty: update.reorderQty,
              lastStockIn: update.operation === 'ADD' || update.operation === 'SET' 
                ? new Date() 
                : product.inventory.lastStockIn,
              lastStockOut: update.operation === 'SUBTRACT' 
                ? new Date() 
                : product.inventory.lastStockOut,
              updatedAt: new Date(),
            },
          });

          results.push({
            productId: update.productId,
            success: true,
            inventory: updatedInventory,
          });
        } catch (error) {
          errors.push({
            productId: update.productId,
            error: error instanceof Error ? error.message : '更新失败',
          });
        }
      }
    });

    return NextResponse.json({
      success: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据验证失败', details: error.errors }, { status: 400 });
    }

    console.error('批量更新库存失败:', error);
    return NextResponse.json({ error: '批量更新库存失败' }, { status: 500 });
  }
}