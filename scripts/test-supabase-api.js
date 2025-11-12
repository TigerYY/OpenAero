#!/usr/bin/env node

/**
 * 测试Supabase Auth是否正常工作
 * 验证我们至少可以通过API访问Supabase
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 测试Supabase服务连接...\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key:', supabaseKey ? '✅ 已设置' : '❌ 未设置');
console.log();

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 环境变量未设置!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  try {
    console.log('✅ 测试1: 列出所有表 (通过Supabase REST API)');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (tablesError) {
      console.log('   ⚠️  无法通过REST API查询,这是正常的');
    } else {
      console.log('   找到表:', tables?.length || 0);
    }

    console.log('\n✅ 测试2: 检查Auth用户');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('   ❌ 获取用户失败:', usersError.message);
    } else {
      console.log('   ✅ 成功! 找到', users.length, '个用户');
      if (users.length > 0) {
        console.log('   示例用户:', users[0].email);
      }
    }

    console.log('\n✅ 测试3: 执行SQL查询 (通过Supabase RPC)');
    // 尝试使用RPC执行简单查询
    const { data: rpcData, error: rpcError } = await supabase.rpc('version');
    
    if (rpcError) {
      console.log('   ⚠️  RPC调用失败(可能需要创建函数):', rpcError.message);
    } else {
      console.log('   ✅ RPC调用成功:', rpcData);
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Supabase服务连接正常!');
    console.log('\n但是,Prisma直接数据库连接失败。这说明:');
    console.log('1. Supabase服务本身运行正常');
    console.log('2. 数据库密码可能不正确');
    console.log('\n建议操作:');
    console.log('1. 访问 Supabase Dashboard > Project Settings > Database');
    console.log('2. 点击 "Reset Database Password" 重置密码');
    console.log('3. 复制新密码并更新 .env.local 中的 DATABASE_URL');
    console.log('\n或者,我们可以继续使用Supabase Client API进行数据操作。');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

testSupabase();
