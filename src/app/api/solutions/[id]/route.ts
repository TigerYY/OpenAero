import { NextRequest } from 'next/server';

import { solutionService } from '@/backend/solution/solution.service';
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
            userProfile: true
          }
        },
        files: true,
        assets: true,
        bomItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true
              }
            }
          }
        },
        solutionReviews: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            solutionReviews: true,
            orders: true,
            assets: true,
            bomItems: true
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
        const solutionCreatorId = (solution as any).creatorId;
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
          }
        } else if (solution.status !== 'PUBLISHED') {
          // 方案没有 creatorId，且状态不是 PUBLISHED，则拒绝访问
          return createErrorResponse('无权访问此方案', 403);
        }
      }
      // ADMIN/REVIEWER 可以访问所有方案（无需额外检查）
    }

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
      createdAt: solution.createdAt,
      updatedAt: solution.updatedAt,
      creatorId: (solution as any).creatorId,
      creatorName: (solution as any).creator?.userProfile ? 
        ((solution as any).creator.userProfile.display_name || 
         `${(solution as any).creator.userProfile.first_name ?? ''} ${(solution as any).creator.userProfile.last_name ?? ''}`.trim() || 
         'Unknown') : 'Unknown',
      reviewCount: (solution as any)._count?.solutionReviews || 0,
      downloadCount: (solution as any)._count?.orders || 0,
      assetCount: (solution as any)._count?.assets || 0,
      bomItemCount: (solution as any)._count?.bomItems || 0,
      specs: (solution as any).technicalSpecs || solution.specs || {},
      bom: solution.bom || [],
      files: (solution as any).files || [],
      assets: ((solution as any).assets || []).map((asset: any) => ({
        id: asset.id,
        type: asset.type,
        url: asset.url,
        title: asset.title,
        description: asset.description
      })),
      bomItems: ((solution as any).bomItems || []).map((item: any) => ({
        id: item.id,
        // 基础信息
        name: item.name,
        model: item.model,
        quantity: item.quantity,
        unit: item.unit || '个',
        notes: item.notes,
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
        productId: item.productId,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          price: Number(item.product.price)
        } : null
      })),
      reviews: ((solution as any).solutionReviews || []).map((review: any) => ({
        id: review.id,
        fromStatus: review.fromStatus,
        toStatus: review.toStatus,
        status: review.status,
        decision: review.decision,
        comments: review.comments,
        reviewedAt: review.reviewedAt?.toISOString() || null
      }))
    }, '获取方案详情成功');
  } catch (error) {
    console.error('获取方案详情失败:', error);
    return createErrorResponse('获取方案详情失败', 500);
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
            userProfile: true
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

    if ((oldSolution as any).creatorId !== (oldSolution as any).creator?.id && !isAdmin) {
      return createErrorResponse('无权修改此方案', 403);
    }

    // 验证方案状态允许编辑（DRAFT 或 REJECTED）
    if (oldSolution.status !== 'DRAFT' && oldSolution.status !== 'REJECTED') {
      return createErrorResponse('只有草稿或已驳回的方案可以编辑', 400);
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
    if (validatedData.specs !== undefined) {
      updateData.specs = typeof validatedData.specs === 'string' ? validatedData.specs : JSON.stringify(validatedData.specs);
      updateData.technicalSpecs = typeof validatedData.specs === 'string' ? JSON.parse(validatedData.specs) : validatedData.specs;
    }
    if (validatedData.bom !== undefined) {
      updateData.bom = typeof validatedData.bom === 'string' ? validatedData.bom : JSON.stringify(validatedData.bom);
    }

    // 使用 solutionService 更新（保持兼容性）
    const solution = await solutionService.updateSolution(id, validatedData, authResult.user.id);
    
    // 重新获取完整数据（包含 creator）
    const updatedSolution = await prisma.solution.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            userProfile: true
          }
        }
      } as any
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_UPDATED',
      resource: 'solution',
      resourceId: solution.id,
      oldValue: oldSolution ? {
        title: oldSolution.title,
        category: oldSolution.category,
        price: oldSolution.price,
        status: oldSolution.status,
      } : undefined,
      newValue: {
        title: solution.title,
        category: solution.category,
        price: solution.price,
        status: solution.status,
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
      createdAt: updatedSolution.createdAt,
      updatedAt: updatedSolution.updatedAt,
      creatorId: (updatedSolution as any).creatorId,
      creatorName: (updatedSolution as any).creator?.userProfile ? 
        ((updatedSolution as any).creator.userProfile.display_name || 
         `${(updatedSolution as any).creator.userProfile.first_name ?? ''} ${(updatedSolution as any).creator.userProfile.last_name ?? ''}`.trim() || 
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