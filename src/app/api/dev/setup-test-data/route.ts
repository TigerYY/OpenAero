import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('开始创建测试数据...');
    
    const supabase = getSupabaseServerClient();
    const results: any = {};
    
    // 1. 确保测试用户存在
    console.log('创建测试用户...');
    const testUser = {
      email: 'testuser@example.com',
      password: 'TestUser123!',
      firstName: '测试',
      lastName: '用户'
    };
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        first_name: testUser.firstName,
        last_name: testUser.lastName,
        role: 'USER'
      }
    });
    
    if (authError && !authError.message.includes('already registered')) {
      results.user = { success: false, error: authError.message };
    } else {
      results.user = { success: true, data: authUser?.user || { id: 'existing-user' } };
      
      // 同步到数据库
      if (authUser?.user) {
        await supabase
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
      }
    }
    
    // 2. 创建测试分类
    console.log('创建测试分类...');
    const testCategories = [
      {
        id: `cat-test-${Date.now()}-1`,
        name: '航空航天设计',
        description: '飞机、航天器及相关设备的设计方案',
        icon: '✈️'
      },
      {
        id: `cat-test-${Date.now()}-2`,
        name: '机械工程',
        description: '机械零件、装置和系统的设计',
        icon: '⚙️'
      }
    ];
    
    const { data: createdCategories, error: categoriesError } = await supabase
      .from('categories')
      .insert(testCategories)
      .select();
    
    results.categories = {
      success: !categoriesError,
      error: categoriesError?.message,
      data: createdCategories || []
    };
    
    // 3. 创建测试标签
    console.log('创建测试标签...');
    const testTags = [
      { id: `tag-test-${Date.now()}-1`, name: 'CAD设计' },
      { id: `tag-test-${Date.now()}-2`, name: '3D建模' },
      { id: `tag-test-${Date.now()}-3`, name: '原型制作' },
      { id: `tag-test-${Date.now()}-4`, name: '开源项目' }
    ];
    
    const { data: createdTags, error: tagsError } = await supabase
      .from('tags')
      .insert(testTags)
      .select();
    
    results.tags = {
      success: !tagsError,
      error: tagsError?.message,
      data: createdTags || []
    };
    
    // 4. 创建测试解决方案
    const userId = authUser?.user?.id || results.user.data?.id;
    if (createdCategories && createdCategories.length > 0 && userId) {
      console.log('创建测试解决方案...');
      const testSolutions = [
        {
          id: `sol-test-${Date.now()}-1`,
          title: '小型无人机机翼设计',
          description: '适用于小型无人机的轻量化机翼设计方案，采用复合材料结构，优化空气动力学性能。',
          category_id: createdCategories[0].id,
          created_by: userId,
          status: 'APPROVED',
          featured: true,
          view_count: 156
        },
        {
          id: `sol-test-${Date.now()}-2`,
          title: '高精度齿轮传动系统',
          description: '用于工业机械的高精度齿轮传动系统设计，提供稳定可靠的扭矩传递。',
          category_id: createdCategories[1]?.id || createdCategories[0].id,
          created_by: userId,
          status: 'APPROVED',
          featured: false,
          view_count: 89
        }
      ];
      
      const { data: createdSolutions, error: solutionsError } = await supabase
        .from('solutions')
        .insert(testSolutions)
        .select();
      
      results.solutions = {
        success: !solutionsError,
        error: solutionsError?.message,
        data: createdSolutions || []
      };
      
    // 5. 关联标签到解决方案
    if ((results.solutions.data?.length || 0) > 0 && (results.tags.data?.length || 0) > 0) {
        console.log('关联标签到解决方案...');
        const solutions = results.solutions.data;
        const tags = results.tags.data;
        const solutionTags = [
          { solution_id: solutions[0].id, tag_id: tags[0].id },
          { solution_id: solutions[0].id, tag_id: tags[1].id },
          { solution_id: solutions[1].id, tag_id: tags[2].id },
          { solution_id: solutions[1].id, tag_id: tags[3].id }
        ];
        
        const { error: relationError } = await supabase
          .from('solution_tags')
          .insert(solutionTags);
        
        results.solution_tags = {
          success: !relationError,
          error: relationError?.message
        };
      }
    }
    
    // 6. 验证数据完整性
    console.log('验证数据完整性...');
    const { data: summary, error: summaryError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        solutions_count:solutions(count),
        categories_count:categories(count)
      `);
    
    results.integrity = {
      success: !summaryError,
      error: summaryError?.message,
      data: summary
    };
    
    return NextResponse.json({
      success: true,
      message: '测试数据创建完成',
      timestamp: new Date().toISOString(),
      results,
      summary: {
        userCreated: !!results.user.success,
        categoriesCreated: results.categories?.data?.length || 0,
        tagsCreated: results.tags?.data?.length || 0,
        solutionsCreated: results.solutions?.data?.length || 0,
        allSuccessful: Object.values(results).every((r: any) => r.success !== false)
      }
    });
    
  } catch (error) {
    console.error('创建测试数据失败:', error);
    return NextResponse.json({
      success: false,
      error: '创建测试数据失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}