import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

import { checkCreatorAuth } from '@/lib/api-auth-helpers';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await checkCreatorAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const session = authResult.session;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 获取创作者档案
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return NextResponse.json(
        { error: '创作者档案不存在' },
        { status: 404 }
      );
    }

    // 获取最近的方案
    const recentSolutions = await prisma.solution.findMany({
      where: {
        creatorId: creatorProfile.id
      },
      select: {
        id: true,
        title: true,
        status: true,
        price: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    // 格式化数据
    const formattedSolutions = recentSolutions.map(solution => ({
      id: solution.id,
      title: solution.title,
      status: solution.status,
      price: Number(solution.price),
      createdAt: solution.createdAt.toISOString(),
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