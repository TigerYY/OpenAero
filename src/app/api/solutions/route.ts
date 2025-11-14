import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';
import { logAuditAction, createSuccessResponse, createErrorResponse, createPaginatedResponse } from '@/lib/api-helpers';

// GET /api/solutions - 获取方案列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
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
    const total = await prisma.solution.count({ 
      where: {
        ...where
      }
    });

    // 获取方案列表
    const solutions = await prisma.solution.findMany({
      where,
      include: {
        _count: {
          select: {
            solutionReviews: true  // 使用 solutionReviews 而不是 reviews
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
            creatorId: null, // TODO: 添加 creatorId 字段到 Solution 模型
            creatorName: 'Unknown', // TODO: 通过 creatorId 关联获取创作者信息
            reviewCount: solution._count.solutionReviews || 0, // 使用 solutionReviews 计数
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

    return createPaginatedResponse(
      solutions.map(solution => ({
        id: solution.id,
        title: solution.title,
        slug: solution.id, // 临时使用 id 作为 slug
        description: solution.description,
        price: solution.price,
        status: solution.status,
        images: solution.images,
        categoryId: solution.category, // 使用 category 字段
        creatorId: null, // TODO: 添加 creatorId 字段
        createdAt: solution.createdAt.toISOString(),
        updatedAt: solution.updatedAt.toISOString(),
        averageRating: 0, // TODO: 计算平均评分
        creatorName: 'Unknown', // TODO: 通过关联获取
        reviewCount: solution._count.solutionReviews || 0, // 使用 solutionReviews 计数
        downloadCount: 0,
        specs: parseJsonSafely(solution.specs, {}),
        bom: parseJsonSafely(solution.bom, [])
      })),
      page,
      limit,
      total,
      '获取方案列表成功'
    );
  } catch (error) {
    console.error('获取方案列表失败:', error);
    return createErrorResponse(error instanceof Error ? error : new Error('获取方案列表失败'), 500);
  }
}
// POST /api/solutions - 创建新方案
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || createErrorResponse('未授权访问', 401);
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
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { user_id: authResult.user.id }
    });

    if (!creatorProfile) {
      return createErrorResponse('创作者档案不存在', 404);
    }

    // 创建方案
    const solution = await prisma.solution.create({
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
        // creatorId: creatorProfile.id, // TODO: 添加 creatorId 字段到 Solution 模型
        // userId: authResult.user.id // TODO: 添加 userId 字段到 Solution 模型
      }
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_CREATED',
      resource: 'solution',
      resourceId: solution.id,
      newValue: {
        title: solution.title,
        category: solution.category,
        price: solution.price,
      },
      metadata: { creatorId: creatorProfile.id },
    });

    return createSuccessResponse(
      {
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
        creatorId: null, // TODO: 添加 creatorId 字段
        creatorName: 'Unknown', // TODO: 通过关联获取
        specs: solution.specs || {},
        bom: solution.bom || []
      },
      '方案创建成功',
      201
    );
  } catch (error) {
    console.error('创建方案失败:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('创建方案失败'),
      500
    );
  }
}