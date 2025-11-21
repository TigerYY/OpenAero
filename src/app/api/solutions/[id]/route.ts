import { NextRequest } from 'next/server';

import { createErrorResponse, createSuccessResponse, logAuditAction } from '@/lib/api-helpers';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { updateSolutionSchema } from '@/lib/validations';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/solutions/[id] - 获取单个方案详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // 验证用户身份（可选）
    const authResult = await authenticateRequest(request);
    const isAuthenticated = authResult.success && authResult.user;
    
    // 获取用户角色（支持多角色）
    let userRoles: string[] = [];
    if (isAuthenticated && authResult.user) {
      // 从 userProfile 获取角色（如果可用）
      const userProfile = (authResult.user as any).profile;
      if (userProfile) {
        userRoles = Array.isArray(userProfile.roles) 
          ? userProfile.roles 
          : (userProfile.role ? [userProfile.role] : []);
      } else {
        // 回退到单一角色
        userRoles = (authResult.user as any).role ? [(authResult.user as any).role] : [];
      }
    }
    
    const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    const isReviewer = userRoles.includes('REVIEWER') || isAdmin;
    const isCreator = userRoles.includes('CREATOR') || isAdmin;

    const solution = await prisma.solution.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            user: true
          }
        },
        files: true,
        publishing: true, // 包含发布优化数据
        solutionReviews: {
          orderBy: { created_at: 'desc' },
          take: 10
        },
        _count: {
          select: {
            solutionReviews: true,
            orderSolutions: true,
            files: true
          }
        }
      } as any
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    // **新增**：权限控制
    // 公共访问时仅允许访问 PUBLISHED 方案
    if (!isAuthenticated || (!isAdmin && !isReviewer && !isCreator)) {
      if (solution.status !== 'PUBLISHED') {
        return createErrorResponse('方案不存在或未发布', 404);
      }
    } else {
      // **新增**：CREATOR 可访问自己创建的所有方案
      if (isCreator && !isAdmin && !isReviewer) {
        const solutionCreatorId = (solution as any).creator_id || (solution as any).creatorId;
        if (solutionCreatorId) {
          // 获取当前用户的 CreatorProfile
          const creatorProfile = await prisma.creatorProfile.findUnique({
            where: { user_id: authResult.user!.id },
            select: { id: true }
          });
          
          if (creatorProfile && creatorProfile.id !== solutionCreatorId) {
            // 不是自己的方案，且状态不是 PUBLISHED，则拒绝访问
            if (solution.status !== 'PUBLISHED') {
              return createErrorResponse('无权访问此方案', 403);
            }
          } else if (!creatorProfile) {
            // 用户没有 CreatorProfile，拒绝访问非公开方案
            if (solution.status !== 'PUBLISHED') {
              return createErrorResponse('无权访问此方案', 403);
            }
          }
        } else if (solution.status !== 'PUBLISHED') {
          // 方案没有 creatorId，且状态不是 PUBLISHED，则拒绝访问
          return createErrorResponse('无权访问此方案', 403);
        }
      }
      // ADMIN/REVIEWER 可以访问所有方案（无需额外检查）
    }

    // 合并 Solution 和 SolutionPublishing 数据
    const publishing = (solution as any).publishing;
    
    return createSuccessResponse({
      id: solution.id,
      title: solution.title,
      description: solution.description,
      category: solution.category,
      status: solution.status,
      price: Number(solution.price),
      version: solution.version,
      tags: solution.features || [],
      images: solution.images || [],
      createdAt: (solution as any).created_at || solution.createdAt,
      updatedAt: (solution as any).updated_at || solution.updatedAt,
      creatorId: (solution as any).creator_id || (solution as any).creatorId,
      creatorName: (solution as any).creator?.user ? 
        ((solution as any).creator.user.display_name || 
         `${(solution as any).creator.user.first_name ?? ''} ${(solution as any).creator.user.last_name ?? ''}`.trim() || 
         'Unknown') : 'Unknown',
      reviewCount: (solution as any)._count?.solutionReviews || 0,
      downloadCount: publishing?.download_count || (solution as any)._count?.orderSolutions || 0,
      assetCount: (solution as any)._count?.files || 0,
      specs: (solution as any).technicalSpecs || solution.specs || {},
      // 发布优化数据（优先使用 SolutionPublishing，如果不存在则使用 Solution 默认值）
      publishDescription: publishing?.publish_description || null,
      mediaLinks: publishing?.media_links || [],
      productLinks: publishing?.product_links || [],
      metaTitle: publishing?.meta_title || solution.title,
      metaDescription: publishing?.meta_description || solution.description.substring(0, 200),
      metaKeywords: publishing?.meta_keywords || solution.features || [],
      featuredTags: publishing?.featured_tags || [],
      featuredOrder: publishing?.featured_order || null,
      isFeatured: publishing?.is_featured || false,
      viewCount: publishing?.view_count || 0,
      likeCount: publishing?.like_count || 0,
      // 解析 BOM JSON 字段
      bom: (() => {
        try {
          if (!solution.bom) return [];
          if (typeof solution.bom === 'string') {
            return JSON.parse(solution.bom);
          }
          return Array.isArray(solution.bom) ? solution.bom : [];
        } catch (error) {
          console.error('解析 BOM 数据失败:', error);
          return [];
        }
      })(),
      files: ((solution as any).files || []).map((file: any) => ({
        id: file.id,
        type: file.file_type || file.type,
        url: file.url,
        title: file.original_name || file.filename || file.title,
        description: file.description,
        filename: file.filename,
        originalName: file.original_name,
      })),
      assets: ((solution as any).files || []).map((file: any) => ({
        id: file.id,
        type: file.file_type || file.type,
        url: file.url,
        title: file.original_name || file.filename || file.title,
        description: file.description
      })),
      // 计算 BOM 项目数量
      bomItemCount: (() => {
        try {
          if (!solution.bom) return 0;
          const bomData = typeof solution.bom === 'string' 
            ? JSON.parse(solution.bom) 
            : solution.bom;
          return Array.isArray(bomData) ? bomData.length : 0;
        } catch (error) {
          return 0;
        }
      })(),
      // bomItems 从 bom JSON 字段中解析
      bomItems: (() => {
        try {
          if (!solution.bom) return [];
          const bomData = typeof solution.bom === 'string' 
            ? JSON.parse(solution.bom) 
            : solution.bom;
          if (!Array.isArray(bomData)) return [];
          return bomData.map((item: any, index: number) => ({
            id: item.id || `bom-item-${index}`,
            // 基础信息
            name: item.name || '',
            model: item.model || null,
            quantity: item.quantity || 1,
            unit: item.unit || '个',
            notes: item.notes || null,
            // 价格和成本
            unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
            // 供应商信息
            supplier: item.supplier || null,
            // 零件标识
            partNumber: item.partNumber || null,
            manufacturer: item.manufacturer || null,
            // 分类和位置
            category: item.category || null,
            position: item.position || null,
            // 物理属性
            weight: item.weight ? Number(item.weight) : null,
            // 技术规格
            specifications: item.specifications || null,
            // 关联商城商品
            productId: item.productId || null,
            product: null // BOM JSON 中不包含 product 关系数据
          }));
        } catch (error) {
          console.error('解析 BOM Items 失败:', error);
          return [];
        }
      })(),
      reviews: ((solution as any).solutionReviews || []).map((review: any) => ({
        id: review.id,
        fromStatus: review.from_status || review.fromStatus,
        toStatus: review.to_status || review.toStatus,
        status: review.status,
        decision: review.decision,
        comments: review.comments,
        reviewedAt: (review.reviewed_at || review.reviewedAt)?.toISOString() || null
      }))
    }, '获取方案详情成功');
  } catch (error) {
    console.error('获取方案详情失败:', error);
    const errorMessage = error instanceof Error ? error.message : '获取方案详情失败';
    const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : undefined;
    return createErrorResponse(errorMessage, 500, errorDetails);
  }
}

