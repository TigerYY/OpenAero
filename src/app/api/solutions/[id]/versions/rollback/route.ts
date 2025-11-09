import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

import { checkCreatorAuth } from '@/lib/api-auth-helpers';
import { rollbackToVersion } from '@/lib/solution-version';

// POST /api/solutions/[id]/versions/rollback - 回滚到指定版本
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const session = authResult.session;
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const solutionId = params.id;
    const body = await request.json();
    const { targetVersion } = body;

    if (!targetVersion || isNaN(parseInt(targetVersion))) {
      return NextResponse.json({ error: '无效的目标版本' }, { status: 400 });
    }

    // 验证用户权限
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      select: { userId: true, creatorId: true, version: true }
    });

    if (!solution) {
      return NextResponse.json({ error: '方案不存在' }, { status: 404 });
    }

    const isOwner = solution.userId === session.user.id;
    if (!isOwner) {
      return NextResponse.json({ error: '无权限回滚版本' }, { status: 403 });
    }

    // 检查是否回滚到当前版本
    if (solution.version === parseInt(targetVersion)) {
      return NextResponse.json({ error: '不能回滚到当前版本' }, { status: 400 });
    }

    const rollbackVersion = await rollbackToVersion(
      solutionId, 
      parseInt(targetVersion), 
      session.user.id
    );

    return NextResponse.json({ 
      version: rollbackVersion,
      message: `已成功回滚到版本 ${targetVersion}`
    });
  } catch (error) {
    console.error('版本回滚失败:', error);
    
    if (error instanceof Error && error.message.includes('不存在')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}