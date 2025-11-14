import { SolutionFileType, FileStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { prisma } from '@/lib/prisma';

import { checkCreatorAuth } from '@/lib/api-auth-helpers';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse, createValidationErrorResponse } from '@/lib/api-helpers';

interface RouteParams {
  params: {
    id: string;
  };
}

// 查询参数验证
const querySchema = z.object({
  fileType: z.nativeEnum(SolutionFileType).optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 50)).optional(),
});

// GET /api/solutions/[id]/files - 获取方案的文件列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }
    const session = authResult.session;
    if (!session?.user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { id: solutionId } = params;
    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse(Object.fromEntries(searchParams));

    // 检查方案是否存在
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      select: { 
        id: true, 
        title: true, 
        creatorId: true,
        status: true 
      }
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    // 检查访问权限 - 创作者可以查看所有文件，其他用户只能查看已发布方案的文件
    const isCreator = solution.creatorId === session.user.id;
    if (!isCreator && solution.status !== 'PUBLISHED') {
      return createErrorResponse('无权访问此方案的文件', 403);
    }

    const where: any = {
      solutionId: solutionId,
      status: 'ACTIVE'
    };

    // 文件类型过滤
    if (query.fileType) {
      where.fileType = query.fileType;
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      prisma.solutionFile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      }),
      prisma.solutionFile.count({ where })
    ]);

    return createSuccessResponse({
      solution: {
        id: solution.id,
        title: solution.title
      },
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, '获取方案文件列表成功');

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }
    console.error('获取方案文件列表失败:', error);
    return createErrorResponse('获取方案文件列表失败', 500);
  }
}

// POST /api/solutions/[id]/files - 为方案添加文件关联
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }
    const session = authResult.session;
    if (!session?.user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { id: solutionId } = params;
    const body = await request.json();
    
    const associateSchema = z.object({
      fileIds: z.array(z.string()).min(1, '请选择至少一个文件'),
    });

    const { fileIds } = associateSchema.parse(body);

    // 检查方案是否存在且用户有权限
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      select: { creatorId: true }
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    if (solution.creatorId !== session.user.id) {
      return createErrorResponse('无权修改此方案', 403);
    }

    // 检查文件是否存在且属于当前用户
    const files = await prisma.solutionFile.findMany({
      where: {
        id: { in: fileIds },
        uploadedBy: session.user.id,
        status: 'ACTIVE'
      }
    });

    if (files.length !== fileIds.length) {
      return createErrorResponse('部分文件不存在或无权访问', 400);
    }

    // 更新文件关联
    await prisma.solutionFile.updateMany({
      where: {
        id: { in: fileIds }
      },
      data: {
        solutionId: solutionId,
        updatedAt: new Date()
      }
    });

    // 获取更新后的文件列表
    const updatedFiles = await prisma.solutionFile.findMany({
      where: {
        id: { in: fileIds }
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return createSuccessResponse(updatedFiles, '文件关联成功');

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }
    console.error('关联文件失败:', error);
    return createErrorResponse('关联文件失败', 500);
  }
}

// DELETE /api/solutions/[id]/files - 移除方案的文件关联
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }
    const session = authResult.session;
    if (!session?.user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { id: solutionId } = params;
    const searchParams = request.nextUrl.searchParams;
    const fileIds = searchParams.get('fileIds')?.split(',') || [];

    if (fileIds.length === 0) {
      return createErrorResponse('请指定要移除的文件', 400);
    }

    // 检查方案是否存在且用户有权限
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      select: { creatorId: true }
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    if (solution.creatorId !== session.user.id) {
      return createErrorResponse('无权修改此方案', 403);
    }

    // 移除文件关联（将solutionId设为null）
    await prisma.solutionFile.updateMany({
      where: {
        id: { in: fileIds },
        solutionId: solutionId,
        uploadedBy: session.user.id
      },
      data: {
        solutionId: null,
        updatedAt: new Date()
      }
    });

    return createSuccessResponse(null, '文件关联已移除');

  } catch (error) {
    console.error('移除文件关联失败:', error);
    return createErrorResponse('移除文件关联失败', 500);
  }
}