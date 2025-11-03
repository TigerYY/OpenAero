import fs from 'fs/promises';
import path from 'path';

import { SolutionFileType, FileStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';

// 查询参数验证
const querySchema = z.object({
  solutionId: z.string().optional(),
  fileType: z.nativeEnum(SolutionFileType).optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 50)).optional(),
  search: z.string().optional(),
});

// 获取文件列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const where: any = {};
    
    // 如果指定了方案ID，检查用户权限
    if (query.solutionId) {
      const solution = await db.solution.findUnique({
        where: { id: query.solutionId },
        select: { creatorId: true }
      });

      if (!solution || solution.creatorId !== session.user.id) {
        return NextResponse.json(
          { error: '无权访问此方案的文件' },
          { status: 403 }
        );
      }

      where.solutionId = query.solutionId;
    } else {
      // 如果没有指定方案ID，只返回用户上传的文件
      where.uploadedBy = session.user.id;
    }

    // 文件类型过滤
    if (query.fileType) {
      where.fileType = query.fileType;
    }

    // 搜索过滤
    if (query.search) {
      where.OR = [
        { originalName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ];
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
          },
          solution: {
            select: { id: true, title: true }
          }
        }
      }),
      db.solutionFile.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
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
    console.error('获取文件列表失败:', error);
    return NextResponse.json(
      { error: '获取文件列表失败' },
      { status: 500 }
    );
  }
}

// 更新文件信息
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updateSchema = z.object({
      id: z.string(),
      description: z.string().optional(),
      solutionId: z.string().optional(),
    });

    const data = updateSchema.parse(body);

    // 检查文件是否存在且用户有权限
    const file = await db.solutionFile.findUnique({
      where: { id: data.id },
      include: { solution: true }
    });

    if (!file) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    if (file.uploadedBy !== session.user.id) {
      return NextResponse.json(
        { error: '无权修改此文件' },
        { status: 403 }
      );
    }

    // 如果要关联到新方案，检查方案权限
    if (data.solutionId && data.solutionId !== file.solutionId) {
      const solution = await db.solution.findUnique({
        where: { id: data.solutionId },
        select: { creatorId: true }
      });

      if (!solution || solution.creatorId !== session.user.id) {
        return NextResponse.json(
          { error: '无权将文件关联到此方案' },
          { status: 403 }
        );
      }
    }

    const updatedFile = await db.solutionFile.update({
      where: { id: data.id },
      data: {
        description: data.description,
        solutionId: data.solutionId,
        updatedAt: new Date()
      },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        solution: {
          select: { id: true, title: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedFile
    });

  } catch (error) {
    console.error('更新文件失败:', error);
    return NextResponse.json(
      { error: '更新文件失败' },
      { status: 500 }
    );
  }
}

// 删除文件
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { error: '缺少文件ID' },
        { status: 400 }
      );
    }

    // 检查文件是否存在且用户有权限
    const file = await db.solutionFile.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    if (file.uploadedBy !== session.user.id) {
      return NextResponse.json(
        { error: '无权删除此文件' },
        { status: 403 }
      );
    }

    // 删除物理文件
    try {
      const filePath = path.join(process.cwd(), 'uploads', file.path);
      await fs.unlink(filePath);
    } catch (fsError) {
      console.warn('删除物理文件失败:', fsError);
      // 继续删除数据库记录，即使物理文件删除失败
    }

    // 删除数据库记录
    await db.solutionFile.delete({
      where: { id: fileId }
    });

    return NextResponse.json({
      success: true,
      message: '文件删除成功'
    });

  } catch (error) {
    console.error('删除文件失败:', error);
    return NextResponse.json(
      { error: '删除文件失败' },
      { status: 500 }
    );
  }
}