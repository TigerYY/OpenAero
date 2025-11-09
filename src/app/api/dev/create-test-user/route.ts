import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@/lib/supabase';

// 仅在开发环境中可用
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '此功能仅在开发环境中可用' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码是必填项' },
        { status: 400 }
      );
    }

    // 使用Supabase Admin SDK创建用户（自动验证）
    const supabase = getSupabaseServerClient();
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自动验证邮箱
      user_metadata: {
        first_name: firstName || '',
        last_name: lastName || '',
        role: 'USER'
      }
    });

    if (error) {
      console.error('创建测试用户错误:', error);
      return NextResponse.json(
        { error: error.message || '创建用户失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '测试用户创建成功',
      user: user.user
    });

  } catch (error) {
    console.error('创建测试用户错误:', error);
    return NextResponse.json(
      { error: '创建用户失败，请稍后重试' },
      { status: 500 }
    );
  }
}