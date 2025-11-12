/**
 * 验证用户清理结果
 * 检查数据库和 Supabase Auth 中的用户
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
const { Client } = pkg;

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
config({ path: resolve(__dirname, '../.env.local') });

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyUsers() {
  console.log('🔍 验证用户清理结果...\n');

  const pgClient = new Client({
    connectionString: databaseUrl
  });

  try {
    // 连接数据库
    await pgClient.connect();
    console.log('✓ 数据库连接成功\n');

    // 1. 检查数据库用户
    console.log('📊 数据库用户 (PostgreSQL):');
    const dbResult = await pgClient.query(`
      SELECT id, email, name, role, email_verified, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    if (dbResult.rows.length === 0) {
      console.log('   ❌ 没有用户\n');
    } else {
      console.log(`   总数: ${dbResult.rows.length}\n`);
      dbResult.rows.forEach((user: any, index: number) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - 角色: ${user.role}`);
        console.log(`      - 邮箱验证: ${user.email_verified ? '✓' : '✗'}`);
        console.log(`      - 创建时间: ${user.created_at}`);
      });
      console.log();
    }

    // 2. 检查 Supabase Auth 用户
    console.log('👤 Supabase Auth 用户:');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log(`   ❌ 获取失败: ${authError.message}\n`);
    } else if (!authData || authData.users.length === 0) {
      console.log('   ❌ 没有用户\n');
    } else {
      console.log(`   总数: ${authData.users.length}\n`);
      authData.users.forEach((user: any, index: number) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      - Auth ID: ${user.id}`);
        console.log(`      - 邮箱验证: ${user.email_confirmed_at ? '✓' : '✗'}`);
        console.log(`      - 创建时间: ${user.created_at}`);
        console.log(`      - 最后登录: ${user.last_sign_in_at || 'Never'}`);
      });
      console.log();
    }

    // 3. 检查数据同步状态
    console.log('🔄 数据同步状态:');
    if (dbResult.rows.length === 0 && (!authData || authData.users.length === 0)) {
      console.log('   ✅ 数据库和 Supabase Auth 都已清空');
    } else if (dbResult.rows.length === 0) {
      console.log('   ⚠️  数据库已清空，但 Supabase Auth 还有用户');
    } else if (!authData || authData.users.length === 0) {
      console.log('   ⚠️  Supabase Auth 已清空，但数据库还有用户');
    } else {
      console.log('   ℹ️  两边都有用户数据');
    }

    console.log('\n📋 清理结果总结:');
    console.log(`   - 数据库用户数: ${dbResult.rows.length}`);
    console.log(`   - Supabase Auth 用户数: ${authData ? authData.users.length : 0}`);
    console.log(`   - 状态: ${dbResult.rows.length === 0 && (!authData || authData.users.length === 0) ? '✅ 清理完成' : '⚠️  仍有残留数据'}`);

  } catch (error: any) {
    console.error('\n❌ 验证过程出错:', error.message);
    throw error;
  } finally {
    await pgClient.end();
  }
}

// 执行验证
verifyUsers()
  .then(() => {
    console.log('\n✅ 验证完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 验证失败:', error);
    process.exit(1);
  });
