/**
 * 执行 BOM 字段增强迁移脚本
 * 迁移文件: supabase/migrations/013_enhance_solution_bom_items.sql
 */

require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, '../supabase/migrations/013_enhance_solution_bom_items.sql');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 错误: DATABASE_URL 环境变量未设置');
  console.error('   请在 .env.local 文件中设置 DATABASE_URL');
  process.exit(1);
}

if (!fs.existsSync(migrationFile)) {
  console.error('❌ 错误: 迁移文件不存在:', migrationFile);
  process.exit(1);
}

console.log('📋 开始执行 BOM 字段增强迁移...');
console.log('   迁移文件:', migrationFile);
console.log('');

try {
  // 使用 psql 执行 SQL 文件
  const command = `psql "${databaseUrl}" -f "${migrationFile}"`;
  console.log('执行命令:', command.replace(databaseUrl, 'DATABASE_URL=***'));
  console.log('');

  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PGPASSWORD: databaseUrl.match(/password=([^&]+)/)?.[1] || '',
    },
  });

  console.log('');
  console.log('✅ BOM 字段增强迁移执行成功！');
  console.log('');
  console.log('📝 新增字段:');
  console.log('   - unit (数量单位)');
  console.log('   - unitPrice (单价)');
  console.log('   - supplier (供应商)');
  console.log('   - partNumber (零件号)');
  console.log('   - manufacturer (制造商)');
  console.log('   - category (物料类别)');
  console.log('   - position (安装位置)');
  console.log('   - weight (重量)');
  console.log('   - specifications (技术规格)');
  console.log('');
  console.log('📊 新增索引:');
  console.log('   - solution_bom_items_category_idx');
  console.log('   - solution_bom_items_partNumber_idx');
  console.log('   - solution_bom_items_manufacturer_idx');
  console.log('');
  console.log('下一步:');
  console.log('   1. 运行 npx prisma generate 更新 Prisma Client');
  console.log('   2. 测试 API 路由');
  console.log('   3. 更新前端表单组件');
} catch (error) {
  console.error('');
  console.error('❌ 迁移执行失败:', error.message);
  process.exit(1);
}

