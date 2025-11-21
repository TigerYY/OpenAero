import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/admin/solutions/[id]/preview - 预览发布效果
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = params;

    // 获取方案及其发布数据
    const solution = await prisma.solution.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                display_name: true,
              }
            }
          }
        },
        publishing: true,
        files: {
          orderBy: { created_at: 'desc' }
        },
        solutionReviews: {
          orderBy: { created_at: 'desc' },
          take: 1,
        }
      }
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    // 验证方案状态为 READY_TO_PUBLISH
    if (solution.status !== 'READY_TO_PUBLISH') {
      return createErrorResponse('只有准备发布的方案可以预览', 400);
    }

    // 合并 Solution 和 SolutionPublishing 数据
    const previewData = {
      // 方案基本信息
      id: solution.id,
      title: solution.title,
      description: solution.description,
      category: solution.category,
      price: solution.price.toString(),
      status: solution.status,
      images: solution.images,
      features: solution.features,
      tags: solution.tags,
      specs: solution.specs,
      bom: solution.bom,
      
      // 创作者信息
      creator: {
        id: solution.creator.id,
        name: solution.creator.user?.display_name || 
              `${solution.creator.user?.first_name || ''} ${solution.creator.user?.last_name || ''}`.trim() ||
              '未知创作者',
      },
      
      // 发布优化数据（优先使用 SolutionPublishing，如果不存在则使用 Solution 默认值）
      publishDescription: solution.publishing?.publish_description || null,
      mediaLinks: solution.publishing?.media_links || [],
      productLinks: solution.publishing?.product_links || [],
      metaTitle: solution.publishing?.meta_title || solution.title,
      metaDescription: solution.publishing?.meta_description || solution.description.substring(0, 200),
      metaKeywords: solution.publishing?.meta_keywords || solution.tags,
      featuredTags: solution.publishing?.featured_tags || [],
      featuredOrder: solution.publishing?.featured_order || null,
      isFeatured: solution.publishing?.is_featured || false,
      
      // 资产文件
      files: solution.files.map(file => ({
        id: file.id,
        type: file.file_type,
        url: file.url,
        title: file.original_name,
        description: file.description,
      })),
      
      // 审核信息
      reviewHistory: solution.solutionReviews.map(review => ({
        id: review.id,
        decision: review.decision,
        comments: review.comments,
        reviewedAt: review.reviewed_at?.toISOString(),
      })),
      
      // 时间戳
      createdAt: solution.created_at.toISOString(),
      updatedAt: solution.updated_at.toISOString(),
      optimizedAt: solution.publishing?.optimized_at?.toISOString() || null,
    };

    return createSuccessResponse(previewData, '预览数据获取成功');
  } catch (error) {
    console.error('获取预览数据失败:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('获取预览数据失败'),
      500
    );
  }
}

