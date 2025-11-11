import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: '邮箱地址是必需的' },
        { status: 400 }
      );
    }

    // 测试邮件发送
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?email=${encodeURIComponent(email)}`;
    const result = await emailService.sendVerificationEmail(email, verificationUrl);

    return NextResponse.json({
      success: result.success,
      message: result.success ? '邮件发送成功' : '邮件发送失败',
      error: result.error,
      email: email,
      verificationUrl: verificationUrl
    });

  } catch (error) {
    console.error('测试邮件发送错误:', error);
    return NextResponse.json(
      { 
        error: '测试邮件发送失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}