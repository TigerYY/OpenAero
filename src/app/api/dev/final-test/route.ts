import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('开始最终集成测试...');
    
    const supabase = getSupabaseServerClient();
    const testResults: any = {};
    
    // 1. 测试认证功能
    console.log('1. 测试认证功能...');
    
    // 获取现有测试用户
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'testuser3@gmail.com')
      .single();
    
    if (existingUser) {
      testResults.auth = {
        userExists: true,
        userData: existingUser
      };
      
      // 测试登录
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'testuser3@gmail.com',
        password: 'TestUser123!'
      });
      
      testResults.auth.login = {
        success: !loginError,
        error: loginError?.message,
        hasSession: !!loginData?.session,
        userEmail: loginData?.user?.email
      };
    } else {
      testResults.auth = {
        userExists: false,
        message: '测试用户不存在'
      };
    }
    
    // 2. 测试数据查询
    console.log('2. 测试数据查询...');
    
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(5);
    
    testResults.dataQuery = {
      categories: {
        success: !categoriesError,
        error: categoriesError?.message,
        count: categories?.length || 0
      }
    };
    
    const { data: solutions, error: solutionsError } = await supabase
      .from('solutions')
      .select(`
        *,
        categories(name),
        users(name)
      `)
      .limit(3);
    
    testResults.dataQuery.solutions = {
      success: !solutionsError,
      error: solutionsError?.message,
      count: solutions?.length || 0,
      sampleData: solutions?.[0] || null
    };
    
    // 3. 测试关联查询
    console.log('3. 测试关联查询...');
    
    const { data: solutionWithTags, error: joinError } = await supabase
      .from('solutions')
      .select(`
        title,
        categories(name),
        solution_tags(
          tags(name)
        )
      `)
      .limit(2);
    
    testResults.joins = {
      success: !joinError,
      error: joinError?.message,
      data: solutionWithTags
    };
    
    // 4. 测试数据完整性
    console.log('4. 测试数据完整性...');
    
    const { data: stats, error: statsError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        role,
        solutions_count:solutions(count)
      `)
      .limit(3);
    
    testResults.integrity = {
      success: !statsError,
      error: statsError?.message,
      data: stats
    };
    
    // 5. 测试实时连接（如果支持）
    console.log('5. 测试实时功能...');
    
    try {
      const channel = supabase.channel('test-channel');
      testResults.realtime = {
        success: true,
        message: '实时通道创建成功'
      };
      channel.unsubscribe();
    } catch (error) {
      testResults.realtime = {
        success: false,
        error: error instanceof Error ? error.message : '实时功能测试失败'
      };
    }
    
    // 6. 生成测试报告
    console.log('6. 生成测试报告...');
    
    const allTestsPassed = Object.values(testResults).every((result: any) => {
      if (typeof result === 'object' && result !== null) {
        return result.success !== false;
      }
      return true;
    });
    
    const report = {
      timestamp: new Date().toISOString(),
      overallSuccess: allTestsPassed,
      testSummary: {
        authentication: testResults.auth?.login?.success || false,
        dataQuery: Object.values(testResults.dataQuery || {}).every((r: any) => r.success),
        joins: testResults.joins?.success || false,
        integrity: testResults.integrity?.success || false,
        realtime: testResults.realtime?.success || false
      },
      detailedResults: testResults,
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') + '/***',
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    };
    
    return NextResponse.json({
      success: true,
      message: allTestsPassed ? '所有集成测试通过' : '部分测试失败，请检查详细结果',
      report
    });
    
  } catch (error) {
    console.error('集成测试失败:', error);
    return NextResponse.json({
      success: false,
      error: '集成测试失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}