import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '@/lib/api-helpers';

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

    // 获取创作者档案
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { user_id: authResult.user.id }
    });

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
      creatorId: creatorProfile.id
    };

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    // 获取总数
    const total = await prisma.solution.count({ where });

    // 获取方案列表
    const solutions = await prisma.solution.findMany({
      where,
      include: {
        _count: {
          select: {
            solutionReviews: true,
            assets: true,
            bomItems: true
          }
        },
        assets: {
          take: 3, // 只取前3个资产作为预览
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // 格式化响应数据
    const formattedSolutions = solutions.map(solution => ({
      id: solution.id,
      title: solution.title,
      description: solution.description,
      summary: solution.summary,
      category: solution.category,
      status: solution.status,
      price: Number(solution.price),
      version: solution.version,
      tags: solution.tags || solution.features || [],
      images: solution.images || [],
      locale: solution.locale,
      createdAt: solution.createdAt.toISOString(),
      updatedAt: solution.updatedAt.toISOString(),
      submittedAt: solution.submittedAt?.toISOString() || null,
      lastReviewedAt: solution.lastReviewedAt?.toISOString() || null,
      publishedAt: solution.publishedAt?.toISOString() || null,
      reviewCount: solution._count.solutionReviews || 0,
      assetCount: solution._count.assets || 0,
      bomItemCount: solution._count.bomItems || 0,
      previewAssets: solution.assets.map(asset => ({
        id: asset.id,
        type: asset.type,
        url: asset.url,
        title: asset.title
      }))
    }));

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

