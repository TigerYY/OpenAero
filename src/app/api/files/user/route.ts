import { NextRequest, NextResponse } from 'next/server';
import { fileService } from '../../../../backend/file/file.service';
import { authenticateToken } from '../../../../backend/auth/auth.middleware';

// 获取用户文件列表
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // 返回认证错误
    }

    // 获取用户信息
    const user = (request as any).user;

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 获取用户文件列表
    const result = await fileService.getUserFiles(user.userId, page, limit);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('获取用户文件列表失败:', error);
    return NextResponse.json(
      { error: '获取文件列表失败' },
      { status: 500 }
    );
  }
}