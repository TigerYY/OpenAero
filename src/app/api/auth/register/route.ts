import { NextRequest, NextResponse } from 'next/server';

import { signUp } from '@/lib/supabase-auth';
import { AuthUtils } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
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

    // 验证邮箱格式
    if (!AuthUtils.validateEmail(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 验证密码强度
    const passwordValidation = AuthUtils.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // 使用Supabase进行注册
    const response = await signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName || '',
          last_name: lastName || '',
          role: 'USER'
        }
      }
    });

    if (response.error) {
      console.error('Supabase注册错误:', response.error);
      
      // 处理特定的错误情况
      if (response.error.message.includes('User already registered')) {
        return NextResponse.json(
          { error: '该邮箱已被注册' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: response.error.message || '注册失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '注册成功，请检查邮箱完成验证',
      user: response.user
    });

  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}