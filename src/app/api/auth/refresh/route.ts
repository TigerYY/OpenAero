import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body || !body.refreshToken) {
      return NextResponse.json(
        { error: '刷新令牌为必填项' },
        { status: 400 }
      );
    }

    // 使用 Supabase 刷新令牌
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: body.refreshToken
    });

    if (error) {
      console.error('Supabase token refresh error:', error);
      return NextResponse.json(
        { error: '刷新令牌无效或已过期，请重新登录' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        session: data.session,
        user: data.user
      },
      message: '令牌刷新成功'
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: '令牌刷新失败，请稍后重试' },
      { status: 500 }
    );
  }
}