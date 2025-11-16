#!/usr/bin/env node

/**
 * 验证列名修复后的结果
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyFix() {
  console.log('🔍 验证列名修复结果...\n');
  
  try {
    // 检查是否还有camelCase列名
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
      console.log('✅ 完美！所有列名都已统一为snake_case格式');
      console.log('✅ 数据库schema与Prisma schema完全匹配');
      console.log('\n下一步：重新生成Prisma Client');
      console.log('运行: npx prisma generate\n');
      return true;
    } else {
      console.log(`⚠️  仍有 ${camelCaseColumns.length} 个camelCase列名：\n`);
      
      let currentTable = '';
      camelCaseColumns.forEach(col => {
        if (col.table_name !== currentTable) {
          currentTable = col.table_name;
          console.log(`\n📋 ${currentTable}:`);
        }
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
      
      console.log('\n⚠️  请再次检查并运行修复脚本');
      return false;
    }
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

verifyFix();
