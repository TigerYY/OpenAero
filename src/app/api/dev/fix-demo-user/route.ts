import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();
    
    // 1. 获取现有的demo用户
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'demo@openaero.com')
      .single();
    
    if (fetchError || !existingUser) {
      return NextResponse.json({
        success: false,
        error: '找不到演示用户'
      });
    }
    
    // 2. 在Supabase Auth中创建对应的用户
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'demo@openaero.com',
      password: 'DemoUser123!',
      email_confirm: true,
      user_metadata: {
        first_name: '演示',
        last_name: '用户',
        role: 'CREATOR'
      }
    });
    
    if (authError && !authError.message.includes('already registered')) {
      return NextResponse.json({
        success: false,
        error: '创建Auth用户失败',
        details: authError
      });
    }
    
    // 3. 如果创建成功，更新数据库中的用户ID
    if (authUser?.user && !authError) {
      // 删除旧的数据库记录
      await supabase
        .from('users')
        .delete()
        .eq('email', 'demo@openaero.com');
      
      // 创建新的数据库记录，使用Auth用户ID
      const { error: updateError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: authUser.user.email,
          name: `${authUser.user.user_metadata?.first_name || ''} ${authUser.user.user_metadata?.last_name || ''}`.trim(),
          role: authUser.user.user_metadata?.role || 'CREATOR',
          email_verified: authUser.user.email_confirmed_at ? true : false,
          created_at: authUser.user.created_at,
          updated_at: new Date().toISOString()
        });
      
      if (updateError) {
        return NextResponse.json({
          success: false,
          error: '更新数据库失败',
          details: updateError
        });
      }
      
      return NextResponse.json({
        success: true,
        message: '演示用户修复成功',
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          metadata: authUser.user.user_metadata
        }
      });
    }
    
    // 如果用户已存在，查找并返回
    const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
    const demoAuthUser = existingAuthUser.users.find(u => u.email === 'demo@openaero.com');
    
    if (demoAuthUser) {
      return NextResponse.json({
        success: true,
        message: '演示用户已存在',
        user: {
          id: demoAuthUser.id,
          email: demoAuthUser.email,
          metadata: demoAuthUser.user_metadata
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      error: '无法创建或找到演示用户'
    });
    
  } catch (error) {
    console.error('修复演示用户失败:', error);
    return NextResponse.json({
      success: false,
      error: '修复演示用户失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}