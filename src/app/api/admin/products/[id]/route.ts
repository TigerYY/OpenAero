import { ProductStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/prisma';

// 更新商品的验证模式
const updateProductSchema = z.object({
  name: z.string().min(1, '商品名称不能为空').optional(),
  slug: z.string().min(1, 'URL标识符不能为空').optional(),
  description: z.string().optional(),
  shortDesc: z.string().optional(),
  sku: z.string().min(1, '商品编码不能为空').optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  price: z.number().min(0, '价格不能为负数').optional(),
  originalPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  categoryId: z.string().min(1, '分类不能为空').optional(),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
  }).optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
  documents: z.array(z.string().url()).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  solutionId: z.string().optional(),
});

// 获取单个商品详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const product = await db.product.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        solution: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            creator: {
              select: {
                id: true,
                bio: true,
                website: true,
              },
            },
          },
        },
        inventory: {
          select: {
            quantity: true,
            available: true,
            reserved: true,
            status: true,
            minStock: true,
            lastStockIn: true,
          },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            cartItems: true,
            orderItems: true,
            reviews: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    // 格式化返回数据
    const formattedProduct = {
      ...product,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      weight: product.weight ? Number(product.weight) : null,
      rating: product.rating ? Number(product.rating) : null,
    };

    return NextResponse.json(formattedProduct);
  } catch (error) {
    console.error('获取商品详情失败:', error);
    return NextResponse.json({ error: '获取商品详情失败' }, { status: 500 });
  }
}

// 更新商品
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    // 检查商品是否存在
    const existingProduct = await db.product.findUnique({
      where: { id: params.id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    // 如果更新SKU，检查是否与其他商品冲突
    if (validatedData.sku && validatedData.sku !== existingProduct.sku) {
      const existingSku = await db.product.findUnique({
        where: { sku: validatedData.sku },
      });

      if (existingSku) {
        return NextResponse.json({ error: '商品编码已存在' }, { status: 400 });
      }
    }

    // 如果更新slug，检查是否与其他商品冲突
    if (validatedData.slug && validatedData.slug !== existingProduct.slug) {
      const existingSlug = await db.product.findUnique({
        where: { slug: validatedData.slug },
      });

      if (existingSlug) {
        return NextResponse.json({ error: 'URL标识符已存在' }, { status: 400 });
      }
    }

    // 如果更新分类，检查分类是否存在
    if (validatedData.categoryId) {
      const category = await db.productCategory.findUnique({
        where: { id: validatedData.categoryId },
      });

      if (!category) {
        return NextResponse.json({ error: '分类不存在' }, { status: 400 });
      }
    }

    // 如果更新关联方案，检查方案是否存在
    if (validatedData.solutionId) {
      const solution = await db.solution.findUnique({
        where: { id: validatedData.solutionId },
      });

      if (!solution) {
        return NextResponse.json({ error: '关联的方案不存在' }, { status: 400 });
      }
    }

    // 更新商品
    const updatedProduct = await db.product.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        solution: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        inventory: {
          select: {
            quantity: true,
            available: true,
            status: true,
          },
        },
      },
    });

    // 格式化返回数据
    const formattedProduct = {
      ...updatedProduct,
      price: Number(updatedProduct.price),
      originalPrice: updatedProduct.originalPrice ? Number(updatedProduct.originalPrice) : null,
      costPrice: updatedProduct.costPrice ? Number(updatedProduct.costPrice) : null,
      weight: updatedProduct.weight ? Number(updatedProduct.weight) : null,
      rating: updatedProduct.rating ? Number(updatedProduct.rating) : null,
    };

    return NextResponse.json(formattedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据验证失败', details: error.errors }, { status: 400 });
    }

    console.error('更新商品失败:', error);
    return NextResponse.json({ error: '更新商品失败' }, { status: 500 });
  }
}

// 删除商品
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 检查商品是否存在
    const existingProduct = await db.product.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            cartItems: true,
            orderItems: true,
          },
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    // 检查是否有关联的订单项目
    if (existingProduct._count.orderItems > 0) {
      return NextResponse.json({ 
        error: '该商品已有订单记录，无法删除。建议将商品状态设为停用。' 
      }, { status: 400 });
    }

    // 使用事务删除商品及其相关数据
    await db.$transaction(async (tx) => {
      // 删除购物车项目
      await tx.cartItem.deleteMany({
        where: { productId: params.id },
      });

      // 删除商品评价
      await tx.productReview.deleteMany({
        where: { productId: params.id },
      });

      // 删除库存记录
      await tx.productInventory.deleteMany({
        where: { productId: params.id },
      });

      // 删除商品
      await tx.product.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ message: '商品删除成功' });
  } catch (error) {
    console.error('删除商品失败:', error);
    return NextResponse.json({ error: '删除商品失败' }, { status: 500 });
  }
}