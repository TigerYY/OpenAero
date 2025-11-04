import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bio, website, experience, specialties } = body;

    // 验证输入
    if (!bio || !experience || !specialties) {
      return NextResponse.json(
        { error: '个人简介、相关经验和专长领域是必填项' },
        { status: 400 }
      );
    }

    // 从认证头中获取用户信息
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 这里应该验证JWT令牌并获取用户ID
    // 暂时使用模拟数据
    const userId = 'temp-user-id'; // TODO: 从JWT令牌中获取实际用户ID

    // 检查用户是否已经是创作者
    const existingCreator = await prisma.user.findFirst({
      where: { 
        id: userId,
        role: 'CREATOR'
      }
    });

    if (existingCreator) {
      return NextResponse.json(
        { error: '您已经是创作者了' },
        { status: 409 }
      );
    }

    // 检查是否已经有待审核的申请
    const existingApplication = await prisma.creatorApplication.findFirst({
      where: { 
        userId,
        status: 'PENDING'
      }
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: '您已经有一个待审核的创作者申请' },
        { status: 409 }
      );
    }

    // 创建创作者申请
    const application = await prisma.creatorApplication.create({
      data: {
        userId,
        bio,
        website: website || null,
        experience,
        specialties,
        status: 'PENDING'
      }
    });

    // 创建审计日志
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATOR_APPLICATION_SUBMITTED',
        resource: 'CreatorApplication',
        resourceId: application.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      message: '创作者申请提交成功，我们将在3个工作日内审核您的申请',
      applicationId: application.id
    });

  } catch (error) {
    console.error('创作者申请错误:', error);
    return NextResponse.json(
      { error: '申请提交失败，请稍后重试' },
      { status: 500 }
    );
  }
}