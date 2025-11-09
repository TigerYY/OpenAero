import { NextRequest } from 'next/server';
import { requireAdmin, requireUser, requireCreator } from '@/lib/supabase-server-auth';

/**
 * 检查管理员权限的包装函数
 * 替代 NextAuth 的 getServerSession + authOptions
 */
export async function checkAdminAuth(request: NextRequest) {
  const result = await requireAdmin(request);
  if (result.error) {
    return { error: result.error, status: result.status };
  }
  return { session: result.session };
}

/**
 * 检查用户权限的包装函数
 */
export async function checkUserAuth(request: NextRequest) {
  const result = await requireUser(request);
  if (result.error) {
    return { error: result.error, status: result.status };
  }
  return { session: result.session };
}

/**
 * 检查创作者权限的包装函数
 */
export async function checkCreatorAuth(request: NextRequest) {
  const result = await requireCreator(request);
  if (result.error) {
    return { error: result.error, status: result.status };
  }
  return { session: result.session };
}