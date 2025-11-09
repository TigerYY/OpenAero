import { NextRequest, NextResponse } from 'next/server';

import { resetPasswordForEmail } from '@/lib/supabase-auth';
import { AuthUtils } from '@/lib/auth-utils';

// 请求密码重置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // 验证输入
    if (!email) {
      return NextResponse.json(
        { error: '邮箱是必填项' },
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

    // 使用Supabase发送密码重置邮件
    const { error } = await resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`
    });

    if (error) {
      console.error('Supabase密码重置错误:', error);
      return NextResponse.json(
        { error: error.message || '密码重置请求失败，请稍后重试' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '如果邮箱存在，重置链接将发送到您的邮箱'
    });

  } catch (error) {
    console.error('密码重置请求错误:', error);
    return NextResponse.json(
      { error: '密码重置请求失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 确认密码重置（Supabase中通过用户自己的会话更新密码）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { newPassword } = body;

    // 验证输入
    if (!newPassword) {
      return NextResponse.json(
        { error: '新密码是必填项' },
        { status: 400 }
      );
    }

    // 验证密码强度
    const passwordValidation = AuthUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Supabase的密码重置是通过邮件链接中的access_token进行的
    // 这里我们返回一个指示，说明密码重置应该通过邮件链接完成
    // 实际的密码更新会在用户点击邮件链接后在前端完成
    return NextResponse.json({
      success: false,
      message: '密码重置需要通过邮件链接完成。请检查您的邮箱并点击重置链接。'
    });

  } catch (error) {
    console.error('密码重置错误:', error);
    return NextResponse.json(
      { error: '密码重置失败，请稍后重试' },
      { status: 500 }
    );
  }
}