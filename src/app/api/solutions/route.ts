/* eslint-disable no-hardcoded-routes, @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { createErrorResponse, createPaginatedResponse, createSuccessResponse, logAuditAction } from '@/lib/api-helpers';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/solutions - 获取方案列表
export async function GET(request: NextRequest) {
  // 设置响应头，禁用缓存
  const headers = new Headers();
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 解决方案市场完全公开，无需认证
    // 尝试获取用户身份（仅用于管理员/创作者的特殊筛选，不影响公共访问）
    let isAdmin = false;
    let isCreator = false;
    try {
      const authResult = await authenticateRequest(request);
      if (authResult.success && authResult.user) {
        const userRoles = authResult.user?.roles || [];
        isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
        isCreator = userRoles.includes('CREATOR');
      }
    } catch (error) {
      // 忽略认证错误，继续公开访问
      console.log('[API /solutions] 认证检查失败（忽略）:', error);
    }

    // 构建查询条件
    const where: {
      status?: string;
      published_at?: { not: null };
      category?: string;
      OR?: Array<{ title?: { contains: string; mode: string }; description?: { contains: string; mode: string } }>;
    } = {};

    // 默认：公共访问时仅返回 PUBLISHED 状态的方案
    // 管理员/创作者可以通过 status 参数筛选其他状态
    if (isAdmin || isCreator) {
      // 管理员/创作者可以筛选状态
      if (status && status !== 'all') {
        where.status = status.toUpperCase();
      } else {
        // 默认也显示 PUBLISHED
        where.status = 'PUBLISHED';
        where.published_at = { not: null };
      }
    } else {
      // 公共访问：只返回已发布的方案
      where.status = 'PUBLISHED';
      // 确保 published_at 不为 null（已发布的方案必须有发布时间）
      where.published_at = { not: null };
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 获取总数 - 使用正确的枚举值
    const total = await prisma.solution.count({ 
      where
    });
    
    // 调试日志：记录查询条件和认证状态
    // eslint-disable-next-line no-console
    console.log('[API /solutions] 查询条件:', JSON.stringify(where, null, 2));
    // eslint-disable-next-line no-console
    console.log('[API /solutions] 查询总数:', total);
    
    // 如果总数为0，检查是否有PUBLISHED状态的方案
    if (total === 0) {
      const allPublishedCount = await prisma.solution.count({
        where: {
          status: 'PUBLISHED',
        }
      });
      const publishedWithDateCount = await prisma.solution.count({
        where: {
          status: 'PUBLISHED',
          published_at: { not: null },
        }
      });
      // eslint-disable-next-line no-console
      console.log('[API /solutions] 调试信息:', {
        allPublishedCount,
        publishedWithDateCount,
        queryStatus: where.status,
        queryPublishedAt: where.published_at,
      });
    }

    // 获取方案列表
    const solutions = await prisma.solution.findMany({
      where,
      include: {
        creator: {
          include: {
            user: {
              select: {
                display_name: true,
                first_name: true,
                last_name: true
              }
            }
          }
        },
        _count: {
          select: {
            solutionReviews: true,
            files: true,
            reviews: true
          }
        }
      },
      orderBy: [
        { published_at: 'desc' }, // 按发布时间降序排列
        { created_at: 'desc' } // 如果 published_at 相同，按创建时间排序
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    // 安全地解析JSON字符串（在外部定义，供多个地方使用）
    const parseJsonSafely = (jsonString: unknown, fallback: unknown) => {
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

    const response = createPaginatedResponse(
      solutions.map(solution => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const solutionAny = solution as any;
        return {
          id: solution.id,
          title: solution.title,
          slug: solution.id, // 临时使用 id 作为 slug
          description: solution.description,
          summary: solutionAny.summary || null,
          price: Number(solution.price),
          status: solution.status,
          images: solution.images,
          tags: solutionAny.tags || solution.features || [],
          categoryId: solution.category,
          creatorId: solution.creator_id,
          creatorName: solution.creator?.user ? 
            (solution.creator.user.display_name || 
             `${solution.creator.user.first_name ?? ''} ${solution.creator.user.last_name ?? ''}`.trim() || 
             'Unknown') : 'Unknown',
          createdAt: solution.created_at.toISOString(),
          updatedAt: solution.updated_at.toISOString(),
          publishedAt: solution.published_at?.toISOString() || null,
          averageRating: 0, // TODO: 计算平均评分
          reviewCount: solutionAny._count?.solutionReviews || 0,
          assetCount: solutionAny._count?.assets || 0,
          bomItemCount: solutionAny._count?.bomItems || 0,
          downloadCount: 0,
          specs: solutionAny.technicalSpecs || parseJsonSafely(solution.specs, {}),
          bom: parseJsonSafely(solution.bom, []),
          // 包含资产和 BOM 项信息
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          assets: ((solution as any).assets || []).map((asset: any) => ({
            id: asset.id,
            type: asset.type,
            url: asset.url,
            title: asset.title || null,
            description: asset.description || null,
          })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          bomItems: ((solution as any).bomItems || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            model: item.model || null,
            quantity: item.quantity,
            unit: item.unit || '个',
            unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
            productId: item.productId || null,
          }))
        };
      }),
      page,
      limit,
      total,
      '获取方案列表成功'
    );
    
    // 添加无缓存响应头
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
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
    
    // 验证用户为 CREATOR 角色
    const userRoles = authResult.user.roles || [];
    if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('只有创作者可以创建方案', 403);
    }

    // 确保用户有 CreatorProfile（如果用户有 CREATOR 角色但没有档案，自动创建）
    const { ensureCreatorProfile } = await import('@/lib/creator-profile-utils');
    const creatorProfile = await ensureCreatorProfile(authResult.user.id);

    if (!creatorProfile) {
      return createErrorResponse('创作者档案不存在，请先申请成为创作者', 404);
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
        specs: validatedData.specs ? (typeof validatedData.specs === 'string' ? validatedData.specs : JSON.stringify(validatedData.specs)) : null,
        bom: validatedData.bom ? (typeof validatedData.bom === 'string' ? validatedData.bom : JSON.stringify(validatedData.bom)) : null,
        status: 'DRAFT',
        creator_id: creatorProfile.id,
        locale: 'zh-CN', // 默认语言
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
        createdAt: solution.created_at,
        updatedAt: solution.updated_at,
        creatorId: solution.creator_id,
        creatorName: 'Unknown', // 需要再次查询creator profile
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