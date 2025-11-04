import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, adminNotes } = body;

    // 验证输入
    if (!applicationId) {
      return NextResponse.json(
        { error: '申请ID是必填项' },
        { status: 400 }
      );
    }

    // 从认证头中获取管理员信息
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // 这里应该验证JWT令牌并检查管理员权限
    // 暂时使用模拟数据
    const adminUserId = 'admin-user-id'; // TODO: 从JWT令牌中获取实际管理员ID

    // 查找申请记录
    const application = await prisma.creatorApplication.findUnique({
      where: { id: applicationId },
      include: { user: true }
    });

    if (!application) {
      return NextResponse.json(
        { error: '申请记录不存在' },
        { status: 404 }
      );
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: '申请状态不是待审核状态' },
        { status: 400 }
      );
    }

    // 更新用户角色为创作者
    await prisma.user.update({
      where: { id: application.userId },
      data: {
        role: 'CREATOR',
        updatedAt: new Date()
      }
    });

    // 更新申请状态为已批准
    await prisma.creatorApplication.update({
      where: { id: applicationId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        adminNotes: adminNotes || null
      }
    });

    // 创建创作者档案
    await prisma.creatorProfile.create({
      data: {
        userId: application.userId,
        bio: application.bio,
        website: application.website,
        experience: application.experience,
        specialties: application.specialties,
        status: 'ACTIVE',
        revenue: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 创建审计日志
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CREATOR_APPLICATION_APPROVED',
        resource: 'CreatorApplication',
        resourceId: applicationId,
        details: {
          applicantUserId: application.userId,
          adminNotes: adminNotes
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    // 发送批准通知邮件（这里应该调用邮件服务）
    // await emailService.sendCreatorApprovalEmail(application.user.email);

    return NextResponse.json({
      success: true,
      message: '创作者申请已批准，用户角色已更新',
      userId: application.userId
    });

  } catch (error) {
    console.error('批准创作者申请错误:', error);
    return NextResponse.json(
      { error: '批准申请失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 拒绝创作者申请
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, rejectionReason } = body;

    // 验证输入
    if (!applicationId || !rejectionReason) {
      return NextResponse.json(
        { error: '申请ID和拒绝原因是必填项' },
        { status: 400 }
      );
    }

    // 从认证头中获取管理员信息
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // 这里应该验证JWT令牌并检查管理员权限
    // 暂时使用模拟数据
    const adminUserId = 'admin-user-id'; // TODO: 从JWT令牌中获取实际管理员ID

    // 查找申请记录
    const application = await prisma.creatorApplication.findUnique({
      where: { id: applicationId },
      include: { user: true }
    });

    if (!application) {
      return NextResponse.json(
        { error: '申请记录不存在' },
        { status: 404 }
      );
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: '申请状态不是待审核状态' },
        { status: 400 }
      );
    }

    // 更新申请状态为已拒绝
    await prisma.creatorApplication.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        rejectionReason: rejectionReason
      }
    });

    // 创建审计日志
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CREATOR_APPLICATION_REJECTED',
        resource: 'CreatorApplication',
        resourceId: applicationId,
        details: {
          applicantUserId: application.userId,
          rejectionReason: rejectionReason
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    // 发送拒绝通知邮件（这里应该调用邮件服务）
    // await emailService.sendCreatorRejectionEmail(application.user.email, rejectionReason);

    return NextResponse.json({
      success: true,
      message: '创作者申请已拒绝',
      userId: application.userId
    });

  } catch (error) {
    console.error('拒绝创作者申请错误:', error);
    return NextResponse.json(
      { error: '拒绝申请失败，请稍后重试' },
      { status: 500 }
    );
  }
}