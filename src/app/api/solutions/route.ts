import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logUserAction } from '@/backend/auth/auth.middleware';
import { authenticateRequest } from '@/lib/auth-helpers';
import { db } from '@/lib/prisma';
import { ApiResponse } from '@/types';

// GET /api/solutions - 获取方案列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 构建查询条件
    const where: any = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      // 使用正确的枚举值
      where.status = status.toUpperCase() as any;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 获取总数 - 使用正确的枚举值
    const total = await db.solution.count({ 
      where: {
        ...where
      }
    });

    // 获取方案列表
    const solutions = await db.solution.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        solutions: solutions.map(solution => {
          // 安全地解析JSON字符串
          const parseJsonSafely = (jsonString: any, fallback: any) => {
            if (!jsonString) return fallback;
            if (typeof jsonString === 'string') {
              try {
                return JSON.parse(jsonString);
              } catch (e) {
                console.warn('Failed to parse JSON:', jsonString, e);
                return fallback;
              }
            }
            return jsonString;
          };

          return {
            id: solution.id,
            title: solution.title,
            description: solution.description,
            category: solution.category,
            status: solution.status,
            price: solution.price,
            version: solution.version,
            tags: parseJsonSafely(solution.features, []),
            images: parseJsonSafely(solution.images, []),
            createdAt: solution.createdAt,
            updatedAt: solution.updatedAt,
            creatorId: solution.creatorId,
            creatorName: solution.user?.firstName && solution.user?.lastName 
                          ? `${solution.user.firstName} ${solution.user.lastName}` 
                          : 'Unknown',
            reviewCount: solution._count.reviews,
            downloadCount: 0, // Temporarily set to 0 since orders relationship is problematic
            specs: parseJsonSafely(solution.specs, {}),
            bom: parseJsonSafely(solution.bom, [])
          };
        }),
        total,
        page,
        limit,
        totalPages
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('获取方案列表失败:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    const response: ApiResponse<null> = {
      success: false,
      error: '获取方案列表失败',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}
// POST /api/solutions - 创建新方案
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || NextResponse.json(
        {
          success: false,
          error: '未授权访问',
          data: null
        } as ApiResponse<null>,
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 简单的数据验证
    const createSolutionSchema = z.object({
      title: z.string().min(1, '标题不能为空'),
      description: z.string().min(1, '描述不能为空'),
      category: z.string().min(1, '分类不能为空'),
      price: z.number().min(0, '价格不能为负数'),
      features: z.array(z.string()).optional(),
      images: z.array(z.string()).optional(),
      specs: z.any().optional(),
      bom: z.any().optional()
    });
    
    const validatedData = createSolutionSchema.parse(body);
    
    // 获取创作者档案
    const creatorProfile = await db.creatorProfile.findUnique({
      where: { userId: authResult.user.id }
    });

    if (!creatorProfile) {
      return NextResponse.json(
        {
          success: false,
          error: '创作者档案不存在',
          data: null
        } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // 创建方案
    const solution = await db.solution.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        price: validatedData.price,
        features: validatedData.features || [],
        images: validatedData.images || [],
        specs: JSON.stringify(validatedData.specs || {}),
        bom: JSON.stringify(validatedData.bom || []),
        status: 'DRAFT',
        creatorId: creatorProfile.id,
        userId: authResult.user.id
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // 记录审计日志
    await logUserAction(
      authResult.user.id,
      'create_solution',
      'solution',
      solution.id,
      undefined,
      JSON.stringify({ title: solution.title, category: solution.category }),
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: solution.id,
        title: solution.title,
        description: solution.description,
        category: solution.category,
        status: solution.status,
        price: solution.price,
        version: solution.version,
        tags: solution.features || [],
        images: solution.images || [],
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt,
        creatorId: solution.creatorId,
        creatorName: solution.user?.firstName && solution.user?.lastName 
                      ? `${solution.user.firstName} ${solution.user.lastName}` 
                      : 'Unknown',
        specs: solution.specs || {},
        bom: solution.bom || []
      }
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('创建方案失败:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '创建方案失败',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}