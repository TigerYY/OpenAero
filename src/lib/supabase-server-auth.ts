import { getSupabaseServerClient } from '@/lib/supabase';
import { NextRequest } from 'next/server';

/**
 * 获取服务器端Supabase会话
 * 替代NextAuth的getServerSession
 */
export async function getServerSession(request?: NextRequest) {
  try {
    let supabase;
    
    // 如果有请求对象，使用能够读取cookies的客户端
    if (request) {
      const { createSupabaseServerFromRequest } = await import('./auth/supabase-client');
      supabase = createSupabaseServerFromRequest(request);
    } else {
      // 否则使用标准服务器客户端
      supabase = getSupabaseServerClient();
    }
    
    // 获取用户会话（会自动从cookies中读取）
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('获取会话失败:', error);
      return null;
    }
    
    if (!session || !session.user) {
      return null;
    }
    
    // 返回标准化的会话格式，兼容NextAuth的结构
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || 
              `${session.user.user_metadata?.first_name || ''} ${session.user.user_metadata?.last_name || ''}`.trim() ||
              session.user.email?.split('@')[0],
        image: session.user.user_metadata?.avatar_url,
        role: session.user.user_metadata?.role || 'USER'
      },
      expires: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
    };
  } catch (error) {
    console.error('服务器会话获取错误:', error);
    return null;
  }
}

/**
 * 验证管理员权限
 */
export async function requireAdmin(request?: NextRequest) {
  const session = await getServerSession(request);
  
  if (!session) {
    return { error: '未认证', status: 401 };
  }
  
  if (session.user.role !== 'ADMIN') {
    return { error: '权限不足', status: 403 };
  }
  
  return { session };
}

/**
 * 验证创作者权限
 */
export async function requireCreator(request?: NextRequest) {
  const session = await getServerSession(request);
  
  if (!session) {
    return { error: '未认证', status: 401 };
  }
  
  // 支持多角色检查：从 userProfile 获取 roles 数组
  let userRoles: string[] = [];
  if ((session.user as any).roles && Array.isArray((session.user as any).roles)) {
    userRoles = (session.user as any).roles;
  } else if (session.user.role) {
    userRoles = [session.user.role];
  }
  
  // 检查是否包含 CREATOR、ADMIN 或 SUPER_ADMIN 角色
  const hasCreatorRole = userRoles.includes('CREATOR') || 
                        userRoles.includes('ADMIN') || 
                        userRoles.includes('SUPER_ADMIN');
  
  if (!hasCreatorRole) {
    return { error: '权限不足', status: 403 };
  }
  
  return { session };
}

/**
 * 验证用户权限
 */
export async function requireUser(request?: NextRequest) {
  const session = await getServerSession(request);
  
  if (!session) {
    return { error: '未认证', status: 401 };
  }
  
  return { session };
}

/**
 * 可选认证验证
 */
export async function optionalAuth(request?: NextRequest) {
  const session = await getServerSession(request);
  return { session };
}

/**
 * 检查管理员权限的辅助函数
 */
export async function checkAdminAuth(request?: NextRequest) {
  const result = await requireAdmin(request);
  if (result.error) {
    throw new Error(result.error);
  }
  return result.session;
}