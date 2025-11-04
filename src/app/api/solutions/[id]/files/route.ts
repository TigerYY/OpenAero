import { SolutionFileType, FileStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/prisma';

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id: solutionId } = params;
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    // 检查方案是否存在
    const solution = await db.solution.findUnique({
      where: { id: solutionId },
      select: { 
        id: true, 
        title: true, 
        creatorId: true,
        status: true 
      }
    });

    if (!solution) {
      return NextResponse.json(
        { error: '方案不存在' },
        { status: 404 }
      );
    }

    // 检查访问权限 - 创作者可以查看所有文件，其他用户只能查看已发布方案的文件
    const isCreator = solution.creatorId === session.user.id;
    if (!isCreator && solution.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: '无权访问此方案的文件' },
        { status: 403 }
      );
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
      db.solutionFile.findMany({
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
      db.solutionFile.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        solution: {
          id: solution.id,
          title: solution.title
        },
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取方案文件列表失败:', error);
    return NextResponse.json(
      { error: '获取方案文件列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/solutions/[id]/files - 为方案添加文件关联
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id: solutionId } = params;
    const body = await request.json();
    
    const associateSchema = z.object({
      fileIds: z.array(z.string()).min(1, '请选择至少一个文件'),
    });

    const { fileIds } = associateSchema.parse(body);

    // 检查方案是否存在且用户有权限
    const solution = await db.solution.findUnique({
      where: { id: solutionId },
      select: { creatorId: true }
    });

    if (!solution) {
      return NextResponse.json(
        { error: '方案不存在' },
        { status: 404 }
      );
    }

    if (solution.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: '无权修改此方案' },
        { status: 403 }
      );
    }

    // 检查文件是否存在且属于当前用户
    const files = await db.solutionFile.findMany({
      where: {
        id: { in: fileIds },
        uploadedBy: session.user.id,
        status: 'ACTIVE'
      }
    });

    if (files.length !== fileIds.length) {
      return NextResponse.json(
        { error: '部分文件不存在或无权访问' },
        { status: 400 }
      );
    }

    // 更新文件关联
    await db.solutionFile.updateMany({
      where: {
        id: { in: fileIds }
      },
      data: {
        solutionId: solutionId,
        updatedAt: new Date()
      }
    });

    // 获取更新后的文件列表
    const updatedFiles = await db.solutionFile.findMany({
      where: {
        id: { in: fileIds }
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedFiles,
      message: '文件关联成功'
    });

  } catch (error) {
    console.error('关联文件失败:', error);
    return NextResponse.json(
      { error: '关联文件失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/solutions/[id]/files - 移除方案的文件关联
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id: solutionId } = params;
    const { searchParams } = new URL(request.url);
    const fileIds = searchParams.get('fileIds')?.split(',') || [];

    if (fileIds.length === 0) {
      return NextResponse.json(
        { error: '请指定要移除的文件' },
        { status: 400 }
      );
    }

    // 检查方案是否存在且用户有权限
    const solution = await db.solution.findUnique({
      where: { id: solutionId },
      select: { creatorId: true }
    });

    if (!solution) {
      return NextResponse.json(
        { error: '方案不存在' },
        { status: 404 }
      );
    }

    if (solution.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: '无权修改此方案' },
        { status: 403 }
      );
    }

    // 移除文件关联（将solutionId设为null）
    await db.solutionFile.updateMany({
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

    return NextResponse.json({
      success: true,
      message: '文件关联已移除'
    });

  } catch (error) {
    console.error('移除文件关联失败:', error);
    return NextResponse.json(
      { error: '移除文件关联失败' },
      { status: 500 }
    );
  }
}