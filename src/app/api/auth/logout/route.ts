import { NextRequest, NextResponse } from 'next/server';

import { signOut } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    // 使用 Supabase 进行登出
    const { error } = await signOut();

    if (error) {
      console.error('Supabase登出错误:', error);
      return NextResponse.json(
        { error: error.message || '退出登录失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '退出登录成功'
    });

  } catch (error: any) {
    console.error('登出错误:', error);
    return NextResponse.json(
      { error: '退出登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}