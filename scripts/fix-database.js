#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cardynuoazvaytvinxvm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcmR5bnVvYXp2YXl0dmlueHZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU4OTQxNSwiZXhwIjoyMDc2MTY1NDE1fQ.g29Owquq57cTYGh72S500HCN7DYuRxbkH01qdvErDAo';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🔍 开始数据库诊断和修复...\n');

  // 1. 检查 user_profiles 表
  console.log('步骤 1/4: 检查 user_profiles 表...');
  const { count: profileCount, error: countError } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ 无法访问 user_profiles 表:', countError.message);
    return;
  }
  console.log(`✓ 表存在，共有 ${profileCount} 条记录\n`);

  // 2. 查找缺少 profile 的用户
  console.log('步骤 2/4: 查找缺少 profile 的用户...');
  
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('❌ 无法获取用户列表:', usersError.message);
    return;
  }

  console.log(`✓ 找到 ${users.length} 个认证用户`);

  const usersWithoutProfile = [];
  
  for (const user of users) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      usersWithoutProfile.push(user);
    }
  }

  console.log(`✓ 发现 ${usersWithoutProfile.length} 个用户缺少 profile\n`);

  if (usersWithoutProfile.length === 0) {
    console.log('✅ 所有用户都有 profile，数据库状态正常！');
    return;
  }

  // 3. 修复缺少 profile 的用户
  console.log('步骤 3/4: 修复缺少 profile 的用户...');
  
  let successCount = 0;
  let failCount = 0;

  for (const user of usersWithoutProfile) {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        role: 'USER',
        status: 'ACTIVE',
        permissions: [],
        is_blocked: false,
      });

    if (error) {
      console.error(`  ✗ 创建失败 (${user.email}):`, error.message);
      failCount++;
    } else {
      console.log(`  ✓ 已创建 profile: ${user.email}`);
      successCount++;
    }
  }

  console.log(`\n修复完成: ${successCount} 成功, ${failCount} 失败\n`);

  // 4. 验证修复结果
  console.log('步骤 4/4: 验证修复结果...');
  
  const stillMissing = [];
  for (const user of usersWithoutProfile) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      stillMissing.push(user.email);
    }
  }

  if (stillMissing.length === 0) {
    console.log('✅ 所有用户 profile 已修复！');
  } else {
    console.log(`⚠️  仍有 ${stillMissing.length} 个用户缺少 profile:`);
    stillMissing.forEach(email => console.log(`  - ${email}`));
  }

  console.log('\n🎉 数据库修复完成！');
  console.log('\n下一步：');
  console.log('1. 重启开发服务器: npm run dev');
  console.log('2. 清除浏览器缓存');
  console.log('3. 访问 http://localhost:3000/zh-CN/profile 测试');
}

main().catch(console.error);
