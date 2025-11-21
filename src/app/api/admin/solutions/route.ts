import { SolutionStatus } from '@prisma/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createPaginatedResponse,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { convertSnakeToCamel } from '@/lib/field-mapper';

export const dynamic = 'force-dynamic';

// 查询参数验证
const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  status: z.enum(['DRAFT','PENDING_REVIEW','APPROVED','READY_TO_PUBLISH','REJECTED','PUBLISHED','SUSPENDED','ARCHIVED','all']).optional().default('all'),
  category: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'title', 'price', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GET /api/admin/solutions - 获取方案列表（管理员）
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      status: searchParams.get('status') || 'all',
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    const page = parseInt(params.page);
    const limit = parseInt(params.limit);
    const offset = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (params.status !== 'all') {
      where.status = params.status as SolutionStatus;
    }
    
    if (params.category) {
      where.category = params.category;
    }
    
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // 构建排序条件（将 camelCase 转换为 snake_case）
    const orderBy: any = {};
    const sortByMap: Record<string, string> = {
      'createdAt': 'created_at',
      'title': 'title',
      'price': 'price',
      'status': 'status',
    };
    const dbSortBy = sortByMap[params.sortBy] || 'created_at';
    orderBy[dbSortBy] = params.sortOrder;

    // 查询方案列表
    const [solutions, total] = await Promise.all([
      prisma.solution.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              bio: true,
              website: true,
              experience: true,
              specialties: true,
              verification_status: true,
              user: {
                select: {
                  id: true,
                  user_id: true, // 需要 user_id 来从 Supabase Auth 获取 email
                  display_name: true,
                  first_name: true,
                  last_name: true,
                  // 注意：UserProfile 模型中没有 email 字段，email 存储在 Supabase Auth 中
                }
              }
            }
          },
          files: {
            select: {
              id: true,
              filename: true,
              original_name: true,
              file_type: true,
              url: true,
              created_at: true,
            }
          },
          publishing: {
            select: {
              id: true,
              publish_description: true,
              media_links: true,
              product_links: true,
              meta_title: true,
              meta_description: true,
              meta_keywords: true,
              featured_tags: true,
              featured_order: true,
              is_featured: true,
              optimized_at: true,
            }
          },
          solutionReviews: {
            select: {
              id: true,
              score: true,
              comments: true,
              from_status: true,
              to_status: true,
              created_at: true,
              reviewed_at: true,
              reviewer_id: true,
            },
            orderBy: { created_at: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              solutionReviews: true,
              files: true,
            }
          }
        }
      }),
      prisma.solution.count({ where })
    ]);

    // 批量获取用户邮箱（从 Supabase Auth）
    // 暂时简化：如果获取邮箱失败，不影响主要功能
    const emailMap = new Map<string, string | null>();
    try {
      const userIds = [...new Set(solutions
        .map((s: any) => s.creator?.user?.user_id)
        .filter(Boolean))] as string[];
      
      if (userIds.length > 0) {
        const supabaseAdmin = createSupabaseAdmin();
        // 批量获取用户邮箱
        await Promise.all(
          userIds.map(async (userId) => {
            try {
              const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);
              if (error) {
                console.warn(`[Admin Solutions API] 获取用户邮箱失败 (userId: ${userId}):`, error.message);
                emailMap.set(userId, null);
              } else {
                emailMap.set(userId, authUser?.user?.email || null);
              }
            } catch (error: any) {
              console.warn(`[Admin Solutions API] 获取用户邮箱异常 (userId: ${userId}):`, error?.message || error);
              emailMap.set(userId, null);
            }
          })
        );
      }
    } catch (error: any) {
      console.warn('[Admin Solutions API] 批量获取用户邮箱失败:', error?.message || error);
      // 继续执行，不中断主流程
    }

    // 格式化返回数据
    const formattedSolutions = solutions.map(solution => {
      // 解析 BOM JSON 字段
      let bomItems: any[] = [];
      if (solution.bom) {
        const bomJson = solution.bom as any;
        if (bomJson.components && Array.isArray(bomJson.components)) {
          bomItems = bomJson.components.map((item: any, index: number) => ({
            id: `bom-${index}`,
            name: item.name || '未知物料',
            model: item.model || null,
            quantity: item.quantity || 1,
            unit: item.unit || '个',
            notes: item.notes || null,
            unitPrice: item.unitPrice !== undefined ? Number(item.unitPrice) : null,
            supplier: item.supplier || null,
            partNumber: item.partNumber || null,
            manufacturer: item.manufacturer || null,
            category: item.category || null,
            position: item.position || null,
            weight: item.weight !== undefined ? Number(item.weight) : null,
            specifications: item.specifications || null,
            productId: item.productId || null,
            product: null,
            createdAt: new Date().toISOString(),
          }));
        } else if (Array.isArray(bomJson)) {
          bomItems = bomJson.map((item: any, index: number) => ({
            id: `bom-${index}`,
            name: item.name || '未知物料',
            model: item.model || null,
            quantity: item.quantity || 1,
            unit: item.unit || '个',
            notes: item.notes || null,
            unitPrice: item.unitPrice !== undefined ? Number(item.unitPrice) : null,
            supplier: item.supplier || null,
            partNumber: item.partNumber || null,
            manufacturer: item.manufacturer || null,
            category: item.category || null,
            position: item.position || null,
            weight: item.weight !== undefined ? Number(item.weight) : null,
            specifications: item.specifications || null,
            productId: item.productId || null,
            product: null,
            createdAt: new Date().toISOString(),
          }));
        }
      }

      return {
        id: solution.id,
        title: solution.title,
        description: solution.description,
        category: solution.category,
        price: Number(solution.price),
        status: solution.status,
        images: solution.images || [],
        features: solution.features || [],
        specs: solution.specs || {},
        bom: solution.bom || null,
        version: solution.version,
        submittedAt: solution.submitted_at?.toISOString() || null,
        reviewedAt: solution.reviewed_at?.toISOString() || null,
        reviewNotes: solution.review_notes || null,
        createdAt: solution.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: solution.updated_at?.toISOString() || new Date().toISOString(),
        creator: (solution as any).creator ? {
          id: (solution as any).creator.id,
          name: (solution as any).creator.user 
            ? ((solution as any).creator.user.display_name || 
               `${(solution as any).creator.user.first_name ?? ''} ${(solution as any).creator.user.last_name ?? ''}`.trim() || 
               'Unknown')
            : 'Unknown',
          email: (solution as any).creator?.user?.user_id 
            ? (emailMap.get((solution as any).creator.user.user_id) || null)
            : null,
          bio: (solution as any).creator.bio || null,
          website: (solution as any).creator.website || null,
          experience: (solution as any).creator.experience || null,
          specialties: (solution as any).creator.specialties || [],
          status: (solution as any).creator.verification_status || null,
        } : null,
        files: ((solution as any).files || []).map((file: any) => ({
          id: file.id,
          fileName: file.filename,
          fileType: file.file_type,
          fileUrl: file.url,
          createdAt: file.created_at?.toISOString() || new Date().toISOString(),
        })),
        assets: ((solution as any).files || []).map((file: any) => ({
          id: file.id,
          type: file.file_type,
          url: file.url,
          title: file.original_name || file.filename || null,
          description: file.description || null,
          createdAt: file.created_at?.toISOString() || new Date().toISOString(),
        })),
        bomItems: bomItems,
        reviews: ((solution as any).solutionReviews || []).map((review: any) => ({
          id: review.id,
          rating: review.score ?? null,
          comment: review.comments ?? null,
          fromStatus: review.from_status || null,
          toStatus: review.to_status || null,
          createdAt: review.reviewed_at?.toISOString() || review.created_at?.toISOString() || new Date().toISOString(),
          reviewer: null, // reviewer 信息需要单独查询 UserProfile
        })),
        reviewCount: (solution as any)._count?.solutionReviews || 0,
        assetCount: (solution as any)._count?.files || 0,
        bomItemCount: bomItems.length,
      };
    });

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
    console.error('[Admin Solutions API] 获取方案列表失败:', error);
    
    // 提供更详细的错误信息
    let errorMessage = '获取方案列表失败';
    let errorDetails: any = undefined;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
      
      // 打印完整的错误堆栈（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.error('[Admin Solutions API] 错误堆栈:', error.stack);
      }
      
      // 如果是数据库连接错误，提供更详细的诊断信息
      if (error.message.includes('Can\'t reach database server') || 
          error.message.includes('Connection') ||
          error.message.includes('timeout') ||
          error.message.includes('prepared statement')) {
        errorMessage = '数据库连接失败，请检查数据库服务器是否可访问';
        errorDetails.diagnosis = [
          '1. 检查 DATABASE_URL 环境变量是否正确配置',
          '2. 确认数据库服务器是否运行',
          '3. 检查网络连接是否正常',
          '4. 如果使用 Supabase Pooler，请确认使用端口 6543 和正确的连接字符串',
        ];
      }
      
      // 如果是 Prisma 查询错误
      if (error.message.includes('Unknown field') || 
          error.message.includes('Invalid `prisma') ||
          error.message.includes('does not exist')) {
        errorMessage = `数据库查询错误: ${error.message}`;
        errorDetails.suggestion = '请检查 Prisma schema 和数据库结构是否一致';
      }
    } else {
      console.error('[Admin Solutions API] 未知错误类型:', typeof error, error);
    }
    
    return createErrorResponse(
      errorMessage,
      500,
      errorDetails
    );
  }
}