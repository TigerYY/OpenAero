import { NextRequest, NextResponse } from 'next/server';

import { emailService } from '@/lib/email';

import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: '邮箱地址是必需的' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 出于安全考虑，即使邮箱不存在也返回成功
      return NextResponse.json({
        message: '如果该邮箱已注册，验证邮件将重新发送'
      });
    }

    // 检查用户是否已经验证
    if (user.emailVerified) {
      return NextResponse.json(
        { error: '该邮箱已经验证过了' },
        { status: 400 }
      );
    }

    // 删除旧的验证记录
    await prisma.emailVerification.deleteMany({
      where: { userId: user.id },
    });

    // 创建新的验证记录
    const verification = await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时过期
      },
    });

    // 发送验证邮件
    try {
      await emailService.sendVerificationEmail(user.email, verification.token);
      
      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'RESEND_VERIFICATION_EMAIL',
          details: `重新发送验证邮件到 ${user.email}`,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: '验证邮件已重新发送'
      });
    } catch (emailError) {
      console.error('发送验证邮件失败:', emailError);
      
      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'RESEND_VERIFICATION_EMAIL_FAILED',
          details: `重新发送验证邮件失败: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json(
        { error: '发送验证邮件失败，请稍后重试' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('重新发送验证邮件错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}