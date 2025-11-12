require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.cardynuoazvaytvinxvm:4gPPhKf90F6ayAka@aws-1-us-east-2.pooler.supabase.com:6543/postgres';

console.log('═══════════════════════════════════════════════════════');
console.log('  🚀 测试正确的Supabase连接字符串');
console.log('═══════════════════════════════════════════════════════\n');

console.log('🔗 连接信息:');
console.log('主机: aws-1-us-east-2.pooler.supabase.com');
console.log('端口: 6543 (Transaction Pooling)');
console.log('用户: postgres.cardynuoazvaytvinxvm');
console.log('');

async function testConnection() {
  console.log('⏳ 正在连接数据库...\n');
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ 数据库连接成功!\n');
    
    // 测试基本查询
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 数据库信息:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const info = await client.query('SELECT version(), current_database(), current_user, now()');
    console.log('PostgreSQL版本:', info.rows[0].version.split(',')[0]);
    console.log('数据库名:', info.rows[0].current_database);
    console.log('当前用户:', info.rows[0].current_user);
    console.log('服务器时间:', info.rows[0].now);
    
    // 查询表
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 数据库表:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    if (tables.rows.length > 0) {
      console.log(`共 ${tables.rows.length} 个表:\n`);
      tables.rows.forEach((r, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. ${r.tablename}`);
      });
    } else {
      console.log('(暂无表)');
    }
    
    // 查询用户数据
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👥 业务数据验证:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const userCount = await client.query('SELECT COUNT(*) as count FROM "User"');
      console.log('✅ User表查询成功');
      console.log('   用户数量:', userCount.rows[0].count);
      
      const sampleUsers = await client.query('SELECT id, email, name, "createdAt" FROM "User" LIMIT 3');
      if (sampleUsers.rows.length > 0) {
        console.log('\n   示例用户:');
        sampleUsers.rows.forEach((u, i) => {
          console.log(`   ${i + 1}. ${u.email} (${u.name || 'N/A'})`);
        });
      }
    } catch (e) {
      console.log('⚠️  User表:', e.message);
    }
    
    // 查询其他关键表
    const keyTables = ['Session', 'Account', 'VerificationToken'];
    for (const table of keyTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`✅ ${table}表: ${result.rows[0].count} 条记录`);
      } catch (e) {
        console.log(`⚠️  ${table}表: ${e.message}`);
      }
    }
    
    client.release();
    await pool.end();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ 数据库连接测试成功!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('下一步:');
    console.log('1. ✅ 更新 .env.local 文件');
    console.log('2. ✅ 重新生成 Prisma Client');
    console.log('3. ✅ 验证应用程序连接');
    console.log('');
    
    return true;
  } catch (error) {
    console.log('❌ 连接失败!\n');
    console.log('错误代码:', error.code || 'N/A');
    console.log('错误信息:', error.message);
    console.log('\n详细错误:', error);
    
    await pool.end();
    return false;
  }
}

testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试过程出错:', error);
    process.exit(1);
  });
