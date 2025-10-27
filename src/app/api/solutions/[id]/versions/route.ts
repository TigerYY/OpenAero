import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { 
  getSolutionVersionHistory, 
  createSolutionVersion, 
  compareVersions,
  rollbackToVersion 
} from '@/lib/solution-version';
import { prisma } from '@/lib/db';

// GET /api/solutions/[id]/versions - 获取版本历史
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const solutionId = params.id;
    
    // 验证用户权限
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      select: { userId: true, creatorId: true }
    });

    if (!solution) {
      return NextResponse.json({ error: '方案不存在' }, { status: 404 });
    }

    // 检查用户是否有权限查看版本历史
    const isOwner = solution.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const versions = await getSolutionVersionHistory(solutionId);
    
    return NextResponse.json({ versions });
  } catch (error) {
    console.error('获取版本历史失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST /api/solutions/[id]/versions - 创建新版本
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const solutionId = params.id;
    const body = await request.json();
    
    // 验证用户权限
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      select: { userId: true, creatorId: true }
    });

    if (!solution) {
      return NextResponse.json({ error: '方案不存在' }, { status: 404 });
    }

    const isOwner = solution.userId === session.user.id;
    if (!isOwner) {
      return NextResponse.json({ error: '无权限创建版本' }, { status: 403 });
    }

    // 验证必需字段
    const { title, description, category, price, images, features, specs, bom, changeLog } = body;
    
    if (!title || !description || !category || price === undefined) {
      return NextResponse.json({ error: '缺少必需字段' }, { status: 400 });
    }

    const newVersion = await createSolutionVersion({
      solutionId,
      title,
      description,
      category,
      price: Number(price),
      images: images || [],
      features: features || [],
      specs,
      bom,
      changeLog,
      createdBy: session.user.id,
    });

    return NextResponse.json({ version: newVersion }, { status: 201 });
  } catch (error) {
    console.error('创建版本失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}