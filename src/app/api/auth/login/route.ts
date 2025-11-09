import { NextRequest, NextResponse } from 'next/server';

import { signIn } from '@/lib/supabase-auth';
import { AuthUtils } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码是必填项' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    if (!AuthUtils.validateEmail(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 使用Supabase进行登录
    const response = await signIn({
      email,
      password
    });

    // Supabase返回的结构是 {data: {user, session}, error}
    const user = response.data?.user;
    const session = response.data?.session;
    const error = response.error;

    console.log('Supabase登录响应:', {
      hasError: !!error,
      errorMessage: error?.message,
      hasUser: !!user,
      hasSession: !!session,
      userId: user?.id,
      userEmail: user?.email
    });

    if (error) {
      console.error('Supabase登录错误:', error);
      
      // 处理特定的错误情况
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: '邮箱或密码不正确' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: error.message || '登录失败' },
        { status: 400 }
      );
    }

    if (!user || !session) {
      console.error('登录响应不完整:', {
        user,
        session,
        error
      });
      return NextResponse.json(
        { error: '登录失败，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
        role: user.user_metadata?.role || 'USER',
        emailVerified: user.email_confirmed_at ? true : false,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    console.error('错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: '登录失败，请稍后重试',
        debug: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}