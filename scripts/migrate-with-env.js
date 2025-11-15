#!/usr/bin/env node

/**
 * Prisma 迁移包装脚本
 * 自动加载 .env.local 环境变量并运行 Prisma 迁移
 */

require('dotenv').config({ path: '.env.local' });

const { execSync } = require('child_process');

// 获取命令行参数（迁移名称等）
const args = process.argv.slice(2);

// 构建 Prisma 命令
const command = `npx prisma migrate dev ${args.join(' ')}`;

console.log('🔧 运行 Prisma 迁移...');
console.log(`📝 命令: ${command}`);
console.log('');

try {
  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      // 确保 DATABASE_URL 被传递
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });
  console.log('');
  console.log('✅ 迁移完成！');
} catch (error) {
  console.error('');
  console.error('❌ 迁移失败！');
  process.exit(1);
}

