#!/usr/bin/env node

// 用户基本信息编辑问题诊断脚本

const fs = require('fs');
const path = require('path');

console.log('🔍 用户基本信息编辑问题诊断\n');

// 1. 检查关键文件
console.log('1. 检查关键文件...');
const criticalFiles = [
  'src/app/[locale]/admin/users/page.tsx',
  'src/app/api/admin/users/[id]/route.ts',
  'src/lib/api-helpers.ts'
];

criticalFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// 2. 检查API路由中的验证逻辑
console.log('\n2. 检查API路由验证逻辑...');
try {
  const routeContent = fs.readFileSync('src/app/api/admin/users/[id]/route.ts', 'utf8');
  
  const checks = [
    { name: 'updateUserSchema', pattern: /updateUserSchema/ },
    { name: '字符串验证', pattern: /z\.string\(\)/ },
    { name: '最小长度验证', pattern: /\.min\(/ },
    { name: '最大长度验证', pattern: /\.max\(/ },
    { name: 'upsert逻辑', pattern: /upsert|create.*profile/ },
    { name: '错误日志', pattern: /console\.(log|error|warn)/ }
  ];

  checks.forEach(check => {
    const found = check.pattern.test(routeContent);
    console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
  });

} catch (error) {
  console.log('❌ 无法读取API路由文件:', error.message);
}

// 3. 检查前端表单逻辑
console.log('\n3. 检查前端表单逻辑...');
try {
  const pageContent = fs.readFileSync('src/app/[locale]/admin/users/page.tsx', 'utf8');
  
  const pageChecks = [
    { name: '基本信息处理', pattern: /infoPayload/ },
    { name: '空值检查', pattern: /\.trim\(\)/ },
    { name: '字段比较', pattern: /!==.*selectedUser/ },
    { name: 'PUT请求', pattern: /method: 'PUT'/ },
    { name: '详细错误处理', pattern: /statusText.*ok/ }
  ];

  pageChecks.forEach(check => {
    const found = check.pattern.test(pageContent);
    console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
  });

} catch (error) {
  console.log('❌ 无法读取前端页面文件:', error.message);
}

// 4. 检查测试页面
console.log('\n4. 检查测试页面...');
const testFiles = [
  'src/app/[locale]/test-basic-info-edit/page.tsx',
  'src/app/[locale]/test-role-edit/page.tsx'
];

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// 5. 提供常见问题解决方案
console.log('\n🔧 常见问题及解决方案:');

console.log('\n问题1: "请检查表单错误"');
console.log('原因: 表单验证失败');
console.log('解决方案:');
console.log('  - 检查输入是否为空');
console.log('  - 确保字段长度在限制范围内（1-50字符）');
console.log('  - 检查是否至少更新了一个字段');

console.log('\n问题2: 404 错误');
console.log('原因: 用户不存在或profile不存在');
console.log('解决方案:');
console.log('  - 确认用户ID正确');
console.log('  - API现在会自动创建不存在的profile');

console.log('\n问题3: 403 错误');
console.log('原因: 权限不足');
console.log('解决方案:');
console.log('  - 确保已登录管理员账户');
console.log('  - 检查用户角色是否包含ADMIN或SUPER_ADMIN');

console.log('\n问题4: 500 错误');
console.log('原因: 服务器内部错误');
console.log('解决方案:');
console.log('  - 检查服务器控制台日志');
console.log('  - 确认数据库连接正常');

console.log('\n📝 测试步骤:');
console.log('1. 访问: http://localhost:3000/zh-CN/admin/users');
console.log('2. 选择一个用户进行编辑');
console.log('3. 修改基本信息（名字或姓氏）');
console.log('4. 点击"保存更改"');
console.log('5. 查看浏览器控制台日志');
console.log('6. 如果仍有问题，使用测试页面: http://localhost:3000/zh-CN/test-basic-info-edit');

console.log('\n✨ 诊断完成！');