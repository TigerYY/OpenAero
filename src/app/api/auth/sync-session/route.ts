/**
 * 同步 Session 到 Cookies API
 * POST /api/auth/sync-session
 * 将浏览器端的 session 同步到 cookies，以便服务器端 API 路由可以读取
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerFromRequest } from '@/lib/auth/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, refresh_token } = body;

    if (!access_token) {
      return NextResponse.json(
        { error: '缺少 access_token' },
        { status: 400 }
      );
    }

    // 创建响应对象（先创建，以便设置 cookies）
    const response = NextResponse.json({
      success: true,
      message: 'Session 同步成功',
    });

    // 创建 Supabase 客户端（传入 response 以便设置 cookies）
    const supabase = createSupabaseServerFromRequest(request, response);

    // 设置 session（这会自动设置 cookies 到 response）
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    });

    if (error) {
      console.error('设置 session 失败:', error);
      return NextResponse.json(
        { error: '设置 session 失败' },
        { status: 500 }
      );
    }

    return response;
  } catch (error) {
    console.error('同步 session 异常:', error);
    return NextResponse.json(
      { error: '同步 session 失败' },
      { status: 500 }
    );
  }
}

