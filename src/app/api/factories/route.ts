import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

// GET /api/factories - 获取工厂列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') as string | null;
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (category) {
      where.categories = {
        has: category
      };
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 获取工厂列表和总数
    const [factories, total] = await Promise.all([
      (prisma as any).factory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { sampleOrders: true }
          }
        }
      }),
      (prisma as any).factory.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        factories,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取工厂列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取工厂列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/factories - 创建新工厂
export async function POST(request: NextRequest) {
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
      minOrder
    } = body;

    // 验证必填字段
    if (!name || !contactName || !address || !categories || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 创建工厂
    const factory = await (prisma as any).factory.create({
      data: {
        name,
        contactName,
        contactPhone,
        contactEmail,
        address,
        categories,
        description,
        capacity: capacity ? parseInt(capacity) : null,
        leadTime: leadTime ? parseInt(leadTime) : null,
        minOrder: minOrder ? parseInt(minOrder) : null,
        status: 'ACTIVE'
      }
    });

    return NextResponse.json({
      success: true,
      data: factory
    }, { status: 201 });
  } catch (error) {
    console.error('创建工厂失败:', error);
    return NextResponse.json(
      { success: false, error: '创建工厂失败' },
      { status: 500 }
    );
  }
}