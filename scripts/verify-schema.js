#!/usr/bin/env node

/**
 * 验证数据库Schema - 检查所有表的列名
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的环境变量');
  console.error('需要: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableColumns(tableName) {
  console.log(`\n📋 表: ${tableName}`);
  console.log('='.repeat(60));
  
  const { data, error } = await supabase.rpc('get_table_columns', {
    table_name_param: tableName
  });

  if (error) {
    // 如果RPC函数不存在，使用替代方法
    const query = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = $1
      ORDER BY ordinal_position;
    `;
    
    const { data: columns, error: queryError } = await supabase
      .rpc('exec_sql', { sql: query, params: [tableName] });
    
    if (queryError) {
      console.log('⚠️  无法查询列信息，使用Prisma introspect');
      return;
    }
    
    if (columns && columns.length > 0) {
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(可空)' : '';
        console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
      });
    }
  } else if (data && data.length > 0) {
    data.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
  }
}

async function main() {
  console.log('🔍 检查数据库Schema...\n');

  // 获取所有表
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE');

  if (error) {
    console.error('❌ 获取表列表失败:', error);
    
    // 手动列出已知的表
    const knownTables = [
      'user_profiles',
      'creator_profiles', 
      'solutions',
      'solution_versions',
      'solution_files',
      'solution_reviews',
      'orders',
      'order_solutions',
      'order_items',
      'payment_transactions',
      'payment_events',
      'revenue_shares',
      'reviews',
      'favorites',
      'factories',
      'sample_orders',
      'product_categories',
      'products',
      'product_inventory',
      'carts',
      'cart_items',
      'product_reviews',
      'notifications'
    ];

    console.log('📊 检查已知表的列名...\n');
    
    for (const table of knownTables) {
      try {
        // 尝试查询表的前0条记录，以获取列信息
        const { data, error: selectError } = await supabase
          .from(table)
          .select('*')
          .limit(0);
        
        if (!selectError) {
          console.log(`✅ ${table} 表存在`);
        } else {
          console.log(`⚠️  ${table} 表不存在或无权访问: ${selectError.message}`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
  } else if (tables) {
    console.log(`📊 找到 ${tables.length} 张表\n`);
    
    for (const table of tables) {
      await checkTableColumns(table.table_name);
    }
  }

  console.log('\n✅ Schema检查完成');
}

main().catch(console.error);
