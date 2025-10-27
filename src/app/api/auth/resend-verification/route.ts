import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { emailService } from '@/backend/email/email.service';
import { logUserAction, getClientIP } from '@/backend/auth/auth.middleware';
import crypto from 'crypto';

const resendVerificationSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = resendVerificationSchema.parse(body);

    // 查找用户
    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      // 为了安全考虑，不暴露用户是否存在
      return NextResponse.json({
        success: true,
        message: '如果该邮箱已注册，验证邮件将发送到您的邮箱'
      });
    }

    // 检查用户是否已验证
    if (user.emailVerified) {
      return NextResponse.json(
        { error: '该邮箱已经验证过了' },
        { status: 400 }
      );
    }

    // 检查是否有未过期的验证令牌
    const existingVerification = await db.emailVerification.findFirst({
      where: {
        email,
        type: 'REGISTRATION',
        expiresAt: { gt: new Date() },
        usedAt: null
      }
    });

    let verificationToken: string;

    if (existingVerification) {
      // 检查最近是否发送过邮件（防止频繁发送）
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (existingVerification.createdAt > fiveMinutesAgo) {
        return NextResponse.json(
          { error: '验证邮件发送过于频繁，请5分钟后再试' },
          { status: 429 }
        );
      }
      verificationToken = existingVerification.token;
    } else {
      // 创建新的验证令牌
      verificationToken = crypto.randomBytes(32).toString('hex');
      
      // 删除旧的验证令牌
      await db.emailVerification.deleteMany({
        where: {
          email,
          type: 'REGISTRATION'
        }
      });

      // 创建新的验证令牌
      await db.emailVerification.create({
        data: {
          email,
          token: verificationToken,
          type: 'REGISTRATION',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
        }
      });
    }

    // 发送验证邮件
    const userName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.firstName || user.lastName || undefined;
    
    const emailSent = await emailService.sendVerificationEmail(
      email,
      verificationToken,
      userName
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: '邮件发送失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 记录审计日志
    await logUserAction(
      user.id,
      'RESEND_VERIFICATION_EMAIL',
      'user',
      user.id,
      undefined,
      { email },
      getClientIP(request),
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: '验证邮件已发送，请检查您的邮箱'
    });

  } catch (error: any) {
    console.error('重发验证邮件失败:', error);

    // 记录失败日志
    await logUserAction(
      'anonymous',
      'RESEND_VERIFICATION_EMAIL_FAILED',
      'user',
      undefined,
      undefined,
      { reason: error.message },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '重发验证邮件失败，请稍后重试' },
      { status: 500 }
    );
  }
}