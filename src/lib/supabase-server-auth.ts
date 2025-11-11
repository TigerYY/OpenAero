import { getSupabaseServerClient } from '@/lib/supabase';
import { NextRequest } from 'next/server';

/**
 * 获取服务器端Supabase会话
 * 替代NextAuth的getServerSession
 */
export async function getServerSession(request?: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    // 从请求头或cookie中获取令牌
    let accessToken = null;
    
    if (request) {
      // 尝试从Authorization头获取
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
      
      // 尝试从cookie获取
      if (!accessToken) {
        accessToken = request.cookies.get('sb-access-token')?.value;
      }
    }
    
    // 获取用户会话
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
  
  if (!['CREATOR', 'ADMIN'].includes(session.user.role)) {
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