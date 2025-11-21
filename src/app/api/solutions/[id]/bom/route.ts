import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, logAuditAction } from '@/lib/api-helpers';
import { bomItemsToJson } from '@/lib/bom-dual-write';

interface RouteParams {
  params: {
    id: string;
  };
}

// BOM 项验证 schema（方案 B - 完整增强）
const bomItemSchema = z.object({
  // 基础信息
  name: z.string().min(1, '物料名称不能为空'),
  model: z.string().optional().nullable(),
  quantity: z.number().int().min(1, '数量必须大于0').default(1),
  unit: z.string().optional().default('个').nullable(),
  notes: z.string().optional().nullable(),

  // 价格和成本
  unitPrice: z.number().min(0, '单价不能为负数').optional().nullable(),

  // 供应商信息
  supplier: z.string().optional().nullable(),

  // 零件标识
  partNumber: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),

  // 分类和位置
  category: z.enum([
    'FRAME',
    'MOTOR',
    'ESC',
    'PROPELLER',
    'FLIGHT_CONTROLLER',
    'BATTERY',
    'CAMERA',
    'GIMBAL',
    'RECEIVER',
    'TRANSMITTER',
    'OTHER'
  ]).optional().nullable(),
  position: z.string().optional().nullable(),

  // 物理属性
  weight: z.number().min(0, '重量不能为负数').optional().nullable(),

  // 技术规格
  specifications: z.record(z.any()).optional().nullable(),

  // 关联商城商品
  productId: z.string().optional().nullable(),
});

const bomUpdateSchema = z.object({
  items: z.array(bomItemSchema),
});

// PUT /api/solutions/[id]/bom - 更新方案的 BOM 清单
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || createErrorResponse('未授权访问', 401);
    }

    const { id } = params;
    const body = await request.json();

    // 验证输入数据（允许空数组，用于草稿保存）
    let validatedData;
    try {
      validatedData = bomUpdateSchema.parse(body);
    } catch (error) {
      console.error('BOM 验证失败:', error);
      if (error instanceof z.ZodError) {
        return createValidationErrorResponse(error);
      }
      throw error;
    }

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
      return createErrorResponse('只有创作者可以管理 BOM', 403);
    }

    // 获取当前用户的 CreatorProfile
    const currentUserCreatorProfile = await prisma.creatorProfile.findUnique({
      where: { user_id: authResult.user.id },
      select: { id: true },
    });

    const solutionCreatorId = (solution as any).creator_id || solution.creator?.id;
    const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    
    if (!isAdmin && (!currentUserCreatorProfile || solutionCreatorId !== currentUserCreatorProfile.id)) {
      return createErrorResponse('无权修改此方案的 BOM', 403);
    }

    // 验证方案状态允许编辑（DRAFT 或 REJECTED）
    if (solution.status !== 'DRAFT' && solution.status !== 'REJECTED') {
      return createErrorResponse('只有草稿或已驳回的方案可以编辑 BOM', 400);
    }

    // 验证 productId 引用（如果提供）
    if (validatedData.items.some(item => item.productId)) {
      const productIds = validatedData.items
        .map(item => item.productId)
        .filter((id): id is string => !!id);
      
      if (productIds.length > 0) {
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } }
        });
        
        if (products.length !== productIds.length) {
          return createErrorResponse('部分商品ID无效', 400);
        }
      }
    }

    // 将 BOM 项转换为 JSON 格式并更新到 Solution.bom 字段
    const bomJson = validatedData.items.length > 0 
      ? bomItemsToJson(validatedData.items)
      : null; // 空数组时设置为 null

    // 更新 Solution.bom JSON 字段
    await prisma.solution.update({
      where: { id },
      data: {
        bom: bomJson,
      },
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_BOM_UPDATED',
      resource: 'solution',
      resourceId: id,
      newValue: {
        itemCount: validatedData.items.length,
        items: validatedData.items.map(item => ({
          name: item.name,
          quantity: item.quantity
        }))
      },
    });

    return createSuccessResponse(
      {
        items: validatedData.items.map((item, index) => ({
          id: `bom-${index}`, // 临时 ID，因为存储在 JSON 中
          // 基础信息
          name: item.name,
          model: item.model || null,
          quantity: item.quantity,
          unit: item.unit || '个',
          notes: item.notes || null,
          // 价格和成本
          unitPrice: item.unitPrice !== null && item.unitPrice !== undefined ? Number(item.unitPrice) : null,
          // 供应商信息
          supplier: item.supplier || null,
          // 零件标识
          partNumber: item.partNumber || null,
          manufacturer: item.manufacturer || null,
          // 分类和位置
          category: item.category || null,
          position: item.position || null,
          // 物理属性
          weight: item.weight !== null && item.weight !== undefined ? Number(item.weight) : null,
          // 技术规格
          specifications: item.specifications || null,
          // 关联商城商品
          productId: item.productId || null,
          createdAt: new Date().toISOString()
        }))
      },
      validatedData.items.length > 0 ? 'BOM 清单更新成功' : 'BOM 清单已清空（草稿保存）'
    );
  } catch (error) {
    console.error('更新 BOM 清单失败:', error);
    
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }
    
    return createErrorResponse(
      error instanceof Error ? error : new Error('更新 BOM 清单失败'),
      500
    );
  }
}

