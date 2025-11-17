/**
 * 系统一致性诊断工具
 * 检查 Prisma Schema, 数据库结构, API 和前端之间的一致性
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const prisma = new PrismaClient();

interface DiagnosticResult {
  category: string;
  item: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  suggestion?: string;
}

const results: DiagnosticResult[] = [];

function addResult(category: string, item: string, status: 'OK' | 'WARNING' | 'ERROR', message: string, suggestion?: string) {
  results.push({ category, item, status, message, suggestion });
}

/**
 * 1. 检查 Prisma Schema 与数据库结构的一致性
 */
async function checkPrismaVsDatabase() {
  console.log('\n🔍 检查 1: Prisma Schema vs 数据库结构\n');

  try {
    // 检查 user_profiles 表
    const { data: userProfiles, error: upError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (upError) {
      if (upError.code === '42P01') {
        addResult('Database', 'user_profiles', 'ERROR', '表不存在', '运行迁移: npm run db:migrate');
      } else {
        addResult('Database', 'user_profiles', 'WARNING', `查询出错: ${upError.message}`);
      }
    } else {
      // 检查 role vs roles
      const firstProfile = userProfiles[0];
      if (firstProfile) {
        const hasRole = 'role' in firstProfile;
        const hasRoles = 'roles' in firstProfile;
        
        if (hasRoles && !hasRole) {
          addResult('Schema', 'user_profiles.roles', 'WARNING', 
            '数据库使用 roles 数组，但 Prisma schema 可能使用 role 单值',
            '更新 Prisma schema 中的 UserProfile 模型');
        } else if (hasRole && !hasRoles) {
          addResult('Schema', 'user_profiles.role', 'WARNING', 
            'Prisma schema 使用 roles 数组，但数据库使用 role 单值',
            '运行迁移 015_migrate_to_multi_roles.sql');
        } else if (hasRole && hasRoles) {
          addResult('Schema', 'user_profiles', 'OK', '同时存在 role 和 roles，需要统一');
        } else {
          addResult('Schema', 'user_profiles', 'ERROR', '缺少角色字段');
        }
      } else {
        addResult('Schema', 'user_profiles', 'OK', '表存在但为空');
      }
    }

    // 检查其他关键表
    const tables = ['creator_profiles', 'solutions', 'orders', 'products'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          addResult('Database', table, 'ERROR', '表不存在', '运行相应的迁移脚本');
        } else {
          addResult('Database', table, 'WARNING', `访问出错: ${error.message}`);
        }
      } else {
        addResult('Database', table, 'OK', '表存在且可访问');
      }
    }

  } catch (error: any) {
    addResult('Database', 'connection', 'ERROR', `数据库连接失败: ${error.message}`);
  }
}

/**
 * 2. 检查 Prisma Client 是否需要重新生成
 */
