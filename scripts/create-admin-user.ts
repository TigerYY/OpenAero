/**
 * 创建管理员账号脚本
 * 在 Supabase Auth 和数据库中创建管理员用户
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

// 管理员配置
const ADMIN_CONFIG = {
  email: 'openaero.iot@gmail.com',
  password: 'Admin@OpenAero2024',  // 建议使用强密码
  name: 'OpenAero Admin',
  role: 'ADMIN'
};

async function createAdminUser() {
  console.log('🚀 开始创建管理员账号...\n');

  const pgClient = new Client({
    connectionString: databaseUrl
  });

  try {
    // 连接数据库
    await pgClient.connect();
    console.log('✓ 数据库连接成功\n');

    // 1. 检查用户是否已存在
    console.log('📊 步骤 1: 检查用户是否已存在...');
    const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
    const authUserExists = existingAuthUser?.users.some(u => u.email === ADMIN_CONFIG.email);

    const dbCheckResult = await pgClient.query(
      'SELECT id, email FROM users WHERE email = $1',
      [ADMIN_CONFIG.email]
    );
    const dbUserExists = dbCheckResult.rows.length > 0;

    if (authUserExists || dbUserExists) {
      console.log('⚠️  用户已存在:');
      console.log(`   Supabase Auth: ${authUserExists ? '✓' : '✗'}`);
      console.log(`   数据库: ${dbUserExists ? '✓' : '✗'}`);
      console.log('\n请先删除现有用户或使用不同的邮箱');
      return;
    }

    console.log('   ✓ 用户不存在，可以创建\n');

    // 2. 在 Supabase Auth 中创建用户
    console.log('📝 步骤 2: 在 Supabase Auth 中创建用户...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_CONFIG.email,
      password: ADMIN_CONFIG.password,
      email_confirm: true,  // 自动确认邮箱
      user_metadata: {
        name: ADMIN_CONFIG.name,
        role: ADMIN_CONFIG.role
      }
    });

    if (authError) {
      console.error(`   ❌ 创建失败: ${authError.message}`);
      return;
    }

    console.log(`   ✓ Supabase Auth 用户创建成功`);
    console.log(`   - Auth ID: ${authData.user.id}`);
    console.log(`   - Email: ${authData.user.email}`);

    // 3. 在数据库中创建用户记录
    console.log('\n📝 步骤 3: 在数据库中创建用户记录...');
    
    // 生成唯一的用户 ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pgClient.query(`
      INSERT INTO users (id, email, name, role, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `, [
      userId,
      ADMIN_CONFIG.email,
      ADMIN_CONFIG.name,
      ADMIN_CONFIG.role,
      true
    ]);

    console.log(`   ✓ 数据库用户记录创建成功`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Email: ${ADMIN_CONFIG.email}`);
    console.log(`   - Role: ${ADMIN_CONFIG.role}`);

    // 4. 验证创建结果
    console.log('\n✅ 步骤 4: 验证创建结果...');
    const verifyResult = await pgClient.query(
      'SELECT * FROM users WHERE email = $1',
      [ADMIN_CONFIG.email]
    );

    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      console.log('   ✓ 验证成功！');
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Name: ${user.name}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Email Verified: ${user.email_verified ? '✓' : '✗'}`);
    }

    // 5. 显示登录信息
    console.log('\n🎉 管理员账号创建成功！\n');
    console.log('📋 登录信息:');
    console.log(`   邮箱: ${ADMIN_CONFIG.email}`);
    console.log(`   密码: ${ADMIN_CONFIG.password}`);
    console.log(`   角色: ${ADMIN_CONFIG.role}`);
    console.log('\n⚠️  请立即登录并修改密码！\n');

  } catch (error: any) {
    console.error('\n❌ 创建过程出错:', error.message);
    throw error;
  } finally {
    await pgClient.end();
  }
}

// 执行创建
createAdminUser()
  .then(() => {
    console.log('✅ 完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 失败:', error);
    process.exit(1);
  });
