#!/usr/bin/env node

/**
 * 使用Prisma直接查询数据库，检查实际的列名
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSolutionsTable() {
  console.log('🔍 检查 solutions 表的列名...\n');
  
  try {
    // 尝试查询，看错误信息
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'solutions'
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Solutions 表的列：');
    console.log('='.repeat(80));
    result.forEach((col, index) => {
      const nullable = col.is_nullable === 'YES' ? '(可空)' : '(必填)';
      const isCamelCase = /[A-Z]/.test(col.column_name);
      const isSnakeCase = /_/.test(col.column_name);
      
      let nameStyle = '';
      if (isCamelCase) nameStyle = ' 🔴 camelCase';
      else if (isSnakeCase) nameStyle = ' ✅ snake_case';
      
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${nameStyle}`);
    });
    
    return result;
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    throw error;
  }
}

async function checkAllTables() {
  console.log('\n🔍 检查所有表...\n');
  
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log(`📊 找到 ${tables.length} 张表：`);
    console.log('='.repeat(80));
    tables.forEach((table, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${table.table_name}`);
    });
    
    return tables;
  } catch (error) {
    console.error('❌ 获取表列表失败:', error.message);
    throw error;
  }
}

async function checkCamelCaseColumns() {
  console.log('\n🔍 检查所有表中的camelCase列名...\n');
  
  try {
    const camelCaseColumns = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND column_name ~ '[A-Z]'
      ORDER BY table_name, ordinal_position;
    `;
    
    if (camelCaseColumns.length === 0) {
      console.log('✅ 没有找到camelCase列名，所有列名都是snake_case或小写');
      return [];
    }
    
    console.log(`🔴 找到 ${camelCaseColumns.length} 个camelCase列：`);
    console.log('='.repeat(80));
    
    let currentTable = '';
    camelCaseColumns.forEach(col => {
      if (col.table_name !== currentTable) {
        currentTable = col.table_name;
        console.log(`\n📋 ${currentTable}:`);
      }
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    return camelCaseColumns;
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    throw error;
  }
}

async function main() {
  console.log('=' .repeat(80));
  console.log('🔍 数据库Schema检查工具');
  console.log('='.repeat(80));
  
  try {
    // 1. 检查所有表
    await checkAllTables();
    
    // 2. 检查solutions表详细信息
    await checkSolutionsTable();
    
    // 3. 检查所有camelCase列名
    const camelCaseColumns = await checkCamelCaseColumns();
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 检查总结：');
    console.log('='.repeat(80));
    
    if (camelCaseColumns.length === 0) {
      console.log('✅ 数据库列名已经是snake_case格式，无需修复！');
      console.log('💡 Prisma schema中的@map()映射应该已经正确配置');
    } else {
      console.log(`⚠️  发现 ${camelCaseColumns.length} 个camelCase列名需要修复`);
      console.log('📝 请运行 scripts/fix-column-names.sql 来统一列名');
    }
    
  } catch (error) {
    console.error('\n❌ 检查过程出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
