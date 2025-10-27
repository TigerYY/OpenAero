import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { compareVersions } from '@/lib/solution-version';
import { prisma } from '@/lib/db';

// GET /api/solutions/[id]/versions/compare?v1=1&v2=2 - 比较两个版本
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
    const { searchParams } = new URL(request.url);
    const v1 = searchParams.get('v1');
    const v2 = searchParams.get('v2');

    if (!v1 || !v2) {
      return NextResponse.json({ error: '缺少版本参数' }, { status: 400 });
    }

    const version1 = parseInt(v1);
    const version2 = parseInt(v2);

    if (isNaN(version1) || isNaN(version2)) {
      return NextResponse.json({ error: '版本号必须是数字' }, { status: 400 });
    }

    // 验证用户权限
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      select: { userId: true, creatorId: true }
    });

    if (!solution) {
      return NextResponse.json({ error: '方案不存在' }, { status: 404 });
    }

    const isOwner = solution.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const comparison = await compareVersions(solutionId, version1, version2);
    
    return NextResponse.json({ comparison });
  } catch (error) {
    console.error('版本比较失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}