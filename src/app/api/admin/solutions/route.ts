import { SolutionStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/prisma';

// 查询参数验证
const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  status: z.enum(['DRAFT','PENDING_REVIEW','APPROVED','REJECTED','PUBLISHED','ARCHIVED','all']).optional().default('all'),
  category: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'title', 'price', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份和权限
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 检查管理员权限
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      status: searchParams.get('status') || 'all',
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    const page = parseInt(params.page);
    const limit = parseInt(params.limit);
    const offset = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (params.status !== 'all') {
      where.status = params.status as SolutionStatus;
    }
    
    if (params.category) {
      where.category = params.category;
    }
    
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // 构建排序条件
    const orderBy: any = {};
    orderBy[params.sortBy] = params.sortOrder;

    // 查询方案列表
    const [solutions, total] = await Promise.all([
      db.solution.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              bio: true,
              website: true,
              experience: true,
              specialties: true,
              status: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          files: {
            select: {
              id: true,
              filename: true,
              fileType: true,
              url: true,
              createdAt: true,
            }
          },
          solutionReviews: {
            select: {
              id: true,
              score: true,
              comments: true,
              createdAt: true,
              reviewer: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          _count: {
            select: {
              solutionReviews: true,
            }
          }
        }
      }),
      db.solution.count({ where })
    ]);

    // 格式化返回数据
    const formattedSolutions = solutions.map(solution => ({
      id: solution.id,
      title: solution.title,
      description: solution.description,
      category: solution.category,
      price: solution.price,
      status: solution.status,
      images: solution.images,
      features: solution.features,
      specs: solution.specs,
      bom: solution.bom,
      version: solution.version,
      submittedAt: solution.submittedAt,
      reviewedAt: solution.reviewedAt,
      reviewNotes: solution.reviewNotes,
      creator: (solution as any).creator ? {
        id: (solution as any).creator.id,
        name: (solution as any).creator.user ? `${(solution as any).creator.user.firstName ?? ''} ${(solution as any).creator.user.lastName ?? ''}`.trim() : '',
        email: (solution as any).creator.user?.email,
        bio: (solution as any).creator.bio,
        website: (solution as any).creator.website,
        experience: (solution as any).creator.experience,
        specialties: (solution as any).creator.specialties,
        status: (solution as any).creator.status,
      } : null,
      user: (solution as any).user ? {
        id: (solution as any).user.id,
        name: `${(solution as any).user.firstName ?? ''} ${(solution as any).user.lastName ?? ''}`.trim(),
        email: (solution as any).user.email,
      } : null,
      files: (solution as any).files?.map((file: any) => ({
        id: file.id,
        fileName: file.filename,
        fileType: file.fileType,
        fileUrl: file.url,
        createdAt: file.createdAt,
      })) || [],
      reviews: (solution as any).solutionReviews?.map((review: any) => ({
        id: review.id,
        rating: review.score ?? null,
        comment: review.comments ?? null,
        createdAt: review.createdAt,
        reviewer: review.reviewer ? {
          name: `${review.reviewer.firstName ?? ''} ${review.reviewer.lastName ?? ''}`.trim(),
          email: review.reviewer.email,
        } : null,
      })) || [],
      reviewCount: (solution as any)._count?.solutionReviews || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        solutions: formattedSolutions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      }
    });

  } catch (error) {
    console.error('获取方案列表失败:', error);
    return NextResponse.json(
      { error: '获取方案列表失败' },
      { status: 500 }
    );
  }
}