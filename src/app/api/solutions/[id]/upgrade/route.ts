import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, logAuditAction } from '@/lib/api-helpers';

interface RouteParams {
  params: {
    id: string;
  };
}

const upgradeSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  upgradeNotes: z.string().optional(),
  upgradeAssets: z.boolean().default(false),
  upgradeBom: z.boolean().default(false),
});

// POST /api/solutions/[id]/upgrade - 升级方案
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || createErrorResponse('未授权访问', 401);
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = upgradeSchema.parse(body);

    // 验证用户为 CREATOR 角色
    const userRoles = authResult.user.roles || [];
    const isCreator = userRoles.includes('CREATOR');
    const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');

    if (!isCreator && !isAdmin) {
      return createErrorResponse('只有创作者或管理员可以升级方案', 403);
    }

    // 获取源方案
    const sourceSolution = await prisma.solution.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            user: {
              select: {
                id: true,
              }
            }
          }
        },
        files: true,
      }
    });

    if (!sourceSolution) {
      return createErrorResponse('源方案不存在', 404);
    }

    // 验证权限：创作者只能升级自己的方案或已发布的方案，管理员可以升级任何方案
    const isOwner = sourceSolution.creator.user?.id === authResult.user.id;
    const isPublished = sourceSolution.status === 'PUBLISHED';

    if (!isAdmin && !isOwner && !isPublished) {
      return createErrorResponse('只能升级自己的方案或已发布的方案', 403);
    }

    // 检查升级频率限制（每天最多 5 次，仅对创作者限制）
    if (isCreator && !isAdmin) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const upgradeCount = await prisma.solution.count({
        where: {
          creator_id: sourceSolution.creator_id,
          is_upgrade: true,
          created_at: {
            gte: today,
            lt: tomorrow,
          }
        }
      });

      if (upgradeCount >= 5) {
        return createErrorResponse('每天最多只能升级 5 个方案，请明天再试', 429);
      }
    }

    // 确保用户有 CreatorProfile
    const { ensureCreatorProfile } = await import('@/lib/creator-profile-utils');
    const creatorProfile = await ensureCreatorProfile(authResult.user.id);

    if (!creatorProfile) {
      return createErrorResponse('创作者档案不存在，请先申请成为创作者', 404);
    }

    // 使用事务创建升级方案
    const upgradedSolution = await prisma.$transaction(async (tx) => {
      // 创建新方案（基于源方案）
      const newSolution = await tx.solution.create({
        data: {
          title: validatedData.title,
          description: sourceSolution.description,
          category: sourceSolution.category,
          price: sourceSolution.price,
          features: sourceSolution.features,
          images: sourceSolution.images,
          tags: sourceSolution.tags,
          locale: sourceSolution.locale,
          specs: sourceSolution.specs,
          bom: validatedData.upgradeBom ? sourceSolution.bom : null,
          status: 'DRAFT',
          creator_id: creatorProfile.id,
          version: 1,
          // 升级相关字段
          upgraded_from_id: sourceSolution.id,
          upgraded_from_version: sourceSolution.version,
          upgrade_notes: validatedData.upgradeNotes || null,
          is_upgrade: true,
        }
      });

      // 如果需要升级资产，复制文件
      if (validatedData.upgradeAssets && sourceSolution.files.length > 0) {
        await tx.solutionFile.createMany({
          data: sourceSolution.files.map(file => ({
            solution_id: newSolution.id,
            filename: file.filename,
            original_name: file.original_name,
            file_type: file.file_type,
            mime_type: file.mime_type,
            size: file.size,
            path: file.path,
            url: file.url,
            thumbnail_url: file.thumbnail_url,
            checksum: file.checksum,
            metadata: file.metadata,
            description: file.description,
            status: file.status,
            uploaded_by: authResult.user.id,
          }))
        });
      }

      return newSolution;
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_UPGRADED',
      resource: 'solution',
      resourceId: upgradedSolution.id,
      oldValue: {
        sourceSolutionId: sourceSolution.id,
        sourceTitle: sourceSolution.title,
      },
      newValue: {
        upgradedSolutionId: upgradedSolution.id,
        upgradedTitle: upgradedSolution.title,
        upgradeAssets: validatedData.upgradeAssets,
        upgradeBom: validatedData.upgradeBom,
      },
    });

    return createSuccessResponse(
      {
        id: upgradedSolution.id,
        title: upgradedSolution.title,
        status: upgradedSolution.status,
        upgradedFromId: upgradedSolution.upgraded_from_id,
        upgradedFromVersion: upgradedSolution.upgraded_from_version,
      },
      '方案升级成功',
      201
    );
  } catch (error) {
    console.error('升级方案失败:', error);
    
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }
    
    return createErrorResponse(
      error instanceof Error ? error : new Error('升级方案失败'),
      500
    );
  }
}

