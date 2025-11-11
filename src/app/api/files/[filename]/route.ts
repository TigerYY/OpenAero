import fs from 'fs/promises';

import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken } from '../../../../backend/auth/auth.middleware';
import { fileService } from '../../../../backend/file/file.service';

// 获取文件信息
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // 获取文件信息
    const fileInfo = await fileService.getFileInfo(filename);
    if (!fileInfo) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      file: fileInfo
    });

  } catch (error) {
    console.error('获取文件信息失败:', error);
    return NextResponse.json(
      { error: '获取文件信息失败' },
      { status: 500 }
    );
  }
}

// 下载文件
export async function POST(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // 下载文件
    const result = await fileService.downloadFile(filename);
    if (!result) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 读取文件内容
    const fileBuffer = await fs.readFile(result.filePath);

    // 返回文件流
    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': result.metadata.mimeType,
        'Content-Disposition': `attachment; filename="${result.metadata.originalName}"`,
        'Content-Length': result.metadata.size.toString(),
      },
    });

  } catch (error) {
    console.error('文件下载失败:', error);
    return NextResponse.json(
      { error: '文件下载失败' },
      { status: 500 }
    );
  }
}

// 删除文件
export async function DELETE(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;
    const { filename } = params;

    // 删除文件
    const success = await fileService.deleteFile(filename, user.userId);
    if (!success) {
      return NextResponse.json(
        { error: '文件删除失败或无权限' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '文件删除成功'
    });

  } catch (error) {
    console.error('文件删除失败:', error);
    return NextResponse.json(
      { error: '文件删除失败' },
      { status: 500 }
    );
  }
}