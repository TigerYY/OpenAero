import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * 开发环境专用：手动验证用户邮箱
 * 仅用于开发测试，生产环境请删除此文件
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '此功能仅在开发环境可用' },
      { status: 403 }
    );
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: '邮箱是必填项' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    // 查找用户
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('获取用户列表失败:', fetchError);
      return NextResponse.json(
        { error: '获取用户列表失败' },
        { status: 500 }
      );
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 手动验证用户邮箱
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('验证邮箱失败:', updateError);
      return NextResponse.json(
        { error: '验证邮箱失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '邮箱验证成功，现在可以登录了',
      email: user.email
    });

  } catch (error) {
    console.error('验证邮箱错误:', error);
    return NextResponse.json(
      { error: '验证邮箱失败，请稍后重试' },
      { status: 500 }
    );
  }
}