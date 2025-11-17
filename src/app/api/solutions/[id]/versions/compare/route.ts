import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

import { checkAdminAuth } from '@/lib/api-auth-helpers';
import { compareVersions } from '@/lib/solution-version';

// GET /api/solutions/[id]/versions/compare?v1=1&v2=2 - 比较两个版本
export async function GET(
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
    const searchParams = request.nextUrl.searchParams;
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
    const userRoles = Array.isArray(session?.user?.roles) 
      ? session.user.roles 
      : (session?.user?.role ? [session.user.role] : []);
    const isAdmin = userRoles.includes('ADMIN');
    
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