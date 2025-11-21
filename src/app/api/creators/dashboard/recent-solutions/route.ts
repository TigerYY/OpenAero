import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

import { requireCreatorAuth } from '@/lib/api-helpers';
import { ensureCreatorProfile } from '@/lib/creator-profile-utils';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await requireCreatorAuth(request);
    if (!authResult.success) {
      return authResult.response || NextResponse.json(
        { success: false, error: authResult.error || '未授权访问' },
        { status: 403 }
      );
    }

    const userId = authResult.user.id;

    // 确保用户有 CreatorProfile（如果用户有 CREATOR 角色但没有档案，自动创建）
    const creatorProfile = await ensureCreatorProfile(userId);

    if (!creatorProfile) {
      return NextResponse.json(
        { error: '创作者档案不存在' },
        { status: 404 }
      );
    }

    // 获取最近的方案
    const recentSolutions = await prisma.solution.findMany({
      where: {
        creator_id: creatorProfile.id
      },
      select: {
        id: true,
        title: true,
        status: true,
        price: true,
        created_at: true,
        updated_at: true
      },
      orderBy: {
        updated_at: 'desc'
      },
      take: 10
    });

    // 格式化数据
    const formattedSolutions = recentSolutions.map(solution => ({
      id: solution.id,
      title: solution.title,
      status: solution.status,
      price: Number(solution.price),
      createdAt: solution.created_at?.toISOString() || new Date().toISOString(),
      updatedAt: solution.updated_at?.toISOString() || solution.created_at?.toISOString() || new Date().toISOString(),
      viewCount: Math.floor(Math.random() * 1000), // 模拟数据
      downloadCount: Math.floor(Math.random() * 100) // 模拟数据
    }));

    return NextResponse.json({
      success: true,
      data: formattedSolutions
    });

  } catch (error) {
    console.error('获取最近方案失败:', error);
    
    return NextResponse.json(
      { error: '获取最近方案失败' },
      { status: 500 }
    );
  }
}