import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName } = body;

    if (!email) {
      return NextResponse.json(
        { error: '邮箱地址是必需的' },
        { status: 400 }
      );
    }

    // 模拟注册流程，直接发送验证邮件
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?email=${encodeURIComponent(email)}`;
    const emailResult = await emailService.sendVerificationEmail(email, verificationUrl);

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: '注册成功！验证邮件已发送',
        email: email,
        verificationUrl: verificationUrl,
        emailSent: true,
        developmentMode: true
      });
    } else {
      return NextResponse.json(
        { 
          error: '验证邮件发送失败', 
          details: emailResult.error 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('测试完整流程错误:', error);
    return NextResponse.json(
      { 
        error: '测试流程失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}