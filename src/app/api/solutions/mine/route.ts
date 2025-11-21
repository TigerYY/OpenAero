import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, createPaginatedResponse } from '@/lib/api-helpers';
import { ensureCreatorProfile } from '@/lib/creator-profile-utils';

// GET /api/solutions/mine - 获取当前创作者的所有方案
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || createErrorResponse('未授权访问', 401);
    }

    // 验证用户为 CREATOR 角色
    const userRoles = authResult.user.roles || [];
    if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      return createErrorResponse('只有创作者可以查看自己的方案', 403);
    }

    // 确保用户有 CreatorProfile（如果用户有 CREATOR 角色但没有档案，自动创建）
    const creatorProfile = await ensureCreatorProfile(authResult.user.id);

    if (!creatorProfile) {
      return createErrorResponse('创作者档案不存在', 404);
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 构建查询条件
    const where: any = {
      creator_id: creatorProfile.id
    };

    if (status && status !== 'all') {
      const statusUpper = status.toUpperCase();
      
      // 处理新状态：READY_TO_PUBLISH, SUSPENDED
      if (statusUpper === 'READY_TO_PUBLISH' || statusUpper === 'SUSPENDED') {
        where.status = statusUpper as any;
      }
      // 处理 NEEDS_REVISION 状态：需要通过审核记录来判断
      else if (statusUpper === 'NEEDS_REVISION') {
        // 查询有 NEEDS_REVISION 或 PENDING 审核决定的方案（已完成状态）
        // 不限制方案状态，因为"需修改"的方案可能处于不同状态
        where.solutionReviews = {
          some: {
            OR: [
              { 
                decision: 'NEEDS_REVISION',
                status: 'COMPLETED'
              },
              { 
                decision: 'PENDING',
                status: 'COMPLETED'
              }
            ]
          }
        };
      } else {
        where.status = status.toUpperCase();
      }
    }
    
    // 注意：无论是否过滤 NEEDS_REVISION，我们都需要获取审核记录来判断状态

    // 获取总数
    const total = await prisma.solution.count({ where });

    // 获取方案列表
    const solutions = await prisma.solution.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        price: true,
        version: true,
        tags: true,
        features: true,
        images: true,
        locale: true,
        bom: true,
        created_at: true,
        updated_at: true,
        submitted_at: true,
        reviewed_at: true,
        published_at: true,
        _count: {
          select: {
            solutionReviews: true,
            files: true,
          }
        },
        solutionReviews: {
          orderBy: {
            reviewed_at: 'desc'
          },
          take: 10, // 获取最新的10条审核记录，以便找到 NEEDS_REVISION 决定
          select: {
            id: true,
            decision: true,
            comments: true,
            reviewed_at: true,
            status: true
          }
        },
        files: {
          take: 3, // 只取前3个文件作为预览
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            file_type: true,
            url: true,
            original_name: true,
            filename: true,
          }
        }
      },
      orderBy: { updated_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // 格式化响应数据
    const formattedSolutions = solutions.map(solution => {
      // 解析 BOM（如果存在）
      const bom = solution.bom ? (typeof solution.bom === 'string' ? JSON.parse(solution.bom) : solution.bom) : [];
      const bomItemCount = Array.isArray(bom) ? bom.length : 0;
      
      // 检查审核记录，找出 NEEDS_REVISION 或 PENDING 决定
      const reviews = (solution as any).solutionReviews || [];
      // 找到最新的 NEEDS_REVISION 或 PENDING 审核记录（已完成状态）
      const needsRevisionReview = reviews.find((r: any) => 
        (r.decision === 'NEEDS_REVISION' || r.decision === 'PENDING') && 
        r.status === 'COMPLETED'
      );
      // 获取最新的审核记录（按时间排序的第一条）
      const latestReview = reviews.length > 0 ? reviews[0] : null;
      const isNeedsRevision = needsRevisionReview !== undefined;
      
      // 如果存在 NEEDS_REVISION 或 PENDING 审核决定（已完成），且没有后续的 APPROVED 审核，则显示为 NEEDS_REVISION 状态
      let displayStatus = solution.status;
      if (isNeedsRevision) {
        // 检查是否有比 NEEDS_REVISION/PENDING 更新的审核记录（按时间排序）
        const needsRevisionIndex = reviews.findIndex((r: any) => r.id === needsRevisionReview.id);
        // 如果有更新的审核记录，检查是否已经通过审核
        const hasNewerApproved = needsRevisionIndex > 0 && 
          reviews.slice(0, needsRevisionIndex).some((r: any) => r.decision === 'APPROVED');
        // 如果没有更新的通过审核，则显示为 NEEDS_REVISION
        // 注意：即使方案状态是 PENDING_REVIEW 或 DRAFT，只要有 NEEDS_REVISION/PENDING 审核决定，就应该显示为 NEEDS_REVISION
        if (!hasNewerApproved) {
          displayStatus = 'NEEDS_REVISION' as any;
        }
      }
      
      return {
        id: solution.id,
        title: solution.title,
        description: solution.description,
        summary: solution.description.substring(0, 200), // 从描述中提取摘要
        category: solution.category,
        status: displayStatus,
        price: Number(solution.price),
        version: solution.version,
        tags: solution.tags || solution.features || [],
        images: solution.images || [],
        locale: solution.locale,
        createdAt: solution.created_at.toISOString(),
        updatedAt: solution.updated_at.toISOString(),
        submittedAt: solution.submitted_at?.toISOString() || null,
        lastReviewedAt: latestReview?.reviewed_at?.toISOString() || solution.reviewed_at?.toISOString() || null,
        publishedAt: solution.published_at?.toISOString() || null,
        reviewCount: solution._count.solutionReviews || 0,
        assetCount: solution._count.files || 0,
        bomItemCount: bomItemCount,
        previewAssets: solution.files.map(file => ({
          id: file.id,
          type: file.file_type,
          url: file.url,
          title: file.original_name || file.filename
        })),
        // 添加审核反馈信息（如果是需修改状态）
        reviewFeedback: isNeedsRevision && displayStatus === 'NEEDS_REVISION' ? {
          comment: needsRevisionReview?.comments || null,
          reviewedAt: needsRevisionReview?.reviewed_at?.toISOString() || null
        } : null
      };
    });

    return createPaginatedResponse(
      formattedSolutions,
      page,
      limit,
      total,
      '获取方案列表成功'
    );
  } catch (error) {
    console.error('获取我的方案列表失败:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('获取方案列表失败'),
      500
    );
  }
}

