import { ProductStatus } from '@prisma/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { checkAdminAuth } from '@/lib/api-auth-helpers';
import { createErrorResponse, createPaginatedResponse, createSuccessResponse, createValidationErrorResponse } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

// 创建商品的验证模式
const createProductSchema = z.object({
  name: z.string().min(1, '商品名称不能为空'),
  slug: z.string().min(1, 'URL标识符不能为空'),
  description: z.string().optional(),
  shortDesc: z.string().optional(),
  sku: z.string().min(1, '商品编码不能为空'),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  price: z.number().min(0, '价格不能为负数'),
  originalPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  categoryId: z.string().min(1, '分类不能为空'),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
  }).optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  images: z.array(z.string().url()).default([]),
  videos: z.array(z.string().url()).default([]),
  documents: z.array(z.string().url()).default([]),
  status: z.nativeEnum(ProductStatus).default('DRAFT' as ProductStatus),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  solutionId: z.string().optional(),
});

// 获取商品列表
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }
    const session = authResult.session;
    
    const userRoles = Array.isArray(session?.user?.roles) 
      ? session.user.roles 
      : (session?.user?.role ? [session.user.role] : []);
    
    if (!userRoles.includes('ADMIN')) {
      return createErrorResponse('权限不足', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const statusParam = searchParams.get('status');
    const status = statusParam && statusParam in ProductStatus ? (statusParam as ProductStatus) : undefined;
    const isActive = searchParams.get('isActive');
    const isFeatured = searchParams.get('isFeatured');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.category_id = categoryId;
    }

    if (status) {
      where.status = status;
    }

    if (isActive !== null) {
      where.is_active = isActive === 'true';
    }

    if (isFeatured !== null) {
      where.is_featured = isFeatured === 'true';
    }

    // 构建排序条件
    const orderBy: any = {};
    // Map camelCase sortBy to snake_case field names
    const sortByMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      price: 'price',
      rating: 'rating',
      salesCount: 'sales_count',
      name: 'name',
      reviewCount: 'review_count',
    };
    orderBy[sortByMap[sortBy] || sortBy] = sortOrder;

    // 获取商品列表
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
          _count: {
            select: {
              cartItems: true,
              orderItems: true,
              reviews: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // 格式化返回数据
    const formattedProducts = products.map(product => ({
      ...product,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      weight: product.weight ? Number(product.weight) : null,
      rating: product.rating ? Number(product.rating) : null,
    }));

    return createPaginatedResponse(formattedProducts, page, limit, total, '获取商品列表成功');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取商品列表失败:', error);}
    return createErrorResponse('获取商品列表失败', 500);
  }
}

// 创建商品
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }
    const session = authResult.session;
    
    const userRoles = Array.isArray(session?.user?.roles) 
      ? session.user.roles 
      : (session?.user?.role ? [session.user.role] : []);
    
    if (!userRoles.includes('ADMIN')) {
      return createErrorResponse('权限不足', 403);
    }

    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    // 检查SKU是否已存在
    const existingSku = await prisma.product.findUnique({
      where: { sku: validatedData.sku },
    });

    if (existingSku) {
      return createErrorResponse('商品编码已存在', 400);
    }

    // 检查slug是否已存在
    const existingSlug = await prisma.product.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingSlug) {
      return createErrorResponse('URL标识符已存在', 400);
    }

    // 检查分类是否存在
    const category = await prisma.productCategory.findUnique({
      where: { id: validatedData.categoryId },
    });

    if (!category) {
      return createErrorResponse('分类不存在', 400);
    }

    // 如果关联了方案，检查方案是否存在
    if (validatedData.solutionId) {
      const solution = await prisma.solution.findUnique({
        where: { id: validatedData.solutionId },
      });

      if (!solution) {
        return createErrorResponse('关联的方案不存在', 400);
      }
    }

    // 创建商品 - 转换字段名为 snake_case
    const productData: any = {
      ...validatedData,
      category_id: validatedData.categoryId,
      solution_id: validatedData.solutionId,
      original_price: validatedData.originalPrice,
      cost_price: validatedData.costPrice,
      is_active: validatedData.isActive,
      is_featured: validatedData.isFeatured,
      meta_title: validatedData.metaTitle,
      meta_description: validatedData.metaDescription,
      meta_keywords: validatedData.metaKeywords,
      short_desc: validatedData.shortDesc,
    };
    // Remove camelCase fields
    delete productData.categoryId;
    delete productData.solutionId;
    delete productData.originalPrice;
    delete productData.costPrice;
    delete productData.isActive;
    delete productData.isFeatured;
    delete productData.metaTitle;
    delete productData.metaDescription;
    delete productData.metaKeywords;
    delete productData.shortDesc;
    
    const product = await prisma.product.create({
      data: productData,
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
      },
    });

    // 创建对应的库存记录
    await prisma.productInventory.create({
      data: {
        product_id: product.id,
        quantity: 0,
        available: 0,
      },
    });

    // 格式化返回数据
    const formattedProduct = {
      ...product,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      weight: product.weight ? Number(product.weight) : null,
      rating: product.rating ? Number(product.rating) : null,
    };

    return createSuccessResponse(formattedProduct, '创建商品成功', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('创建商品失败:', error);}
    return createErrorResponse('创建商品失败', 500);
  }
}