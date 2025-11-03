import { NextResponse } from 'next/server';

import { withErrorHandling, ConflictError } from '@/lib/error-handler';
import { creatorApplySchema } from '@/lib/validations';
import { ApiResponse } from '@/types';

// 模拟数据存储
const mockCreatorProfiles: any[] = [];

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();
  const validatedData = creatorApplySchema.parse(body);

  // 这里应该从认证中获取用户ID，暂时使用模拟数据
  const userId = 'temp-user-id'; // TODO: 从认证中获取

  // 检查用户是否已经是创作者
  const existingProfile = mockCreatorProfiles.find(profile => profile.userId === userId);

  if (existingProfile) {
    throw new ConflictError('您已经是创作者了');
  }

  // 创建创作者档案
  const creatorProfile = {
    id: `creator-${Date.now()}`,
    userId,
    bio: validatedData.bio,
    website: validatedData.website || null,
    experience: validatedData.experience,
    specialties: validatedData.specialties,
    status: 'PENDING',
    revenue: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockCreatorProfiles.push(creatorProfile);

  return NextResponse.json({
    success: true,
    data: creatorProfile,
    message: '创作者申请提交成功，我们将在3个工作日内审核您的申请',
  } as ApiResponse);
});