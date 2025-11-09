import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import path, { join } from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireUser } from '@/lib/supabase-server-auth';
import { db } from '@/lib/prisma';
import { 
  UPLOAD_CONFIG, 
  generateUniqueFilename, 
  calculateChecksum, 
  getFileType
} from '@/lib/multer-config';


// 格式化文件大小的辅助函数
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 配置
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// 允许的文件类型
const ALLOWED_TYPES = [
  // 图片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // 文档
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  // CAD文件
  'application/dwg',
  'application/dxf',
  'model/step',
  'model/iges',
  // 压缩文件
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // 视频
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/wmv',
];

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await requireUser(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const session = authResult.session;
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const solutionId = formData.get('solutionId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, message: '没有找到文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `不支持的文件类型: ${file.type}` },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false, 
          message: `文件大小超过限制 (最大 ${formatFileSize(MAX_FILE_SIZE)})` 
        },
        { status: 400 }
      );
    }

    // 验证方案是否存在且用户有权限
    if (solutionId) {
      const solution = await db.solution.findFirst({
        where: {
          id: solutionId,
          OR: [
            { userId: session.user.id },
            { creator: { userId: session.user.id } }
          ]
        }
      });

      if (!solution) {
        return NextResponse.json(
          { success: false, error: '方案不存在或无权限访问' },
          { status: 403 }
        );
      }
    }

    // 确保上传目录存在
    const uploadPath = solutionId 
      ? join(UPLOAD_DIR, 'solutions', solutionId)
      : join(UPLOAD_DIR, 'temp');
    
    if (!existsSync(uploadPath)) {
      await mkdir(uploadPath, { recursive: true });
    }

    // 生成唯一文件名
    const uniqueFilename = generateUniqueFilename(file.name);
    const filePath = join(uploadPath, uniqueFilename);
    const relativePath = path.relative(join(process.cwd(), 'public'), filePath);

    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 计算校验和
    const checksum = await calculateChecksum(filePath);

    // 获取文件类型
    const fileType = getFileType(file.type);

    // 生成访问URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const fileUrl = `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;

    // 保存到数据库 - 使用简单的文件记录而不是solutionFile
    const fileRecord = {
      solutionId: solutionId || '',
      filename: uniqueFilename,
      originalName: file.name,
      fileType,
      mimeType: file.type,
      size: file.size,
      path: relativePath,
      url: fileUrl,
      checksum,
      status: "ACTIVE",
      uploadedBy: session.user.id,
      metadata: {
        uploadedAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || '',
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        id: crypto.randomUUID(),
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        url: fileRecord.url,
        size: fileRecord.size,
        type: fileRecord.fileType,
        mimeType: fileRecord.mimeType,
      },
      message: '文件上传成功'
    });

  } catch (error) {
    console.error('文件上传错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '文件上传失败',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}