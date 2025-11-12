#!/usr/bin/env node

/**
 * 测试数据库连接
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function testConnection() {
  console.log('🔍 测试数据库连接...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ 错误: DATABASE_URL 环境变量未设置');
    process.exit(1);
  }
  
  // 隐藏密码显示连接信息
  const urlWithoutPassword = databaseUrl.replace(/:([^@]+)@/, ':****@');
  console.log('📡 连接字符串:', urlWithoutPassword);
  console.log('');
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('🔌 正在连接到数据库...');
    await client.connect();
    console.log('✅ 连接成功！\n');
    
    // 测试查询
    console.log('🧪 执行测试查询...');
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('✅ 查询成功！');
    console.log('⏰ 数据库时间:', result.rows[0].current_time);
    console.log('📦 PostgreSQL 版本:', result.rows[0].pg_version.split('\n')[0]);
    console.log('');
    
    // 检查 user_profiles 表是否存在
    console.log('🔍 检查 user_profiles 表...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
      ) as exists
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ user_profiles 表存在');
      
      // 统计用户数量
      const userCount = await client.query('SELECT COUNT(*) as count FROM user_profiles');
      console.log(`👥 用户数量: ${userCount.rows[0].count}`);
    } else {
      console.log('⚠️  user_profiles 表不存在（需要运行迁移）');
    }
    
    console.log('\n✅ 所有测试通过！数据库连接正常！');
    
  } catch (error) {
    console.error('\n❌ 连接失败:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 提示: 密码认证失败，请检查：');
      console.error('   1. Supabase Dashboard 中的密码是否正确');
      console.error('   2. .env.local 中的密码是否已 URL 编码');
      console.error('   3. 密码中的特殊字符是否正确编码：');
      console.error('      % → %25');
      console.error('      $ → %24');
      console.error('      @ → %40');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

testConnection();
