import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken } from '../../../../backend/auth/auth.middleware';
import { fileService } from '../../../../backend/file/file.service';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    // 获取表单数据
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      );
    }

    // 转换文件格式
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const buffer = await file.arrayBuffer();
        return {
          fieldname: 'files',
          originalname: file.name,
          encoding: '7bit',
          mimetype: file.type,
          size: file.size,
          destination: '',
          filename: '',
          path: '',
          buffer: Buffer.from(buffer),
        };
      })
    );

    // 上传文件
    const results = await fileService.uploadMultipleFiles(
      uploadedFiles,
      user.userId
    );

    return NextResponse.json({
      success: true,
      files: results,
      message: `成功上传 ${results.length} 个文件`
    });

  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { 
        error: '文件上传失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 配置文件上传限制
// Next.js 14 App Router 不需要 config 导出
// 文件上传在 App Router 中通过 request.formData() 处理