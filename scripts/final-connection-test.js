require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const password = 'Apollo202%@1419';
const encodedPassword = encodeURIComponent(password);

console.log('🔐 密码编码测试:');
console.log('原始密码:', password);
console.log('URL编码:', encodedPassword);
console.log('');

const testConnections = [
  {
    name: 'Direct Connection (db.supabase.co)',
    config: {
      connectionString: `postgresql://postgres:${encodedPassword}@db.cardynuoazvaytvinxvm.supabase.co:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Pooler Transaction Mode (端口6543)',
    config: {
      connectionString: `postgresql://postgres.cardynuoazvaytvinxvm:${encodedPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Pooler Session Mode (端口5432)',
    config: {
      connectionString: `postgresql://postgres.cardynuoazvaytvinxvm:${encodedPassword}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    }
  }
];

async function testConnection(name, config) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🧪 测试: ${name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const pool = new Pool(config);
  
  try {
    console.log('⏳ 尝试连接...');
    const client = await pool.connect();
    console.log('✅ 连接成功!');
    
    // 测试查询
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log('\n📊 数据库信息:');
    console.log('版本:', result.rows[0].version.substring(0, 50) + '...');
    console.log('数据库:', result.rows[0].current_database);
    console.log('用户:', result.rows[0].current_user);
    
    // 测试表查询
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      LIMIT 5
    `);
    console.log('\n📋 前5个表:', tables.rows.map(r => r.tablename).join(', '));
    
    client.release();
    await pool.end();
    
    return { success: true, config: config.connectionString.substring(0, 100) };
  } catch (error) {
    console.log('❌ 连接失败');
    console.log('错误类型:', error.code || error.name);
    console.log('错误信息:', error.message);
    
    await pool.end();
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🚀 Supabase数据库连接完整测试');
  console.log('═══════════════════════════════════════════════════════');
  
  const results = [];
  
  for (const test of testConnections) {
    const result = await testConnection(test.name, test.config);
    results.push({ name: test.name, ...result });
  }
  
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  📊 测试结果总结');
  console.log('═══════════════════════════════════════════════════════\n');
  
  results.forEach(r => {
    const status = r.success ? '✅ 成功' : '❌ 失败';
    console.log(`${status} - ${r.name}`);
    if (!r.success) {
      console.log(`   错误: ${r.error}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  
  console.log('\n═══════════════════════════════════════════════════════');
  if (successCount > 0) {
    console.log(`✅ 成功: ${successCount}/${results.length} 个连接可用`);
    console.log('\n🎉 数据库连接正常!可以继续使用Prisma了。');
  } else {
    console.log(`❌ 失败: 所有连接都失败了`);
    console.log('\n⚠️  建议:');
    console.log('1. 再次确认密码是否正确');
    console.log('2. 检查Supabase Dashboard的"Pooler settings"');
    console.log('3. 复制完整的连接字符串(包括密码部分)');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

runTests().catch(console.error);
