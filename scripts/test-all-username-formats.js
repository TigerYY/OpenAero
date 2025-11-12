require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const password = '4gPPhKf90F6ayAka';
const encodedPassword = encodeURIComponent(password);
const projectRef = 'cardynuoazvaytvinxvm';

console.log('🔐 密码信息:');
console.log('密码:', password);
console.log('URL编码:', encodedPassword);
console.log('项目ID:', projectRef);
console.log('');

// 测试不同的用户名格式
const userFormats = [
  `postgres.${projectRef}`,
  `postgres`,
  projectRef
];

const hosts = [
  { 
    name: 'Pooler (Transaction, 6543)', 
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    params: '?pgbouncer=true'
  },
  { 
    name: 'Pooler (Session, 5432)', 
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    params: ''
  },
  { 
    name: 'Direct Connection', 
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    params: ''
  }
];

async function testConnection(username, hostInfo) {
  const connString = `postgresql://${username}:${encodedPassword}@${hostInfo.host}:${hostInfo.port}/postgres${hostInfo.params}`;
  
  console.log(`\n  Testing: ${username} @ ${hostInfo.name}`);
  
  const pool = new Pool({
    connectionString: connString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT current_user, current_database()');
    
    console.log(`  ✅ 成功! 用户: ${result.rows[0].current_user}, 数据库: ${result.rows[0].current_database}`);
    
    client.release();
    await pool.end();
    
    return { success: true, connString: connString.replace(password, '***'), username, hostInfo };
  } catch (error) {
    console.log(`  ❌ 失败: ${error.message}`);
    await pool.end();
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🔍 测试所有可能的用户名和连接组合');
  console.log('═══════════════════════════════════════════════════════');
  
  let successResult = null;
  
  for (const hostInfo of hosts) {
    console.log(`\n━━━ ${hostInfo.name} ━━━`);
    
    for (const username of userFormats) {
      const result = await testConnection(username, hostInfo);
      
      if (result.success) {
        successResult = result;
        console.log('\n✅✅✅ 找到可用连接! ✅✅✅');
        break;
      }
    }
    
    if (successResult) break;
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  if (successResult) {
    console.log('✅ 连接成功!');
    console.log('\n正确的配置:');
    console.log('用户名:', successResult.username);
    console.log('主机:', successResult.hostInfo.name);
    console.log('连接字符串:', successResult.connString);
    console.log('\n将自动更新配置文件...');
    return successResult;
  } else {
    console.log('❌ 所有组合都失败了');
    console.log('\n可能的原因:');
    console.log('1. 新密码还未生效(需要等待1-2分钟)');
    console.log('2. 密码复制时有误');
    console.log('3. Supabase项目配置问题');
    console.log('\n建议:');
    console.log('- 等待1分钟后重新运行此脚本');
    console.log('- 或从Supabase Dashboard直接复制完整连接字符串');
    return null;
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

runTests()
  .then(result => {
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('错误:', error);
    process.exit(1);
  });
