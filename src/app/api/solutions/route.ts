import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { searchSchema } from '@/lib/validations';
import { ApiResponse, PaginatedResponse, Solution } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      q: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      minPrice: searchParams.get('minPrice') || undefined,
      maxPrice: searchParams.get('maxPrice') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    // 验证参数
    const validatedParams = searchSchema.parse(params);
    
    const page = parseInt(validatedParams.page || '1');
    const limit = parseInt(validatedParams.limit || '20');
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {
      status: 'PUBLISHED',
    };

    if (validatedParams.q) {
      where.OR = [
        { title: { contains: validatedParams.q, mode: 'insensitive' } },
        { description: { contains: validatedParams.q, mode: 'insensitive' } },
        { features: { hasSome: [validatedParams.q] } },
      ];
    }

    if (validatedParams.category) {
      where.category = validatedParams.category;
    }

    if (validatedParams.minPrice || validatedParams.maxPrice) {
      where.price = {};
      if (validatedParams.minPrice) {
        where.price.gte = parseFloat(validatedParams.minPrice);
      }
      if (validatedParams.maxPrice) {
        where.price.lte = parseFloat(validatedParams.maxPrice);
      }
    }

    // 构建排序
    const orderBy: any = {};
    if (validatedParams.sortBy) {
      orderBy[validatedParams.sortBy] = validatedParams.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // 查询解决方案
    const [solutions, total] = await Promise.all([
      prisma.solution.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              bio: true,
              specialties: true,
              user: {
                select: {
                  name: true,
                  avatar: true,
                },
              },
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      }),
      prisma.solution.count({ where }),
    ]);

    // 计算平均评分
    const solutionsWithRating = solutions.map((solution: any) => {
      const averageRating = solution.reviews.length > 0
        ? solution.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / solution.reviews.length
        : 0;

      return {
        ...solution,
        price: Number(solution.price),
        specs: solution.specs as Record<string, any> | undefined,
        bom: solution.bom as Record<string, any> | undefined,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: solution.reviews.length,
        reviews: undefined, // 移除reviews字段
      };
    });

    const response: PaginatedResponse<Solution> = {
      data: solutionsWithRating,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
    } as ApiResponse<PaginatedResponse<Solution>>);

  } catch (error) {
    console.error('Error fetching solutions:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取解决方案失败',
      } as ApiResponse,
      { status: 500 }
    );
  }
}
