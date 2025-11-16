#!/usr/bin/env node

// 用户角色编辑问题诊断脚本

const fs = require('fs');
const path = require('path');

console.log('🔍 用户角色编辑问题诊断\n');

// 1. 检查关键文件是否存在
console.log('1. 检查关键文件...');
const criticalFiles = [
  'src/app/[locale]/admin/users/page.tsx',
  'src/app/api/admin/users/[id]/role/route.ts',
  'src/lib/api-helpers.ts',
  'src/lib/auth/auth-service.ts',
  'src/lib/auth/supabase-client.ts',
  'src/lib/auth-helpers.ts'
];

criticalFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// 2. 检查API路由中的关键函数
console.log('\n2. 检查API路由关键函数...');
try {
  const roleRouteContent = fs.readFileSync('src/app/api/admin/users/[id]/role/route.ts', 'utf8');
  
  const checks = [
    { name: 'requireAdminAuth导入', pattern: /requireAdminAuth/ },
    { name: 'updateRoleSchema', pattern: /updateRoleSchema/ },
    { name: 'PATCH方法', pattern: /export async function PATCH/ },
    { name: 'Prisma upsert', pattern: /prisma\.user_profile\.upsert/ },
    { name: '权限检查', pattern: /SUPER_ADMIN/ },
    { name: '错误日志', pattern: /console\.(log|error|warn)/ }
  ];

  checks.forEach(check => {
    const found = check.pattern.test(roleRouteContent);
    console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
  });

} catch (error) {
  console.log('❌ 无法读取角色API路由文件:', error.message);
}

// 3. 检查前端页面关键逻辑
console.log('\n3. 检查前端页面关键逻辑...');
try {
  const pageContent = fs.readFileSync('src/app/[locale]/admin/users/page.tsx', 'utf8');
  
  const pageChecks = [
    { name: 'handleSaveEdit函数', pattern: /const handleSaveEdit = async/ },
    { name: '角色变更检查', pattern: /rolesChanged/ },
    { name: 'PATCH请求', pattern: /method: 'PATCH'/ },
    { name: '角色API调用', pattern: /\/api\/admin\/users\/.*\/role/ },
    { name: '错误处理', pattern: /catch.*error/ },
    { name: 'Toast通知', pattern: /toast\.(error|success)/ }
  ];

  pageChecks.forEach(check => {
    const found = check.pattern.test(pageContent);
    console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
  });

} catch (error) {
  console.log('❌ 无法读取前端页面文件:', error.message);
}

// 4. 检查环境变量
console.log('\n4. 检查环境变量...');
const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const envChecks = [
    { name: 'Supabase URL', pattern: /NEXT_PUBLIC_SUPABASE_URL=/ },
    { name: 'Supabase Anon Key', pattern: /NEXT_PUBLIC_SUPABASE_ANON_KEY=/ },
    { name: 'Supabase Service Key', pattern: /SUPABASE_SERVICE_ROLE_KEY=/ }
  ];

  envChecks.forEach(check => {
    const found = check.pattern.test(envContent);
    console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
  });
} else {
  console.log('❌ .env.local 文件不存在');
}

// 5. 提供修复建议
console.log('\n🔧 修复建议:');
console.log('1. 确保已登录管理员账户');
console.log('2. 检查浏览器开发者工具的网络选项卡，查看API请求详情');
console.log('3. 查看服务器控制台日志，确认API调用是否到达');
console.log('4. 检查用户是否有足够的权限修改角色');
console.log('5. 确认请求格式正确，特别是角色数组格式');

console.log('\n📝 调试步骤:');
console.log('1. 打开浏览器开发者工具 (F12)');
console.log('2. 访问 /zh-CN/admin/users');
console.log('3. 编辑用户角色，点击"保存更改"');
console.log('4. 查看网络选项卡中的 /api/admin/users/[id]/role 请求');
console.log('5. 检查请求头、请求体和响应内容');
console.log('6. 查看控制台是否有错误信息');

console.log('\n✨ 诊断完成！');