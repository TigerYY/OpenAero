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
  platform: z.enum(['TAOBAO', 'TMALL', 'JD', 'PINDUODUO', 'AMAZON', 'OTHER']),
  title: z.string().min(1, '商品标题不能为空'),
  url: z.string().url('商品URL格式不正确'),
  thumbnail: z.union([z.string().url(), z.literal('')]).optional(),
  description: z.string().optional(),
});

// 优化请求验证（包含方案基本信息和发布优化数据）
const optimizeSchema = z.object({
  // 方案基本信息（可选，管理员可以优化这些字段）
  title: z.string().min(5).max(100).optional(),
  summary: z.string().max(500).optional(),
  description: z.string().min(20).max(2000).optional(),
  category: z.string().optional(),
  price: z.number().min(0).max(100000).optional(),
  tags: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  images: z.array(z.string().url()).max(10).optional(),
  specs: z.record(z.any()).optional(),
  useCases: z.record(z.any()).optional(),
  architecture: z.record(z.any()).optional(),
  bom: z.union([z.array(z.any()), z.record(z.any())]).optional(),
  // 发布优化数据
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

    // 验证方案状态为 APPROVED 或 READY_TO_PUBLISH
    // 允许对已审核通过的方案或已准备发布的方案进行优化
    if (solution.status !== 'APPROVED' && solution.status !== 'READY_TO_PUBLISH') {
      return createErrorResponse('只有已审核通过或已准备发布的方案可以进行上架优化', 400);
    }

    // 商品链接验证（URL格式已在schema中验证，无需额外检查）

    // 使用事务更新方案基本信息和 SolutionPublishing 记录
    const result = await prisma.$transaction(async (tx) => {
      // 构建方案基本信息更新数据
      const solutionUpdateData: any = {};
      
      // 基本字段
      if (validatedData.title !== undefined) solutionUpdateData.title = validatedData.title;
      if (validatedData.description !== undefined) solutionUpdateData.description = validatedData.description;
      if (validatedData.category !== undefined) solutionUpdateData.category = validatedData.category;
      if (validatedData.price !== undefined) solutionUpdateData.price = validatedData.price;
      if (validatedData.tags !== undefined) solutionUpdateData.tags = validatedData.tags;
      if (validatedData.features !== undefined) solutionUpdateData.features = validatedData.features;
      if (validatedData.images !== undefined) solutionUpdateData.images = validatedData.images;
      
      // 处理 specs（合并现有数据）
      if (validatedData.specs !== undefined) {
        const currentSpecs = typeof solution.specs === 'string' 
          ? JSON.parse(solution.specs) 
          : (solution.specs || {});
        solutionUpdateData.specs = { ...currentSpecs, ...validatedData.specs };
      }
      
      // 处理 useCases（转换为对象格式）
      if (validatedData.useCases !== undefined) {
        const currentSpecs = solutionUpdateData.specs || (typeof solution.specs === 'string' ? JSON.parse(solution.specs) : solution.specs || {});
        if (Array.isArray(validatedData.useCases)) {
          solutionUpdateData.specs = {
            ...currentSpecs,
            useCases: validatedData.useCases.reduce((acc: any, uc: any) => {
              if (uc && uc.title) acc[uc.title] = uc.description || '';
              return acc;
            }, {}),
          };
        } else {
          solutionUpdateData.specs = { ...currentSpecs, useCases: validatedData.useCases };
        }
      }
      
      // 处理 architecture（转换为对象格式）
      if (validatedData.architecture !== undefined) {
        const currentSpecs = solutionUpdateData.specs || (typeof solution.specs === 'string' ? JSON.parse(solution.specs) : solution.specs || {});
        if (Array.isArray(validatedData.architecture)) {
          solutionUpdateData.specs = {
            ...currentSpecs,
            architecture: validatedData.architecture.reduce((acc: any, arch: any) => {
              if (arch && arch.title) acc[arch.title] = arch.content || '';
              return acc;
            }, {}),
          };
        } else {
          solutionUpdateData.specs = { ...currentSpecs, architecture: validatedData.architecture };
        }
      }
      
      // 处理 BOM
      if (validatedData.bom !== undefined) {
        solutionUpdateData.bom = validatedData.bom;
      }
      
      // 处理 summary（存储在 specs 中）
      if (validatedData.summary !== undefined) {
        const currentSpecs = solutionUpdateData.specs || (typeof solution.specs === 'string' ? JSON.parse(solution.specs) : solution.specs || {});
        solutionUpdateData.specs = { ...currentSpecs, summary: validatedData.summary };
      }
      
      // 如果方案状态是 APPROVED，则更新为 READY_TO_PUBLISH
      const shouldUpdateStatus = solution.status === 'APPROVED';
      if (shouldUpdateStatus) {
        solutionUpdateData.status = 'READY_TO_PUBLISH';
      }
      
      // 更新方案基本信息（如果有需要更新的字段）
      let updatedSolution = solution;
      if (Object.keys(solutionUpdateData).length > 0) {
        updatedSolution = await tx.solution.update({
          where: { id },
          data: solutionUpdateData,
        });
      }

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
        status: result.solution.status,
        hasPublishing: true,
        optimizedAt: result.publishing.optimized_at?.toISOString(),
      },
    });

    const statusMessage = result.solution.status === 'READY_TO_PUBLISH' 
      ? '方案优化完成，已准备发布' 
      : '方案优化数据已保存';
    
    return createSuccessResponse(
      {
        id: result.solution.id,
        status: result.solution.status,
        optimizedAt: result.publishing.optimized_at?.toISOString(),
        solution: {
          id: result.solution.id,
          status: result.solution.status,
          title: result.solution.title,
        },
      },
      statusMessage
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

