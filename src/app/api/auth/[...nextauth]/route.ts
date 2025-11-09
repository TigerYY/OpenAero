/**
 * Supabase认证API路由
 * 兼容现有的NextAuth API结构
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { authManager } from '@/lib/supabase-auth';

// 处理所有认证相关的API请求
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    const supabase = getSupabaseServerClient();
    
    switch (action) {
      case 'session':
        // 获取当前会话
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        
        return NextResponse.json({ session });
        
      case 'user':
        // 获取当前用户
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          return NextResponse.json({ error: userError.message }, { status: 400 });
        }
        
        return NextResponse.json({ user });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      case 'signin':
        // 用户登录
        const signInResult = await authManager.signIn({
          email: data.email,
          password: data.password,
        });
        
        if (signInResult.error) {
          return NextResponse.json(
            { error: signInResult.error.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          user: signInResult.data.user,
          session: signInResult.data.session,
        });
        
      case 'signup':
        // 用户注册
        const signUpResult = await authManager.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: data.metadata,
          },
        });
        
        if (signUpResult.error) {
          return NextResponse.json(
            { error: signUpResult.error.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          user: signUpResult.data.user,
          session: signUpResult.data.session,
        });
        
      case 'signout':
        // 用户登出
        const signOutResult = await authManager.signOut();
        
        if (signOutResult.error) {
          return NextResponse.json(
            { error: signOutResult.error.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({ success: true });
        
      case 'reset-password':
        // 重置密码
        const resetResult = await authManager.resetPassword(data.email);
        
        if (resetResult.error) {
          return NextResponse.json(
            { error: resetResult.error.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({ success: true });
        
      case 'update-profile':
        // 更新用户资料
        const updateResult = await authManager.updateUser({
          data: data.metadata,
        });
        
        if (updateResult.error) {
          return NextResponse.json(
            { error: updateResult.error.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          user: updateResult.data.user,
        });
        
      case 'verify-otp':
        // 验证OTP
        const verifyResult = await authManager.verifyOtp({
          email: data.email,
          token: data.token,
          type: data.type,
        });
        
        if (verifyResult.error) {
          return NextResponse.json(
            { error: verifyResult.error.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          user: verifyResult.data.user,
          session: verifyResult.data.session,
        });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OAuth回调处理
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/';
    
    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/error?error=missing_code', request.url)
      );
    }
    
    const supabase = getSupabaseServerClient();
    
    // 交换OAuth code为session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      return NextResponse.redirect(
        new URL('/auth/error?error=oauth_failed', request.url)
      );
    }
    
    // 重定向到指定页面
    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=callback_failed', request.url)
    );
  }
}