import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // 验证输入
    if (!token) {
      return NextResponse.json(
        { error: '验证令牌是必填项' },
        { status: 400 }
      );
    }

    // 查找验证记录
    const verification = await prisma.emailVerification.findFirst({
      where: {
        token,
        type: 'REGISTRATION',
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: true
      }
    });

    if (!verification) {
      return NextResponse.json(
        { error: '验证令牌无效或已过期' },
        { status: 400 }
      );
    }

    // 更新用户邮箱验证状态
    await prisma.user.update({
      where: { id: verification.userId || '' },
      data: {
        emailVerified: true,
        updatedAt: new Date()
      }
    });

    // 标记验证记录为已使用
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: {
        usedAt: new Date()
      }
    });

    // 创建审计日志
    await prisma.auditLog.create({
      data: {
        userId: verification.userId || undefined,
        action: 'EMAIL_VERIFIED',
        resource: 'User',
        resourceId: verification.userId || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      message: '邮箱验证成功'
    });

  } catch (error) {
    console.error('邮箱验证错误:', error);
    return NextResponse.json(
      { error: '邮箱验证失败，请稍后重试' },
      { status: 500 }
    );
  }
}