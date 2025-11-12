const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.cardynuoazvaytvinxvm:4gPPhKf90F6ayAka@aws-1-us-east-2.pooler.supabase.com:5432/postgres';

async function checkSchema() {
  console.log('\n🔍 检查数据库表结构\n');
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    
    // 查询所有表
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('📋 数据库表列表:');
    for (const table of tables.rows) {
      console.log(`\n   ${table.tablename}:`);
      
      // 查询表结构
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position
      `, [table.tablename]);
      
      columns.rows.forEach(col => {
        console.log(`      - ${col.column_name} (${col.data_type}${col.is_nullable === 'YES' ? ', nullable' : ''})`);
      });
      
      // 查询记录数
      try {
        const count = await client.query(`SELECT COUNT(*) FROM "${table.tablename}"`);
        console.log(`      记录数: ${count.rows[0].count}`);
      } catch (e) {
        console.log(`      记录数: 无法查询`);
      }
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ 表结构检查完成\n');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    await pool.end();
  }
}

checkSchema();
