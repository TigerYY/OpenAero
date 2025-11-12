const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.cardynuoazvaytvinxvm:4gPPhKf90F6ayAka@aws-1-us-east-2.pooler.supabase.com:5432/postgres';

async function checkIntegration() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   🔍 Supabase 与前端业务功能匹配检查 🔍              ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  const issues = [];
  const passed = [];
  
  try {
    const client = await pool.connect();
    
    // 1. 检查核心业务表
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 第1步: 检查核心业务表');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const expectedTables = [
      { name: 'users', description: '用户表 (Prisma User模型)' },
      { name: 'creator_profiles', description: '创作者资料表' },
      { name: 'solutions', description: '解决方案表' },
      { name: 'orders', description: '订单表' },
      { name: 'products', description: '商品表' },
      { name: 'carts', description: '购物车表' }
    ];
    
    for (const table of expectedTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table.name]);
      
      if (result.rows[0].exists) {
        console.log(`✅ ${table.name} - ${table.description}`);
        passed.push(`表 ${table.name} 存在`);
      } else {
        console.log(`❌ ${table.name} - ${table.description} (缺失)`);
        issues.push(`缺少核心表: ${table.name}`);
      }
    }
    
    // 2. 检查 users 表结构
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 第2步: 检查 users 表结构');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const usersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    const expectedUserColumns = [
      'id', 'supabase_id', 'email', 'email_verified',
      'role', 'status', 'created_at', 'updated_at'
    ];
    
    const actualColumns = usersColumns.rows.map(r => r.column_name);
    const missingColumns = expectedUserColumns.filter(col => 
      !actualColumns.includes(col) && !actualColumns.includes(col.toLowerCase())
    );
    
    if (missingColumns.length === 0) {
      console.log('✅ users表包含所有关键字段');
      passed.push('users表结构完整');
    } else {
      console.log(`⚠️  users表缺少字段: ${missingColumns.join(', ')}`);
      issues.push(`users表缺少字段: ${missingColumns.join(', ')}`);
    }
    
    console.log('\n实际字段列表:');
    usersColumns.rows.slice(0, 10).forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    if (usersColumns.rows.length > 10) {
      console.log(`   ... 还有 ${usersColumns.rows.length - 10} 个字段`);
    }
    
    // 3. 检查 Supabase Auth 集成
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 第3步: 检查 Supabase Auth 集成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 检查 auth schema
    const authSchema = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata 
        WHERE schema_name = 'auth'
      )
    `);
    
    if (authSchema.rows[0].exists) {
      console.log('✅ auth schema 存在');
      passed.push('Supabase Auth schema可用');
      
      // 检查 auth.users 表
      const authUsers = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'auth' 
          AND table_name = 'users'
        )
      `);
      
      if (authUsers.rows[0].exists) {
        console.log('✅ auth.users 表存在');
        const authUserCount = await client.query('SELECT COUNT(*) FROM auth.users');
        console.log(`   Supabase Auth 用户数: ${authUserCount.rows[0].count}`);
        passed.push('Supabase Auth users表可用');
      } else {
        console.log('❌ auth.users 表不存在');
        issues.push('auth.users表不存在');
      }
    } else {
      console.log('❌ auth schema 不存在');
      issues.push('Supabase Auth schema不可用');
    }
    
    // 4. 检查用户数据同步
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 第4步: 检查用户数据同步状态');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const publicUsers = await client.query('SELECT COUNT(*) FROM users');
    console.log(`   public.users 用户数: ${publicUsers.rows[0].count}`);
    
    try {
      const authUsersCount = await client.query('SELECT COUNT(*) FROM auth.users');
      console.log(`   auth.users 用户数: ${authUsersCount.rows[0].count}`);
      
      if (publicUsers.rows[0].count === authUsersCount.rows[0].count) {
        console.log('✅ 用户数据同步正常');
        passed.push('用户数据同步一致');
      } else {
        console.log(`⚠️  用户数据不同步 (差异: ${Math.abs(publicUsers.rows[0].count - authUsersCount.rows[0].count)})`);
        issues.push('用户数据同步不一致');
      }
    } catch (e) {
      console.log('⚠️  无法访问 auth.users (权限限制或不存在)');
    }
    
    // 5. 检查前端需要的API路由对应的表
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 第5步: 检查前端API对应的数据表');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const apiTables = [
      { table: 'solutions', api: '/api/solutions' },
      { table: 'products', api: '/api/products' },
      { table: 'carts', api: '/api/cart' },
      { table: 'orders', api: '/api/orders' },
      { table: 'notifications', api: '/api/notifications' }
    ];
    
    for (const item of apiTables) {
      const exists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [item.table]);
      
      if (exists.rows[0].exists) {
        const count = await client.query(`SELECT COUNT(*) FROM "${item.table}"`);
        console.log(`✅ ${item.table} (${item.api}) - ${count.rows[0].count} 条记录`);
        passed.push(`${item.table}表支持${item.api}`);
      } else {
        console.log(`❌ ${item.table} (${item.api}) - 表不存在`);
        issues.push(`${item.table}表缺失,影响${item.api}`);
      }
    }
    
    // 6. 检查 AuthContext 需要的字段
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚙️  第6步: 检查 AuthContext 需要的字段');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // AuthContext 期望的字段: role, status, emailVerified
    const authFields = ['role', 'status', 'email_verified'];
    const usersFields = usersColumns.rows.map(r => r.column_name);
    
    for (const field of authFields) {
      if (usersFields.includes(field)) {
        console.log(`✅ users.${field} 字段存在`);
        passed.push(`users.${field}字段可用`);
      } else {
        console.log(`❌ users.${field} 字段缺失`);
        issues.push(`AuthContext需要的字段 ${field} 不存在`);
      }
    }
    
    client.release();
    await pool.end();
    
    // 最终报告
    console.log('\n\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                   检查结果总结                        ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    console.log(`✅ 通过检查: ${passed.length} 项`);
    console.log(`❌ 发现问题: ${issues.length} 项\n`);
    
    if (issues.length > 0) {
      console.log('⚠️  发现的问题:\n');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      console.log('');
    }
    
    // 兼容性评分
    const totalChecks = passed.length + issues.length;
    const score = Math.round((passed.length / totalChecks) * 100);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎯 前端与Supabase匹配度: ${score}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (score >= 90) {
      console.log('✅ 优秀 - 前端业务功能与Supabase集成良好');
    } else if (score >= 70) {
      console.log('⚠️  良好 - 有少量问题需要修复');
    } else if (score >= 50) {
      console.log('⚠️  一般 - 存在较多兼容性问题');
    } else {
      console.log('❌ 较差 - 需要重大调整');
    }
    
    console.log('\n📖 详细分析:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (issues.some(i => i.includes('auth schema') || i.includes('auth.users'))) {
      console.log('\n⚠️  Supabase Auth 集成问题:');
      console.log('   - 可能未启用 Supabase Auth');
      console.log('   - 或者当前数据库用户权限不足');
      console.log('   - 建议: 在 Supabase Dashboard 启用 Authentication');
    }
    
    if (issues.some(i => i.includes('缺少核心表'))) {
      console.log('\n⚠️  数据库表缺失:');
      console.log('   - Prisma schema 与实际数据库不同步');
      console.log('   - 建议: 运行 npx prisma db push');
    }
    
    if (issues.some(i => i.includes('字段'))) {
      console.log('\n⚠️  表结构不匹配:');
      console.log('   - 实际表结构与 Prisma schema 定义不一致');
      console.log('   - 建议: 重新同步数据库 schema');
    }
    
    console.log('\n🚀 建议的修复步骤:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (issues.length > 0) {
      console.log('1. 运行: npx prisma db pull (从数据库同步schema)');
      console.log('2. 检查: prisma/schema.prisma 文件');
      console.log('3. 运行: npx prisma generate (重新生成Client)');
      console.log('4. 运行本脚本再次验证\n');
    } else {
      console.log('✅ 无需修复,一切正常!\n');
    }
    
  } catch (error) {
    console.error('\n❌ 检查过程出错:', error.message);
    console.error('详细错误:', error);
    await pool.end();
    process.exit(1);
  }
}

checkIntegration();
