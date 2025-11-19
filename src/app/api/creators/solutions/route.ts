/**
 * 创作者方案管理 API
 * GET /api/creators/solutions - 获取创作者的方案列表
 * POST /api/creators/solutions - 创建新方案
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createPaginatedResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { ensureCreatorProfile } from '@/lib/creator-profile-utils';

export const dynamic = 'force-dynamic';

const solutionsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  status: z.string().optional(),
  search: z.string().optional(),
});

const createSolutionSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
  description: z.string().min(10, '描述至少需要10个字符').max(5000, '描述不能超过5000个字符'),
  category: z.string().min(1, '分类不能为空'),
  price: z.number().min(0, '价格不能为负数'),
  images: z.array(z.string().url()).optional(),
  features: z.array(z.string()).optional(),
  specs: z.any().optional(),
  bom: z.any().optional(),
});

/**
 * GET /api/creators/solutions - 获取创作者的方案列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    // 检查用户是否为创作者（使用 roles 数组）
    const userProfile = await prisma.userProfile.findUnique({
      where: { user_id: user.id },
      select: { roles: true },
    });

    const userRoles = Array.isArray(userProfile?.roles) ? userProfile.roles : [];
    if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('只有创作者可以访问此接口', 403);
    }

    // 确保用户有 CreatorProfile（如果用户有 CREATOR 角色但没有档案，自动创建）
    const creatorProfile = await ensureCreatorProfile(user.id);

    if (!creatorProfile) {
      return createErrorResponse('创作者档案不存在', 404);
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = solutionsQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      search: searchParams.get('search'),
    });

    if (!queryResult.success) {
      return createErrorResponse('查询参数无效', 400);
    }

    const { page, limit, status, search } = queryResult.data;
    const skip = (page - 1) * limit;

    const where: any = {
      creator_id: creatorProfile.id,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [solutions, total] = await Promise.all([
      prisma.solution.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          price: true,
          status: true,
          images: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              orders: true,
              reviews: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.solution.count({ where }),
    ]);

    const formattedSolutions = solutions.map((solution) => ({
      id: solution.id,
      title: solution.title,
      description: solution.description,
      category: solution.category,
      price: Number(solution.price),
      status: solution.status,
      images: solution.images,
      orderCount: solution._count.orders,
      reviewCount: solution._count.reviews,
      createdAt: solution.created_at,
      updatedAt: solution.updated_at,
    }));

    return createPaginatedResponse(
      formattedSolutions,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      '获取方案列表成功'
    );
  } catch (error) {
    console.error('获取方案列表失败:', error);
    return createErrorResponse(
      '获取方案列表失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * POST /api/creators/solutions - 创建新方案
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    // 检查用户是否为创作者（使用 roles 数组）
    const userProfile = await prisma.userProfile.findUnique({
      where: { user_id: user.id },
      select: { roles: true },
    });

    const userRoles = Array.isArray(userProfile?.roles) ? userProfile.roles : [];
    if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('只有创作者可以创建方案', 403);
    }

    // 确保用户有 CreatorProfile（如果用户有 CREATOR 角色但没有档案，自动创建）
    const creatorProfile = await ensureCreatorProfile(user.id);

    if (!creatorProfile) {
      return createErrorResponse('创作者档案不存在', 404);
    }

    const body = await request.json();
    const validationResult = createSolutionSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const solutionData = validationResult.data;

    // 创建方案
    const solution = await prisma.solution.create({
      data: {
        title: solutionData.title,
        description: solutionData.description,
        category: solutionData.category,
        price: solutionData.price,
        images: solutionData.images || [],
        features: solutionData.features || [],
        specs: solutionData.specs ? JSON.stringify(solutionData.specs) : null,
        bom: solutionData.bom ? JSON.stringify(solutionData.bom) : null,
        creator_id: creatorProfile.id,
        status: 'DRAFT',
      },
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: user.id,
      action: 'SOLUTION_CREATED',
      resource: 'solutions',
      resource_id: solution.id,
      metadata: {
        title: solution.title,
        category: solution.category,
        price: Number(solution.price),
      },
    });

    return createSuccessResponse(
      {
        id: solution.id,
        title: solution.title,
        status: solution.status,
        createdAt: solution.created_at,
      },
      '方案创建成功',
      201
    );
  } catch (error) {
    console.error('创建方案失败:', error);
    return createErrorResponse(
      '创建方案失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

