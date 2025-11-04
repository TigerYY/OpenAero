import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { AuthUtils } from '@/lib/auth-utils';
import { emailService } from '@/lib/email';

const prisma = new PrismaClient();

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

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // 出于安全考虑，即使邮箱不存在也返回成功
      return NextResponse.json({
        success: true,
        message: '如果邮箱存在，重置链接将发送到您的邮箱'
      });
    }

    // 生成密码重置令牌
    const resetToken = AuthUtils.generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期

    // 创建密码重置记录
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        token: resetToken,
        type: 'PASSWORD_RESET',
        expiresAt
      }
    });

    // 发送密码重置邮件
    await emailService.sendPasswordResetEmail(user.email, resetToken);

    // 创建审计日志
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'User',
        resourceId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

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

// 确认密码重置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    // 验证输入
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: '重置令牌和新密码是必填项' },
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

    // 查找重置记录
    const resetRecord = await prisma.emailVerification.findFirst({
      where: {
        token,
        type: 'PASSWORD_RESET',
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: true
      }
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: '重置令牌无效或已过期' },
        { status: 400 }
      );
    }

    // 哈希新密码
    const hashedPassword = await AuthUtils.hashPassword(newPassword);

    // 更新用户密码
    await prisma.user.update({
      where: { id: resetRecord.userId || '' },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    // 标记重置记录为已使用
    await prisma.emailVerification.update({
      where: { id: resetRecord.id },
      data: {
        usedAt: new Date()
      }
    });

    // 创建审计日志
    await prisma.auditLog.create({
      data: {
        userId: resetRecord.userId || undefined,
        action: 'PASSWORD_RESET_COMPLETED',
        resource: 'User',
        resourceId: resetRecord.userId || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      message: '密码重置成功'
    });

  } catch (error) {
    console.error('密码重置错误:', error);
    return NextResponse.json(
      { error: '密码重置失败，请稍后重试' },
      { status: 500 }
    );
  }
}