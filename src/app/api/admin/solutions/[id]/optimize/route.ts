import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdminAuth } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, logAuditAction } from '@/lib/api-helpers';
import { SolutionStatus } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// 媒体链接验证
const mediaLinkSchema = z.object({
  type: z.enum(['VIDEO', 'DEMO', 'TUTORIAL', 'DOCUMENTATION', 'OTHER']),
  title: z.string().min(1, '标题不能为空'),
  url: z.string().url('URL 格式不正确'),
  thumbnail: z.string().url().optional(),
  description: z.string().optional(),
  duration: z.number().positive().optional(),
});

// 商品链接验证
const productLinkSchema = z.object({
  productId: z.string().min(1, '商品ID不能为空'),
  productName: z.string().min(1, '商品名称不能为空'),
  productSku: z.string().min(1, '商品SKU不能为空'),
  productUrl: z.string().url('商品URL格式不正确'),
  relationType: z.enum(['REQUIRED', 'RECOMMENDED', 'OPTIONAL']),
  description: z.string().optional(),
});

// 优化请求验证
const optimizeSchema = z.object({
  publishDescription: z.string().optional(),
  mediaLinks: z.array(mediaLinkSchema).optional(),
  productLinks: z.array(productLinkSchema).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  metaKeywords: z.array(z.string()).optional(),
  featuredTags: z.array(z.string()).optional(),
  featuredOrder: z.number().int().positive().optional(),
  isFeatured: z.boolean().optional(),
  optimizationNotes: z.string().optional(),
});

// PUT /api/admin/solutions/[id]/optimize - 上架优化
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = params;
    const body = await request.json();

    // 验证输入数据
    const validatedData = optimizeSchema.parse(body);

    // 获取方案
    const solution = await prisma.solution.findUnique({
      where: { id },
      include: {
        creator: true,
        publishing: true,
      }
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    // 验证方案状态为 APPROVED
    if (solution.status !== 'APPROVED') {
      return createErrorResponse('只有已审核通过的方案可以进行上架优化', 400);
    }

    // 验证商品链接存在性（如果提供了商品链接）
    if (validatedData.productLinks && validatedData.productLinks.length > 0) {
      const productIds = validatedData.productLinks.map(link => link.productId);
      const existingProducts = await prisma.product.findMany({
        where: {
          id: { in: productIds }
        },
        select: { id: true }
      });

      const existingProductIds = new Set(existingProducts.map(p => p.id));
      const missingProducts = productIds.filter(id => !existingProductIds.has(id));

      if (missingProducts.length > 0) {
        return createErrorResponse(`以下商品不存在: ${missingProducts.join(', ')}`, 400);
      }
    }

    // 使用事务创建或更新 SolutionPublishing 记录并更新方案状态
    const result = await prisma.$transaction(async (tx) => {
      // 创建或更新 SolutionPublishing 记录
      const publishing = await tx.solutionPublishing.upsert({
        where: { solution_id: id },
        create: {
          solution_id: id,
          publish_description: validatedData.publishDescription || null,
          media_links: validatedData.mediaLinks ? validatedData.mediaLinks as any : null,
          product_links: validatedData.productLinks ? validatedData.productLinks as any : null,
          meta_title: validatedData.metaTitle || null,
          meta_description: validatedData.metaDescription || null,
          meta_keywords: validatedData.metaKeywords || [],
          featured_tags: validatedData.featuredTags || [],
          featured_order: validatedData.featuredOrder || null,
          is_featured: validatedData.isFeatured || false,
          optimized_at: new Date(),
          optimized_by: authResult.user.id,
          optimization_notes: validatedData.optimizationNotes || null,
        },
        update: {
          publish_description: validatedData.publishDescription !== undefined ? validatedData.publishDescription || null : undefined,
          media_links: validatedData.mediaLinks !== undefined ? (validatedData.mediaLinks as any) : undefined,
          product_links: validatedData.productLinks !== undefined ? (validatedData.productLinks as any) : undefined,
          meta_title: validatedData.metaTitle !== undefined ? validatedData.metaTitle || null : undefined,
          meta_description: validatedData.metaDescription !== undefined ? validatedData.metaDescription || null : undefined,
          meta_keywords: validatedData.metaKeywords !== undefined ? validatedData.metaKeywords : undefined,
          featured_tags: validatedData.featuredTags !== undefined ? validatedData.featuredTags : undefined,
          featured_order: validatedData.featuredOrder !== undefined ? validatedData.featuredOrder || null : undefined,
          is_featured: validatedData.isFeatured !== undefined ? validatedData.isFeatured : undefined,
          optimized_at: new Date(),
          optimized_by: authResult.user.id,
          optimization_notes: validatedData.optimizationNotes !== undefined ? validatedData.optimizationNotes || null : undefined,
        }
      });

      // 更新方案状态为 READY_TO_PUBLISH
      const updatedSolution = await tx.solution.update({
        where: { id },
        data: {
          status: 'READY_TO_PUBLISH',
        }
      });

      return { solution: updatedSolution, publishing };
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_OPTIMIZED',
      resource: 'solution',
      resourceId: id,
      oldValue: {
        status: solution.status,
        hasPublishing: !!solution.publishing,
      },
      newValue: {
        status: 'READY_TO_PUBLISH',
        hasPublishing: true,
        optimizedAt: result.publishing.optimized_at?.toISOString(),
      },
    });

    return createSuccessResponse(
      {
        id: result.solution.id,
        status: result.solution.status,
        optimizedAt: result.publishing.optimized_at?.toISOString(),
      },
      '方案优化完成，已准备发布'
    );
  } catch (error) {
    console.error('上架优化失败:', error);
    
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }
    
    return createErrorResponse(
      error instanceof Error ? error : new Error('上架优化失败'),
      500
    );
  }
}

