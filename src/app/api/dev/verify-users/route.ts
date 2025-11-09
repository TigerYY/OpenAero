import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('开始验证用户数据...');
    
    const supabase = getSupabaseServerClient();
    
    // 获取所有用户
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      return NextResponse.json({
        success: false,
        error: '获取用户失败',
        details: usersError
      }, { status: 500 });
    }
    
    // 获取Supabase Auth用户列表
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('获取Auth用户失败:', authError);
    }
    
    return NextResponse.json({
      success: true,
      message: '用户数据验证完成',
      timestamp: new Date().toISOString(),
      databaseUsers: users,
      authUsers: authUsers?.users || [],
      summary: {
        databaseUserCount: users?.length || 0,
        authUserCount: authUsers?.users?.length || 0,
        needsSync: (users?.length || 0) !== (authUsers?.users?.length || 0)
      }
    });
    
  } catch (error) {
    console.error('用户验证失败:', error);
    return NextResponse.json({
      success: false,
      error: '用户验证失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: '邮箱和密码是必填项'
      }, { status: 400 });
    }
    
    const supabase = getSupabaseServerClient();
    
    // 创建或更新用户
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: '测试',
        last_name: '用户',
        role: 'USER'
      }
    });
    
    if (authError) {
      console.error('创建Auth用户失败:', authError);
      return NextResponse.json({
        success: false,
        error: '创建用户失败',
        details: authError
      }, { status: 500 });
    }
    
    // 同步到数据库
    if (authUser.user) {
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: authUser.user.id,
          email: authUser.user.email,
          name: `${authUser.user.user_metadata?.first_name || ''} ${authUser.user.user_metadata?.last_name || ''}`.trim(),
          role: authUser.user.user_metadata?.role || 'USER',
          email_verified: authUser.user.email_confirmed_at ? true : false,
          created_at: authUser.user.created_at,
          updated_at: new Date().toISOString()
        });
      
      if (dbError) {
        console.error('同步数据库失败:', dbError);
        return NextResponse.json({
          success: false,
          error: '同步数据库失败',
          details: dbError
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: '用户创建成功',
      user: authUser.user
    });
    
  } catch (error) {
    console.error('创建用户失败:', error);
    return NextResponse.json({
      success: false,
      error: '创建用户失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}