import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, logAuditAction } from '@/lib/api-helpers';
import { AssetType } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// 资产验证 schema
const assetSchema = z.object({
  type: z.nativeEnum(AssetType),
  url: z.string().url('URL 格式不正确'),
  title: z.string().optional(),
  description: z.string().optional(),
});

const assetCreateSchema = z.object({
  assets: z.array(assetSchema).min(1, '至少需要一个资产'),
});

// POST /api/solutions/[id]/assets - 添加方案资产
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || createErrorResponse('未授权访问', 401);
    }

    const { id } = params;
    const body = await request.json();

    // 验证输入数据
    const validatedData = assetCreateSchema.parse(body);

    // 获取方案
    const solution = await prisma.solution.findUnique({
      where: { id },
      include: {
        creator: true
      }
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    // 验证用户为 CREATOR 且为方案所有者
    const userRoles = Array.isArray(authResult.user?.roles) 
      ? authResult.user.roles 
      : (authResult.user?.role ? [authResult.user.role] : []);
    
    if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('只有创作者可以管理资产', 403);
    }

    if (solution.creatorId !== solution.creator?.id && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('无权修改此方案的资产', 403);
    }

    // 验证方案状态允许编辑（DRAFT 或 REJECTED）
    if (solution.status !== 'DRAFT' && solution.status !== 'REJECTED') {
      return createErrorResponse('只有草稿或已驳回的方案可以编辑资产', 400);
    }

    // 批量创建资产
    const assets = await Promise.all(
      validatedData.assets.map(asset =>
        prisma.solutionAsset.create({
          data: {
            solutionId: id,
            type: asset.type,
            url: asset.url,
            title: asset.title,
            description: asset.description,
          }
        })
      )
    );

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_ASSETS_ADDED',
      resource: 'solution',
      resourceId: id,
      newValue: {
        assetCount: assets.length,
        assets: assets.map(asset => ({
          type: asset.type,
          url: asset.url
        }))
      },
    });

    return createSuccessResponse(
      {
        assets: assets.map(asset => ({
          id: asset.id,
          type: asset.type,
          url: asset.url,
          title: asset.title,
          description: asset.description,
          createdAt: asset.createdAt.toISOString()
        }))
      },
      '资产添加成功'
    );
  } catch (error) {
    console.error('添加资产失败:', error);
    
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }
    
    return createErrorResponse(
      error instanceof Error ? error : new Error('添加资产失败'),
      500
    );
  }
}

// GET /api/solutions/[id]/assets - 获取方案的资产列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // 获取方案（验证存在性）
    const solution = await prisma.solution.findUnique({
      where: { id },
      select: { id: true, status: true, creatorId: true }
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    // 验证权限：公共访问时仅允许查看 PUBLISHED 方案
    const authResult = await authenticateRequest(request);
    const isPublicAccess = !authResult.success || !authResult.user;
    
    if (isPublicAccess && solution.status !== 'PUBLISHED') {
      return createErrorResponse('无权访问此方案的资产', 403);
    }

    // CREATOR 可访问自己创建的所有方案
    if (authResult.success && authResult.user) {
      const userRoles = Array.isArray(authResult.user?.roles) 
        ? authResult.user.roles 
        : (authResult.user?.role ? [authResult.user.role] : []);
      
      const isCreator = solution.creatorId && userRoles.includes('CREATOR');
      const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
      
      if (!isPublicAccess && !isCreator && !isAdmin && solution.status !== 'PUBLISHED') {
        return createErrorResponse('无权访问此方案的资产', 403);
      }
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as AssetType | null;

    // 构建查询条件
    const where: any = { solutionId: id };
    if (type && Object.values(AssetType).includes(type)) {
      where.type = type;
    }

    // 获取资产列表
    const assets = await prisma.solutionAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return createSuccessResponse(
      {
        assets: assets.map(asset => ({
          id: asset.id,
          type: asset.type,
          url: asset.url,
          title: asset.title,
          description: asset.description,
          createdAt: asset.createdAt.toISOString()
        }))
      },
      '获取资产列表成功'
    );
  } catch (error) {
    console.error('获取资产列表失败:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('获取资产列表失败'),
      500
    );
  }
}

// DELETE /api/solutions/[id]/assets - 删除方案资产
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || createErrorResponse('未授权访问', 401);
    }

    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const assetId = searchParams.get('assetId');

    if (!assetId) {
      return createErrorResponse('请指定要删除的资产ID', 400);
    }

    // 获取资产
    const asset = await prisma.solutionAsset.findUnique({
      where: { id: assetId },
      include: {
        solution: {
          include: {
            creator: true
          }
        }
      }
    });

    if (!asset || asset.solutionId !== id) {
      return createErrorResponse('资产不存在或不属于此方案', 404);
    }

    // 验证用户为 CREATOR 且为方案所有者
    const userRoles = Array.isArray(authResult.user?.roles) 
      ? authResult.user.roles 
      : (authResult.user?.role ? [authResult.user.role] : []);
    
    if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('只有创作者可以删除资产', 403);
    }

    if (asset.solution.creatorId !== asset.solution.creator?.id && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('无权删除此方案的资产', 403);
    }

    // 验证方案状态允许编辑
    if (asset.solution.status !== 'DRAFT' && asset.solution.status !== 'REJECTED') {
      return createErrorResponse('只有草稿或已驳回的方案可以删除资产', 400);
    }

    // 删除资产
    await prisma.solutionAsset.delete({
      where: { id: assetId }
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_ASSET_DELETED',
      resource: 'solution',
      resourceId: id,
      oldValue: {
        assetId: asset.id,
        type: asset.type,
        url: asset.url
      },
    });

    return createSuccessResponse(null, '资产删除成功');
  } catch (error) {
    console.error('删除资产失败:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('删除资产失败'),
      500
    );
  }
}