// GET /api/solutions/[id]/bom - 获取方案的 BOM 清单
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // 获取方案（验证存在性）
    const solution = await prisma.solution.findUnique({
      where: { id },
      select: { id: true, status: true, creator_id: true, bom: true }
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    // 验证权限：公共访问时仅允许查看 PUBLISHED 方案
    const authResult = await authenticateRequest(request);
    const isPublicAccess = !authResult.success || !authResult.user;
    
    if (isPublicAccess && solution.status !== 'PUBLISHED') {
      return createErrorResponse('无权访问此方案的 BOM', 403);
    }

    // CREATOR 可访问自己创建的所有方案
    if (authResult.success && authResult.user) {
      const userRoles = Array.isArray(authResult.user?.roles) 
        ? authResult.user.roles 
        : (authResult.user?.role ? [authResult.user.role] : []);
      
      const solutionCreatorId = (solution as any).creator_id;
      const currentUserCreatorProfile = await prisma.creatorProfile.findUnique({
        where: { user_id: authResult.user.id },
        select: { id: true },
      });
      const isCreator = solutionCreatorId && currentUserCreatorProfile && solutionCreatorId === currentUserCreatorProfile.id && userRoles.includes('CREATOR');
      const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
      
      if (!isPublicAccess && !isCreator && !isAdmin && solution.status !== 'PUBLISHED') {
        return createErrorResponse('无权访问此方案的 BOM', 403);
      }
    }

    // 从 JSON 字段读取 BOM 数据
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
          unitPrice: item.unitPrice !== undefined ? item.unitPrice : null,
          supplier: item.supplier || null,
          partNumber: item.partNumber || null,
          manufacturer: item.manufacturer || null,
          category: item.category || null,
          position: item.position || null,
          weight: item.weight !== undefined ? item.weight : null,
          specifications: item.specifications || null,
          productId: item.productId || null,
          product: null, // 如果需要产品信息，可以单独查询
        }));
      } else if (Array.isArray(bomJson)) {
        // 兼容旧格式（直接是数组）
        bomItems = bomJson.map((item: any, index: number) => ({
          id: `bom-${index}`,
          name: item.name || '未知物料',
          model: item.model || null,
          quantity: item.quantity || 1,
          unit: item.unit || '个',
          notes: item.notes || null,
          unitPrice: item.unitPrice !== undefined ? item.unitPrice : null,
          supplier: item.supplier || null,
          partNumber: item.partNumber || null,
          manufacturer: item.manufacturer || null,
          category: item.category || null,
          position: item.position || null,
          weight: item.weight !== undefined ? item.weight : null,
          specifications: item.specifications || null,
          productId: item.productId || null,
          product: null,
        }));
      }
    }

    return createSuccessResponse(
      {
        items: bomItems.map(item => ({
          id: item.id,
          // 基础信息
          name: item.name,
          model: item.model,
          quantity: item.quantity,
          unit: item.unit || '个',
          notes: item.notes,
          // 价格和成本
          unitPrice: item.unitPrice !== null && item.unitPrice !== undefined ? Number(item.unitPrice) : null,
          // 供应商信息
          supplier: item.supplier || null,
          // 零件标识
          partNumber: item.partNumber || null,
          manufacturer: item.manufacturer || null,
          // 分类和位置
          category: item.category || null,
          position: item.position || null,
          // 物理属性
          weight: item.weight !== null && item.weight !== undefined ? Number(item.weight) : null,
          // 技术规格
          specifications: item.specifications || null,
          // 关联商城商品
          productId: item.productId || null,
          product: item.product || null,
          createdAt: new Date().toISOString()
        }))
      },
      '获取 BOM 清单成功'
    );
  } catch (error) {
    console.error('获取 BOM 清单失败:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('获取 BOM 清单失败'),
      500
    );
  }
}
