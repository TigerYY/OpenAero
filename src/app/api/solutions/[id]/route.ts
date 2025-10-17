import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiResponse, Solution } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const solution = await prisma.solution.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            bio: true,
            specialties: true,
            experience: true,
            website: true,
            user: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!solution) {
      return NextResponse.json(
        {
          success: false,
          error: '解决方案不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // 计算平均评分
    const averageRating = solution.reviews.length > 0
      ? solution.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / solution.reviews.length
      : 0;

    const solutionWithRating = {
      ...solution,
      price: Number(solution.price),
      specs: solution.specs as Record<string, any> | undefined,
      bom: solution.bom as Record<string, any> | undefined,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: solution.reviews.length,
    } as unknown as Solution;

    return NextResponse.json({
      success: true,
      data: solutionWithRating,
    } as ApiResponse<Solution>);

  } catch (error) {
    console.error('Error fetching solution:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取解决方案详情失败',
      } as ApiResponse,
      { status: 500 }
    );
  }
}
