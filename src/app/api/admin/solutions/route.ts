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
  status: z.enum(['DRAFT','PENDING_REVIEW','APPROVED','REJECTED','PUBLISHED','ARCHIVED','all']).optional().default('all'),
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

    // 构建排序条件
    const orderBy: any = {};
    orderBy[params.sortBy] = params.sortOrder;

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
              status: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          files: {
            select: {
              id: true,
              filename: true,
              fileType: true,
              url: true,
              createdAt: true,
            }
          },
          assets: {
            select: {
              id: true,
              type: true,
              url: true,
              title: true,
              description: true,
              createdAt: true,
            }
          },
          bomItems: {
            select: {
              id: true,
              name: true,
              model: true,
              quantity: true,
              unit: true,
              notes: true,
              unitPrice: true,
              supplier: true,
              partNumber: true,
              manufacturer: true,
              category: true,
              position: true,
              weight: true,
              specifications: true,
              productId: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                }
              },
              createdAt: true,
            }
          },
          solutionReviews: {
            select: {
              id: true,
              score: true,
              comments: true,
              fromStatus: true,
              toStatus: true,
              createdAt: true,
              reviewer: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          _count: {
            select: {
              solutionReviews: true,
              assets: true,
              bomItems: true,
            }
          }
        }
      }),
      prisma.solution.count({ where })
    ]);

    // 格式化返回数据
    const formattedSolutions = solutions.map(solution => ({
      id: solution.id,
      title: solution.title,
      description: solution.description,
      category: solution.category,
      price: solution.price,
      status: solution.status,
      images: solution.images,
      features: solution.features,
      specs: solution.specs,
      bom: solution.bom,
      version: solution.version,
      submittedAt: solution.submittedAt,
      reviewedAt: solution.reviewedAt,
      reviewNotes: solution.reviewNotes,
      creator: (solution as any).creator ? {
        id: (solution as any).creator.id,
        name: (solution as any).creator.user ? `${(solution as any).creator.user.firstName ?? ''} ${(solution as any).creator.user.lastName ?? ''}`.trim() : '',
        email: (solution as any).creator.user?.email,
        bio: (solution as any).creator.bio,
        website: (solution as any).creator.website,
        experience: (solution as any).creator.experience,
        specialties: (solution as any).creator.specialties,
        status: (solution as any).creator.status,
      } : null,
      user: (solution as any).user ? {
        id: (solution as any).user.id,
        name: `${(solution as any).user.firstName ?? ''} ${(solution as any).user.lastName ?? ''}`.trim(),
        email: (solution as any).user.email,
      } : null,
      files: (solution as any).files?.map((file: any) => {
        const converted = convertSnakeToCamel(file);
        return {
          id: converted.id,
          fileName: converted.filename || converted.fileName,
          fileType: converted.fileType,
          fileUrl: converted.url || converted.fileUrl,
          createdAt: converted.createdAt,
        };
      }) || [],
      assets: ((solution as any).assets || []).map((asset: any) => ({
        id: asset.id,
        type: asset.type,
        url: asset.url,
        title: asset.title || null,
        description: asset.description || null,
        createdAt: asset.createdAt,
      })),
      bomItems: ((solution as any).bomItems || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        model: item.model || null,
        quantity: item.quantity,
        unit: item.unit || '个',
        notes: item.notes || null,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
        supplier: item.supplier || null,
        partNumber: item.partNumber || null,
        manufacturer: item.manufacturer || null,
        category: item.category || null,
        position: item.position || null,
        weight: item.weight ? Number(item.weight) : null,
        specifications: item.specifications || null,
        productId: item.productId || null,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          price: Number(item.product.price),
        } : null,
        createdAt: item.createdAt,
      })),
      reviews: (solution as any).solutionReviews?.map((review: any) => {
        const converted = convertSnakeToCamel(review);
        return {
          id: converted.id,
          rating: converted.score ?? converted.rating ?? null,
          comment: converted.comments ?? converted.comment ?? null,
          fromStatus: converted.fromStatus || null,
          toStatus: converted.toStatus || null,
          createdAt: converted.reviewedAt || converted.createdAt,
          reviewer: review.reviewer ? convertSnakeToCamel({
            firstName: review.reviewer.firstName || review.reviewer.first_name,
            lastName: review.reviewer.lastName || review.reviewer.last_name,
            email: review.reviewer.email,
          }) : null,
        };
      }) || [],
      reviewCount: (solution as any)._count?.solutionReviews || 0,
      assetCount: (solution as any)._count?.assets || 0,
      bomItemCount: (solution as any)._count?.bomItems || 0,
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