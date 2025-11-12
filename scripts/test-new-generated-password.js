require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const password = '4gPPhKf90F6ayAka';
const encodedPassword = encodeURIComponent(password);

console.log('🔐 新密码测试:');
console.log('原始密码:', password);
console.log('URL编码:', encodedPassword);
console.log('密码长度:', password.length, '字符');
console.log('');

const testConnections = [
  {
    name: 'Pooler Transaction Mode (推荐用于Prisma)',
    config: {
      connectionString: `postgresql://postgres.cardynuoazvaytvinxvm:${encodedPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Pooler Session Mode',
    config: {
      connectionString: `postgresql://postgres.cardynuoazvaytvinxvm:${encodedPassword}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Direct Connection',
    config: {
      connectionString: `postgresql://postgres:${encodedPassword}@db.cardynuoazvaytvinxvm.supabase.co:5432/postgres`,
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
    const result = await client.query('SELECT version(), current_database(), current_user, now()');
    console.log('\n📊 数据库信息:');
    console.log('PostgreSQL版本:', result.rows[0].version.split(',')[0]);
    console.log('数据库名:', result.rows[0].current_database);
    console.log('当前用户:', result.rows[0].current_user);
    console.log('服务器时间:', result.rows[0].now);
    
    // 测试表查询
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
      LIMIT 10
    `);
    console.log('\n📋 数据库表 (前10个):');
    if (tables.rows.length > 0) {
      tables.rows.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.tablename}`);
      });
    } else {
      console.log('  (暂无表)');
    }
    
    // 测试用户数据
    try {
      const users = await client.query('SELECT COUNT(*) as count FROM "User"');
      console.log('\n👥 用户数量:', users.rows[0].count);
    } catch (e) {
      console.log('\n👥 User表查询:', '(表可能不存在或无权限)');
    }
    
    client.release();
    await pool.end();
    
    return { 
      success: true, 
      connectionString: config.connectionString.replace(password, '***'),
      info: result.rows[0]
    };
  } catch (error) {
    console.log('❌ 连接失败');
    console.log('错误代码:', error.code || 'N/A');
    console.log('错误信息:', error.message);
    
    await pool.end();
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🚀 使用新生成密码测试数据库连接');
  console.log('═══════════════════════════════════════════════════════');
  
  const results = [];
  
  for (const test of testConnections) {
    const result = await testConnection(test.name, test.config);
    results.push({ name: test.name, ...result });
    
    // 如果找到成功的连接,就不需要继续测试了
    if (result.success) {
      console.log('\n✅ 找到可用连接,跳过其他测试');
      break;
    }
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
  
  const successResult = results.find(r => r.success);
  
  console.log('\n═══════════════════════════════════════════════════════');
  if (successResult) {
    console.log(`✅ 数据库连接成功!`);
    console.log(`\n使用的连接模式: ${successResult.name}`);
    console.log(`\n下一步:`);
    console.log(`1. 我会自动更新 .env.local 文件`);
    console.log(`2. 重新生成 Prisma Client`);
    console.log(`3. 验证业务数据查询`);
  } else {
    console.log(`❌ 所有连接都失败了`);
    console.log('\n请等待1-2分钟让新密码生效,然后重试。');
  }
  console.log('═══════════════════════════════════════════════════════\n');
  
  return successResult;
}

runTests()
  .then(result => {
    if (result) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('测试过程出错:', error);
    process.exit(1);
  });
