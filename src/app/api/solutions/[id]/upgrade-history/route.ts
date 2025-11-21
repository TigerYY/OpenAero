import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/solutions/[id]/upgrade-history - 获取方案升级历史
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份（可选，公共方案可以查看）
    const authResult = await authenticateRequest(request);
    const { id } = params;

    // 获取源方案
    const sourceSolution = await prisma.solution.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
      }
    });

    if (!sourceSolution) {
      return createErrorResponse('方案不存在', 404);
    }

    // 获取所有基于此方案的升级方案
    const upgradedSolutions = await prisma.solution.findMany({
      where: {
        upgraded_from_id: id,
      },
      include: {
        creator: {
          include: {
            user: {
              select: {
                display_name: true,
                first_name: true,
                last_name: true,
              }
            }
          }
        },
      },
      orderBy: {
        created_at: 'desc',
      }
    });

    // 获取此方案的源方案（如果它是升级方案）
    let sourceSolutionData = null;
    if (sourceSolution) {
      const source = await prisma.solution.findUnique({
        where: { id: sourceSolution.id },
        select: {
          upgraded_from_id: true,
        }
      });

      if (source?.upgraded_from_id) {
        const original = await prisma.solution.findUnique({
          where: { id: source.upgraded_from_id },
          include: {
            creator: {
              include: {
                user: {
                  select: {
                    display_name: true,
                    first_name: true,
                    last_name: true,
                  }
                }
              }
            }
          }
        });

        if (original) {
          sourceSolutionData = {
            id: original.id,
            title: original.title,
            status: original.status,
            creator: {
              name: original.creator.user?.display_name || 
                    `${original.creator.user?.first_name || ''} ${original.creator.user?.last_name || ''}`.trim() ||
                    '未知创作者',
            },
            createdAt: original.created_at.toISOString(),
          };
        }
      }
    }

    return createSuccessResponse({
      source: sourceSolutionData,
      upgrades: upgradedSolutions.map(sol => ({
        id: sol.id,
        title: sol.title,
        status: sol.status,
        upgradeNotes: sol.upgrade_notes,
        upgradedFromVersion: sol.upgraded_from_version,
        creator: {
          name: sol.creator.user?.display_name || 
                `${sol.creator.user?.first_name || ''} ${sol.creator.user?.last_name || ''}`.trim() ||
                '未知创作者',
        },
        createdAt: sol.created_at.toISOString(),
      })),
    }, '升级历史获取成功');
  } catch (error) {
    console.error('获取升级历史失败:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('获取升级历史失败'),
      500
    );
  }
}

