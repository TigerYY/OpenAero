import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { checkAdminAuth } from '@/lib/api-auth-helpers';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

// 更新分类的验证模式
const updateCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').optional(),
  slug: z.string().min(1, 'URL标识符不能为空').optional(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
});

// 获取单个分类
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const session = authResult.session;
    
    const userRoles = Array.isArray(session?.user?.roles) 
      ? session.user.roles 
      : (session?.user?.role ? [session.user.role] : []);
    
    if (!userRoles.includes('ADMIN')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const category = await prisma.productCategory.findUnique({
      where: { id: params.id },
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
    });

    if (!category) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('获取分类失败:', error);
    return NextResponse.json({ error: '获取分类失败' }, { status: 500 });
  }
}

// 更新分类
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const session = authResult.session;
    
    const userRoles = Array.isArray(session?.user?.roles) 
      ? session.user.roles 
      : (session?.user?.role ? [session.user.role] : []);
    
    if (!userRoles.includes('ADMIN')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);

    // 检查分类是否存在
    const existingCategory = await prisma.productCategory.findUnique({
      where: { id: params.id },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    // 如果更新了slug，检查是否与其他分类冲突
    if (validatedData.slug && validatedData.slug !== existingCategory.slug) {
      const slugConflict = await prisma.productCategory.findUnique({
        where: { slug: validatedData.slug },
      });

      if (slugConflict) {
        return NextResponse.json({ error: 'URL标识符已存在' }, { status: 400 });
      }
    }

    // 计算新的层级（如果父分类发生变化）
    let level = existingCategory.level;
    if (validatedData.parentId !== undefined) {
      if (validatedData.parentId) {
        // 检查不能将分类设置为自己的子分类
        if (validatedData.parentId === params.id) {
          return NextResponse.json({ error: '不能将分类设置为自己的子分类' }, { status: 400 });
        }

        const parentCategory = await prisma.productCategory.findUnique({
          where: { id: validatedData.parentId },
          select: { level: true },
        });

        if (!parentCategory) {
          return NextResponse.json({ error: '父分类不存在' }, { status: 400 });
        }

        level = parentCategory.level + 1;
      } else {
        level = 0; // 设置为顶级分类
      }
    }

    // 更新分类
    const updatedCategory = await prisma.productCategory.update({
      where: { id: params.id },
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
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据验证失败', details: error.errors }, { status: 400 });
    }

    console.error('更新分类失败:', error);
    return NextResponse.json({ error: '更新分类失败' }, { status: 500 });
  }
}

// 删除分类
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const session = authResult.session;
    
    const userRoles = Array.isArray(session?.user?.roles) 
      ? session.user.roles 
      : (session?.user?.role ? [session.user.role] : []);
    
    if (!userRoles.includes('ADMIN')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 检查分类是否存在
    const category = await prisma.productCategory.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    // 检查是否有关联的商品
    if (category._count.products > 0) {
      return NextResponse.json({ 
        error: '该分类下还有商品，无法删除',
        productCount: category._count.products 
      }, { status: 400 });
    }

    // 检查是否有子分类
    if (category._count.children > 0) {
      return NextResponse.json({ 
        error: '该分类下还有子分类，无法删除',
        childrenCount: category._count.children 
      }, { status: 400 });
    }

    // 删除分类
    await prisma.productCategory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    return NextResponse.json({ error: '删除分类失败' }, { status: 500 });
  }
}