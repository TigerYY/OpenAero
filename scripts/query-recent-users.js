#!/usr/bin/env node

/**
 * 查询最近注册的5个用户
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必需的环境变量');
  console.error('请确保 .env.local 中包含:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function queryRecentUsers() {
  console.log('🔍 查询最近注册的5个用户...\n');

  try {
    // 查询 Supabase Auth 用户（最近注册的5个）
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 5,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });

    if (authError) {
      console.error('❌ 查询失败:', authError.message);
      return;
    }

    if (!authUsers || !authUsers.users || authUsers.users.length === 0) {
      console.log('📭 没有找到用户');
      return;
    }

    console.log(`✅ 找到 ${authUsers.users.length} 个用户:\n`);

    // 获取用户资料
    const userIds = authUsers.users.map(u => u.id);
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', userIds);

    const profileMap = {};
    if (profiles && !profileError) {
      profiles.forEach(profile => {
        profileMap[profile.user_id] = profile;
      });
    }

    // 显示用户信息
    authUsers.users.forEach((user, index) => {
      const profile = profileMap[user.id];
      console.log(`${index + 1}. ${user.email || '未设置邮箱'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   创建时间: ${new Date(user.created_at).toLocaleString('zh-CN')}`);
      console.log(`   邮箱验证: ${user.email_confirmed_at ? '✅' : '❌'}`);
      
      if (profile) {
        console.log(`   显示名称: ${profile.display_name || '未设置'}`);
        console.log(`   角色: ${profile.role || 'USER'}`);
        console.log(`   状态: ${profile.status || 'ACTIVE'}`);
      } else {
        console.log(`   资料: ⚠️  未创建用户资料`);
      }
      console.log('');
    });

    // 统计信息
    console.log('📊 统计信息:');
    console.log(`   总用户数: ${authUsers.total || authUsers.users.length}`);
    console.log(`   已显示: ${authUsers.users.length} 个最近注册的用户`);

  } catch (error) {
    console.error('❌ 查询出错:', error.message);
    console.error(error);
  }
}

queryRecentUsers();