async function checkPrismaClient() {
  console.log('\n🔍 检查 2: Prisma Client 生成状态\n');

  try {
    // 尝试使用 Prisma Client
    await prisma.$connect();
    
    // 检查 UserProfile 模型
    try {
      const count = await prisma.userProfile.count();
      addResult('Prisma', 'UserProfile', 'OK', `模型可用 (${count} 条记录)`);
    } catch (error: any) {
      if (error.message.includes('Unknown arg')) {
        addResult('Prisma', 'UserProfile', 'ERROR', 
          'Prisma Client 与 schema 不匹配',
          '运行: npm run db:generate');
      } else {
        addResult('Prisma', 'UserProfile', 'WARNING', `查询失败: ${error.message}`);
      }
    }

  } catch (error: any) {
    addResult('Prisma', 'Client', 'ERROR', `Prisma Client 错误: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 3. 检查 API 路由
 */
async function checkAPIRoutes() {
  console.log('\n🔍 检查 3: API 路由结构\n');

  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  
  const criticalRoutes = [
    'auth',
    'users',
    'solutions',
    'orders',
    'admin/users',
    'admin/solutions',
  ];

  for (const route of criticalRoutes) {
    const routePath = path.join(apiDir, route);
    if (fs.existsSync(routePath)) {
      // 检查是否有 route.ts
      const routeFile = path.join(routePath, 'route.ts');
      if (fs.existsSync(routeFile)) {
        addResult('API', route, 'OK', 'API 路由存在');
        
        // 简单检查是否使用了正确的导入
        const content = fs.readFileSync(routeFile, 'utf-8');
        if (content.includes('@prisma/client')) {
          addResult('API', `${route} (Prisma)`, 'WARNING', 
            '使用 Prisma Client',
            '考虑统一使用 Supabase 客户端');
        }
        if (content.includes('@supabase/supabase-js')) {
          addResult('API', `${route} (Supabase)`, 'OK', '使用 Supabase 客户端');
        }
      } else {
        addResult('API', route, 'WARNING', '目录存在但缺少 route.ts');
      }
    } else {
      addResult('API', route, 'WARNING', 'API 路由不存在');
    }
  }
}

/**
 * 4. 检查前端类型定义
 */
async function checkFrontendTypes() {
  console.log('\n🔍 检查 4: 前端类型定义\n');

  const typesDir = path.join(process.cwd(), 'src', 'types');
  
  if (!fs.existsSync(typesDir)) {
    addResult('Frontend', 'types', 'WARNING', 'types 目录不存在', '创建 src/types 目录');
    return;
  }

  const typeFiles = ['user.ts', 'solution.ts', 'order.ts'];
  
  for (const typeFile of typeFiles) {
    const filePath = path.join(typesDir, typeFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 检查是否与 Prisma 类型同步
      if (typeFile === 'user.ts') {
        if (content.includes('role:') && content.includes('roles:')) {
          addResult('Frontend', typeFile, 'WARNING', 
            '同时定义了 role 和 roles',
            '统一使用 roles 数组');
        } else if (content.includes('roles:')) {
          addResult('Frontend', typeFile, 'OK', '使用 roles 数组');
        } else if (content.includes('role:')) {
          addResult('Frontend', typeFile, 'WARNING', 
            '使用单个 role',
            '更新为 roles 数组');
        }
      }
      
      addResult('Frontend', typeFile, 'OK', '类型文件存在');
    } else {
      addResult('Frontend', typeFile, 'WARNING', '类型文件不存在');
    }
  }
}

/**
 * 5. 检查环境变量
 */
async function checkEnvironment() {
  console.log('\n🔍 检查 5: 环境变量配置\n');

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      addResult('Environment', envVar, 'OK', '已配置');
    } else {
      addResult('Environment', envVar, 'ERROR', '未配置', '在 .env.local 中添加此变量');
    }
  }
}

/**
 * 6. 生成报告
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 系统一致性诊断报告');
  console.log('='.repeat(80) + '\n');

  const categories = [...new Set(results.map(r => r.category))];
  
  let errorCount = 0;
  let warningCount = 0;
  let okCount = 0;

  for (const category of categories) {
    console.log(`\n📁 ${category}`);
    console.log('-'.repeat(80));
    
    const categoryResults = results.filter(r => r.category === category);
    
    for (const result of categoryResults) {
      let icon = '';
      if (result.status === 'OK') {
        icon = '✅';
        okCount++;
      } else if (result.status === 'WARNING') {
        icon = '⚠️ ';
        warningCount++;
      } else {
        icon = '❌';
        errorCount++;
      }
      
      console.log(`${icon} ${result.item}: ${result.message}`);
      if (result.suggestion) {
        console.log(`   💡 建议: ${result.suggestion}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📈 统计');
  console.log('='.repeat(80));
  console.log(`✅ 正常: ${okCount}`);
  console.log(`⚠️  警告: ${warningCount}`);
  console.log(`❌ 错误: ${errorCount}`);
  console.log(`📊 总计: ${results.length}`);
  console.log('='.repeat(80) + '\n');

  // 生成修复建议
  if (errorCount > 0 || warningCount > 0) {
    console.log('🔧 推荐的修复步骤:\n');
    
    let stepNumber = 1;
    
    if (results.some(r => r.item === 'user_profiles.roles' && r.status === 'WARNING')) {
      console.log(`${stepNumber}. 运行多角色迁移:`);
      console.log('   npx supabase db push --file supabase/migrations/015_migrate_to_multi_roles.sql\n');
      stepNumber++;
    }
    
    if (results.some(r => r.category === 'Prisma' && r.status === 'ERROR')) {
      console.log(`${stepNumber}. 重新生成 Prisma Client:`);
      console.log('   npm run db:generate\n');
      stepNumber++;
    }
    
    if (results.some(r => r.category === 'Database' && r.message.includes('表不存在'))) {
      console.log(`${stepNumber}. 运行数据库迁移:`);
      console.log('   # 方法1: 使用 Supabase CLI');
      console.log('   npx supabase db push\n');
      console.log('   # 方法2: 逐个运行迁移文件\n');
      stepNumber++;
    }
    
    console.log(`${stepNumber}. 统一代码库:`);
    console.log('   - 将所有 role 字段改为 roles 数组');
    console.log('   - 更新 API 路由使用 Supabase 客户端');
    console.log('   - 同步前端类型定义\n');
  }

  // 保存报告到文件
  const reportPath = path.join(process.cwd(), 'diagnostic-report.txt');
  const reportContent = results.map(r => 
    `[${r.status}] ${r.category}/${r.item}: ${r.message}${r.suggestion ? ` | 建议: ${r.suggestion}` : ''}`
  ).join('\n');
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`📄 详细报告已保存至: ${reportPath}\n`);
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始系统一致性诊断...\n');
  
  await checkEnvironment();
  await checkPrismaVsDatabase();
  await checkPrismaClient();
  await checkAPIRoutes();
  await checkFrontendTypes();
  
  generateReport();
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
