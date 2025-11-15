import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, logAuditAction } from '@/lib/api-helpers';
import { bomItemsToJson, shouldDualWrite } from '@/lib/bom-dual-write';

interface RouteParams {
  params: {
    id: string;
  };
}

// BOM 项验证 schema（方案 B - 完整增强）
const bomItemSchema = z.object({
  // 基础信息
  name: z.string().min(1, '物料名称不能为空'),
  model: z.string().optional(),
  quantity: z.number().int().min(1, '数量必须大于0').default(1),
  unit: z.string().optional().default('个'),
  notes: z.string().optional(),

  // 价格和成本
  unitPrice: z.number().min(0, '单价不能为负数').optional(),

  // 供应商信息
  supplier: z.string().optional(),

  // 零件标识
  partNumber: z.string().optional(),
  manufacturer: z.string().optional(),

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
  ]).optional(),
  position: z.string().optional(),

  // 物理属性
  weight: z.number().min(0, '重量不能为负数').optional(),

  // 技术规格
  specifications: z.record(z.any()).optional(),

  // 关联商城商品
  productId: z.string().optional(),
});

const bomUpdateSchema = z.object({
  items: z.array(bomItemSchema).min(0, 'BOM 项列表不能为空'),
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

    // 验证输入数据
    const validatedData = bomUpdateSchema.parse(body);

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
    if (authResult.user.role !== 'CREATOR' && authResult.user.role !== 'ADMIN' && authResult.user.role !== 'SUPER_ADMIN') {
      return createErrorResponse('只有创作者可以管理 BOM', 403);
    }

    if (solution.creatorId !== solution.creator?.id && authResult.user.role !== 'ADMIN' && authResult.user.role !== 'SUPER_ADMIN') {
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

    // 使用事务：删除现有 BOM 项，批量创建新 BOM 项，并更新 JSON 字段（双写策略）
    const result = await prisma.$transaction(async (tx) => {
      // 删除现有 BOM 项
      await tx.solutionBomItem.deleteMany({
        where: { solutionId: id }
      });

      // 批量创建新 BOM 项（支持方案 B 的所有字段）
      const bomItems = await Promise.all(
        validatedData.items.map(item =>
          tx.solutionBomItem.create({
            data: {
              solutionId: id,
              // 基础信息
              name: item.name,
              model: item.model,
              quantity: item.quantity,
              unit: item.unit || '个',
              notes: item.notes,
              // 价格和成本
              unitPrice: item.unitPrice !== undefined ? item.unitPrice : null,
              // 供应商信息
              supplier: item.supplier,
              // 零件标识
              partNumber: item.partNumber,
              manufacturer: item.manufacturer,
              // 分类和位置
              category: item.category,
              position: item.position,
              // 物理属性
              weight: item.weight !== undefined ? item.weight : null,
              // 技术规格
              specifications: item.specifications ? item.specifications : null,
              // 关联商城商品
              productId: item.productId || null,
            }
          })
        )
      );

      // 双写策略：同时更新 Solution.bom JSON 字段（如果启用）
      if (shouldDualWrite()) {
        const bomJson = bomItemsToJson(bomItems);
        await tx.solution.update({
          where: { id },
          data: {
            bom: bomJson,
          },
        });
      }

      return bomItems;
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_BOM_UPDATED',
      resource: 'solution',
      resourceId: id,
      newValue: {
        itemCount: result.length,
        items: result.map(item => ({
          name: item.name,
          quantity: item.quantity
        }))
      },
    });

    return createSuccessResponse(
      {
        items: result.map(item => ({
          id: item.id,
          // 基础信息
          name: item.name,
          model: item.model,
          quantity: item.quantity,
          unit: (item as any).unit || '个',
          notes: item.notes,
          // 价格和成本
          unitPrice: (item as any).unitPrice ? Number((item as any).unitPrice) : null,
          // 供应商信息
          supplier: (item as any).supplier || null,
          // 零件标识
          partNumber: (item as any).partNumber || null,
          manufacturer: (item as any).manufacturer || null,
          // 分类和位置
          category: (item as any).category || null,
          position: (item as any).position || null,
          // 物理属性
          weight: (item as any).weight ? Number((item as any).weight) : null,
          // 技术规格
          specifications: (item as any).specifications || null,
          // 关联商城商品
          productId: item.productId,
          createdAt: item.createdAt.toISOString()
        }))
      },
      'BOM 清单更新成功'
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
      select: { id: true, status: true, creatorId: true }
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
      const isCreator = solution.creatorId && authResult.user.role === 'CREATOR';
      const isAdmin = authResult.user.role === 'ADMIN' || authResult.user.role === 'SUPER_ADMIN';
      
      if (!isPublicAccess && !isCreator && !isAdmin && solution.status !== 'PUBLISHED') {
        return createErrorResponse('无权访问此方案的 BOM', 403);
      }
    }

    // 获取 BOM 项（优先使用 SolutionBomItem，fallback 到 JSON）
    let bomItems = await prisma.solutionBomItem.findMany({
      where: { solutionId: id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Fallback：如果没有 BOM 项记录，尝试从 JSON 字段读取
    if (bomItems.length === 0) {
      const solution = await prisma.solution.findUnique({
        where: { id },
        select: { bom: true }
      });

      if (solution?.bom) {
        // 解析 JSON BOM 数据
        const bomJson = solution.bom as any;
        if (bomJson.components && Array.isArray(bomJson.components)) {
          bomItems = bomJson.components.map((item: any, index: number) => ({
            id: `json-${index}`,
            solutionId: id,
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
            createdAt: new Date(),
            product: null,
          })) as any;
        }
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
          unit: (item as any).unit || '个',
          notes: item.notes,
          // 价格和成本
          unitPrice: (item as any).unitPrice ? Number((item as any).unitPrice) : null,
          // 供应商信息
          supplier: (item as any).supplier || null,
          // 零件标识
          partNumber: (item as any).partNumber || null,
          manufacturer: (item as any).manufacturer || null,
          // 分类和位置
          category: (item as any).category || null,
          position: (item as any).position || null,
          // 物理属性
          weight: (item as any).weight ? Number((item as any).weight) : null,
          // 技术规格
          specifications: (item as any).specifications || null,
          // 关联商城商品
          productId: item.productId,
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            price: Number(item.product.price),
            images: item.product.images
          } : null,
          createdAt: item.createdAt.toISOString()
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

