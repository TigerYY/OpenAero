import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

/**
 * 验证Supabase会话
 */
export async function authenticateSupabaseSession(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  
  // 从请求头获取token
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: '未提供认证令牌' },
      { status: 401 }
    );
  }
  
  const token = authHeader.substring(7);
  
  try {
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
    
    return null; // 验证成功
  } catch (error) {
    return NextResponse.json(
      { error: '认证失败' },
      { status: 401 }
    );
  }
}

/**
 * 要求管理员权限
 */
export function requireSupabaseAdmin() {
  return async (request: NextRequest) => {
    const user = (request as any).user;
    
    if (!user) {
      return NextResponse.json(
        { error: '未认证' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '权限不足，需要管理员权限' },
        { status: 403 }
      );
    }
    
    return null;
  };
}

/**
 * 要求创作者权限
 */
export function requireSupabaseCreator() {
  return async (request: NextRequest) => {
    const user = (request as any).user;
    
    if (!user) {
      return NextResponse.json(
        { error: '未认证' },
        { status: 401 }
      );
    }
    
    if (!['CREATOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: '权限不足，需要创作者权限' },
        { status: 403 }
      );
    }
    
    return null;
  };
}

/**
 * 记录用户操作
 */
export async function logUserAction(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  oldValue?: any,
  newValue?: any,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const { prisma } = await import('@/lib/prisma');
    
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
      },
    });
  } catch (error) {
    console.error('Failed to log user action:', error);
  }
}
