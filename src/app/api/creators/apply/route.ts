import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { creatorApplicationSchema } from '@/lib/validations';
import { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = creatorApplicationSchema.parse(body);

    // 这里应该从认证中获取用户ID，暂时使用模拟数据
    const userId = 'temp-user-id'; // TODO: 从认证中获取

    // 检查用户是否已经是创作者
    const existingProfile = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          error: '您已经是创作者了',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 创建创作者档案
    const creatorProfile = await prisma.creatorProfile.create({
      data: {
        userId,
        bio: validatedData.bio,
        website: validatedData.website || null,
        experience: validatedData.experience,
        specialties: validatedData.specialties,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      data: creatorProfile,
      message: '创作者申请提交成功，我们将在3个工作日内审核您的申请',
    } as ApiResponse);

  } catch (error) {
    console.error('Error creating creator application:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: '请检查输入信息',
        } as ApiResponse,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '提交申请失败，请稍后重试',
      } as ApiResponse,
      { status: 500 }
    );
  }
}
