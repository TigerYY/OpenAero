import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth-config';
import { db as prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 检查用户是否为创作者
    if (session.user.role !== 'CREATOR') {
      return NextResponse.json(
        { error: '只有创作者可以访问此接口' },
        { status: 403 }
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