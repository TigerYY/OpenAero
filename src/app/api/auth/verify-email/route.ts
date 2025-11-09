import { NextRequest, NextResponse } from 'next/server';

import { verifyOtp } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = body;

    // 验证输入
    if (!email || !token) {
      return NextResponse.json(
        { error: '邮箱和验证码是必填项' },
        { status: 400 }
      );
    }

    // 使用Supabase验证OTP
    const response = await verifyOtp({
      email,
      token,
      type: 'signup'
    });

    if (response.error) {
      console.error('邮箱验证错误:', response.error);
      return NextResponse.json(
        { error: response.error.message || '邮箱验证失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '邮箱验证成功',
      user: response.user
    });

  } catch (error) {
    console.error('邮箱验证错误:', error);
    return NextResponse.json(
      { error: '邮箱验证失败，请稍后重试' },
      { status: 500 }
    );
  }
}