// PUT /api/solutions/[id] - 更新方案
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { id } = params;
    const body = await request.json();
    
    // 获取方案（验证存在性和权限）
    const oldSolution = await prisma.solution.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            user: true
          }
        }
      } as any
    });

    if (!oldSolution) {
      return createErrorResponse('方案不存在', 404);
    }

    // 使用 roles 数组进行权限检查
    const userRoles = authResult.user.roles || [];
    const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    const isCreator = userRoles.includes('CREATOR') || isAdmin;

    // 验证用户为 CREATOR 且为方案所有者
    if (!isCreator) {
      return createErrorResponse('只有创作者可以更新方案', 403);
    }

    const solutionCreatorId = (oldSolution as any).creator_id || (oldSolution as any).creatorId;
    const creatorRelationId = (oldSolution as any).creator?.id;
    
    // 获取当前用户的 CreatorProfile
    const { ensureCreatorProfile } = await import('@/lib/creator-profile-utils');
    const creatorProfile = await ensureCreatorProfile(authResult.user.id);
    
    if (!creatorProfile) {
      return createErrorResponse('创作者档案不存在', 404);
    }

    // 验证方案所有者：比较方案的 creator_id 和当前用户的 CreatorProfile.id
    if (solutionCreatorId !== creatorProfile.id && !isAdmin) {
      return createErrorResponse('无权修改此方案', 403);
    }

    // 验证方案状态允许编辑（DRAFT、REJECTED 或 PENDING_REVIEW）
    // 注意：PENDING_REVIEW 状态可能包含 NEEDS_REVISION 的方案，允许编辑
    if (oldSolution.status !== 'DRAFT' && 
        oldSolution.status !== 'REJECTED' && 
        oldSolution.status !== 'PENDING_REVIEW') {
      return createErrorResponse('只有草稿、已驳回或需修改状态的方案可以编辑', 400);
    }
    
    // 验证输入数据
    const validatedData = updateSolutionSchema.parse(body);

    // 构建更新数据（只更新提供的字段）
    const updateData: any = {};
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.price !== undefined) updateData.price = validatedData.price;
    if (validatedData.features !== undefined) updateData.features = validatedData.features;
    if (validatedData.images !== undefined) updateData.images = validatedData.images;
    let parsedSpecsInput: Record<string, any> | undefined;
    if (validatedData.specs !== undefined) {
      parsedSpecsInput =
        typeof validatedData.specs === 'string'
          ? JSON.parse(validatedData.specs)
          : validatedData.specs || {};
    }

    // 合并 specs（summary、technicalSpecs、useCases、architecture 等都存储在 specs JSON 中）
    const currentSpecs =
      typeof oldSolution.specs === 'string'
        ? JSON.parse(oldSolution.specs)
        : oldSolution.specs || {};

    let specsUpdated = false;
    let mergedSpecs = { ...currentSpecs };

    if (parsedSpecsInput !== undefined) {
      mergedSpecs = { ...mergedSpecs, ...parsedSpecsInput };
      specsUpdated = true;
    }

    if (validatedData.technicalSpecs !== undefined) {
      mergedSpecs = { ...mergedSpecs, technicalSpecs: validatedData.technicalSpecs };
      specsUpdated = true;
    }

    if (validatedData.useCases !== undefined) {
      mergedSpecs = { ...mergedSpecs, useCases: validatedData.useCases };
      specsUpdated = true;
    }

    if (validatedData.architecture !== undefined) {
      mergedSpecs = { ...mergedSpecs, architecture: validatedData.architecture };
      specsUpdated = true;
    }

    if (validatedData.summary !== undefined) {
      mergedSpecs = { ...mergedSpecs, summary: validatedData.summary };
      specsUpdated = true;
    }

    if (specsUpdated) {
      updateData.specs = mergedSpecs;
    }

    // 处理 BOM
    let bomPayload = oldSolution.bom;
    if (validatedData.bom !== undefined) {
      if (typeof validatedData.bom === 'string') {
        try {
          bomPayload = JSON.parse(validatedData.bom);
        } catch (error) {
          console.warn('解析 BOM 失败，使用原始值:', error);
          bomPayload = validatedData.bom;
        }
      } else {
        bomPayload = validatedData.bom;
      }
    }

    // 更新方案（直接使用 Prisma，避免旧版 service 带来的字段差异）
    const updatedSolution = await prisma.solution.update({
      where: { id },
      data: {
        ...updateData,
        ...(specsUpdated ? { specs: mergedSpecs } : {}),
        ...(validatedData.bom !== undefined ? { bom: bomPayload } : {}),
        updated_at: new Date(),
      },
      include: {
        creator: {
          include: {
            user: true,
          },
        },
      } as any,
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_UPDATED',
      resource: 'solution',
      resourceId: updatedSolution.id,
      oldValue: oldSolution
        ? {
            title: oldSolution.title,
            category: oldSolution.category,
            price: oldSolution.price,
            status: oldSolution.status,
          }
        : undefined,
      newValue: {
        title: updatedSolution.title,
        category: updatedSolution.category,
        price: updatedSolution.price,
        status: updatedSolution.status,
      },
    });

    if (!updatedSolution) {
      return createErrorResponse('方案更新后未找到', 500);
    }

    return createSuccessResponse({
      id: updatedSolution.id,
      title: updatedSolution.title,
      description: updatedSolution.description,
      category: updatedSolution.category,
      status: updatedSolution.status,
      price: updatedSolution.price,
      version: updatedSolution.version,
      tags: (updatedSolution as any).tags || updatedSolution.features || [],
      images: updatedSolution.images || [],
      createdAt: (updatedSolution as any).created_at || updatedSolution.createdAt,
      updatedAt: (updatedSolution as any).updated_at || updatedSolution.updatedAt,
      creatorId: (updatedSolution as any).creator_id || (updatedSolution as any).creatorId,
      creatorName: (updatedSolution as any).creator?.user ? 
        ((updatedSolution as any).creator.user.display_name || 
         `${(updatedSolution as any).creator.user.first_name ?? ''} ${(updatedSolution as any).creator.user.last_name ?? ''}`.trim() || 
         'Unknown') : 'Unknown',
      specs: (updatedSolution as any).technicalSpecs || updatedSolution.specs || {},
      bom: updatedSolution.bom || []
    }, '更新方案成功');
  } catch (error: any) {
    console.error('更新方案失败:', error);
    return createErrorResponse(error.message || '更新方案失败', error.statusCode || 500);
  }
}

// DELETE /api/solutions/[id] - 删除方案
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { id } = params;

    // 获取旧值用于审计日志
    const oldSolution = await prisma.solution.findUnique({ where: { id } });
    if (!oldSolution) {
      return createErrorResponse('方案不存在', 404);
    }

    await solutionService.deleteSolution(id, authResult.user.id);

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_DELETED',
      resource: 'solution',
      resourceId: id,
      oldValue: {
        title: oldSolution.title,
        category: oldSolution.category,
        price: oldSolution.price,
        status: oldSolution.status,
      },
    });

    return createSuccessResponse(null, '删除方案成功');
  } catch (error: any) {
    console.error('删除方案失败:', error);
    return createErrorResponse(error.message || '删除方案失败', error.statusCode || 500);
  }
}