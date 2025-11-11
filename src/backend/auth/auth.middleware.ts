import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

/**
 * 认证中间件
 */
export async function authenticateToken(request: NextRequest) {
  try {
    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    const supabase = getSupabaseServerClient();
    
    // 验证token
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }
    
    // 将用户信息附加到请求对象
    (request as any).user = {
      userId: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || 'USER',
    };
    
    return null; // 认证成功
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: '认证失败' },
      { status: 401 }
    );
  }
}

/**
 * 要求管理员权限
 */
export async function requireAdmin(request: NextRequest) {
  const authResult = await authenticateToken(request);
  if (authResult) {
    return authResult;
  }
  
  const user = (request as any).user;
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: '权限不足，需要管理员权限' },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * 要求创作者权限
 */
export async function requireCreator(request: NextRequest) {
  const authResult = await authenticateToken(request);
  if (authResult) {
    return authResult;
  }
  
  const user = (request as any).user;
  if (!['CREATOR', 'ADMIN'].includes(user.role)) {
    return NextResponse.json(
      { error: '权限不足，需要创作者权限' },
      { status: 403 }
    );
  }
  
  return null;
}
