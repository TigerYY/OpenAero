import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { requireAdmin } from '@/lib/supabase-server-auth';
import { prisma } from '@/lib/prisma';

// 创建分类的验证模式
const createCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空'),
  slug: z.string().min(1, 'URL标识符不能为空'),
  description: z.string().optional(),
  image: z.string().url().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isVisible: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
});

// 获取分类列表
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const session = authResult.session;
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const parentId = searchParams.get('parentId');
    const isActive = searchParams.get('isActive');
    const level = searchParams.get('level');

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (parentId !== null) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    if (level !== null) {
      where.level = parseInt(level);
    }

    // 获取分类列表
    const [categories, total] = await Promise.all([
      prisma.productCategory.findMany({
        where,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
        orderBy: [
          { level: 'asc' },
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.productCategory.count({ where }),
    ]);

    return NextResponse.json({
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    return NextResponse.json({ error: '获取分类列表失败' }, { status: 500 });
  }
}

// 创建分类
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const session = authResult.session;
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    // 检查slug是否已存在
    const existingCategory = await prisma.productCategory.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingCategory) {
      return NextResponse.json({ error: 'URL标识符已存在' }, { status: 400 });
    }

    // 计算分类层级
    let level = 0;
    if (validatedData.parentId) {
      const parentCategory = await prisma.productCategory.findUnique({
        where: { id: validatedData.parentId },
        select: { level: true },
      });

      if (!parentCategory) {
        return NextResponse.json({ error: '父分类不存在' }, { status: 400 });
      }

      level = parentCategory.level + 1;
    }

    // 创建分类
    const category = await prisma.productCategory.create({
      data: {
        ...validatedData,
        level,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据验证失败', details: error.errors }, { status: 400 });
    }

    console.error('创建分类失败:', error);
    return NextResponse.json({ error: '创建分类失败' }, { status: 500 });
  }
}