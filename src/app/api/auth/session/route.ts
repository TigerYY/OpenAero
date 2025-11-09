import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSession, refreshSession } from '@/lib/supabase-auth';

// 获取当前会话信息
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 使用 Supabase 验证令牌并获取会话
    const { data: { session }, error } = await getCurrentSession();

    if (error || !session) {
      return NextResponse.json(
        { error: '认证令牌无效或已过期' },
        { status: 401 }
      );
    }

    // 验证令牌匹配
    if (session.access_token !== token) {
      return NextResponse.json(
        { error: '认证令牌无效' },
        { status: 401 }
      );
    }

    const user = session.user;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || 
             `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
             user.email?.split('@')[0] || '',
        firstName: user.user_metadata?.first_name,
        lastName: user.user_metadata?.last_name,
        role: user.user_metadata?.role || 'USER',
        emailVerified: user.email_confirmed_at ? true : false,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('获取会话错误:', error);
    return NextResponse.json(
      { error: '获取会话信息失败' },
      { status: 500 }
    );
  }
}

// 刷新会话令牌
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 使用 Supabase 刷新会话
    const { data, error } = await refreshSession();

    if (error || !data.session) {
      return NextResponse.json(
        { error: '刷新会话失败，请重新登录' },
        { status: 401 }
      );
    }

    const user = data.session.user;

    return NextResponse.json({
      success: true,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || 
             `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
             user.email?.split('@')[0] || '',
        firstName: user.user_metadata?.first_name,
        lastName: user.user_metadata?.last_name,
        role: user.user_metadata?.role || 'USER',
        emailVerified: user.email_confirmed_at ? true : false,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('刷新会话错误:', error);
    return NextResponse.json(
      { error: '刷新会话失败' },
      { status: 500 }
    );
  }
}

// 登出（删除会话）
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 获取当前会话进行验证
    const { data: { session }, error } = await getCurrentSession();

    if (error || !session) {
      return NextResponse.json(
        { error: '认证令牌无效' },
        { status: 401 }
      );
    }

    // 验证令牌匹配
    if (session.access_token !== token) {
      return NextResponse.json(
        { error: '认证令牌无效' },
        { status: 401 }
      );
    }

    // Supabase 会话管理由客户端处理，服务端只需要确认令牌有效
    return NextResponse.json({
      success: true,
      message: '登出成功'
    });

  } catch (error) {
    console.error('登出错误:', error);
    return NextResponse.json(
      { error: '登出失败' },
      { status: 500 }
    );
  }
}