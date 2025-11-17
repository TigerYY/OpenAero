#!/usr/bin/env node

/**
 * 角色字段一致性验证脚本
 * 检查代码库中是否还有对 profile.role 的直接引用
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 需要检查的目录
const SRC_DIR = path.join(__dirname, '../src');
const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage'
];

// 允许的模式（这些是正确的用法）
const ALLOWED_PATTERNS = [
  // 多角色数组访问
  /\.roles\s*[\[\]]/,
  /roles\.includes/,
  /Array\.isArray.*roles/,
  // 数据库schema定义
  /roles:\s*\[.*\]/,
  // 接口定义中的 roles 属性
  /roles:\s*string\[\]/,
  // 变量名包含 roles 但不是 profile.role
  /userRoles/,
  /currentUserRoles/,
  /adminRoles/,
  // 向后兼容的回退逻辑
  /profile\.role\s*\?\s*\[.*profile\.role.*\]/,
  // 注释和文档
  /\/\/.*profile\.role/,
  /\/\*[\s\S]*?\*\//,
  // 字符串字面量
  /["']profile\.role["']/,
];

// 需要修复的模式
const PROBLEM_PATTERNS = [
  // 直接访问 profile.role
  /profile\.role(?!\s*\?\s*\[)/,
  // 直接访问 user.role
  /user\.role(?!\s*\?\s*\[)/,
  // authResult.user.role
  /authResult\.user\.role(?!\s*\?\s*\[)/,
];

let errorCount = 0;
let warningCount = 0;
let checkedFiles = 0;

console.log('🔍 开始检查角色字段一致性...\n');

/**
 * 检查单个文件
 */
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let hasProblems = false;
    
    lines.forEach((line, index) => {
      // 跳过注释行
      if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
        return;
      }
      
      // 检查问题模式
      for (const pattern of PROBLEM_PATTERNS) {
        if (pattern.test(line)) {
          // 检查是否是允许的模式
          let isAllowed = false;
          for (const allowedPattern of ALLOWED_PATTERNS) {
            if (allowedPattern.test(line)) {
              isAllowed = true;
              break;
            }
          }
          
          if (!isAllowed) {
            console.log(`❌ ${filePath}:${index + 1}`);
            console.log(`   ${line.trim()}`);
            console.log(`   ⚠️  发现直接访问 role 字段，应该使用 roles 数组`);
            console.log('');
            errorCount++;
            hasProblems = true;
          }
        }
      }
    });
    
    if (hasProblems) {
      warningCount++;
    }
    checkedFiles++;
  } catch (error) {
    console.log(`⚠️  无法读取文件: ${filePath} - ${error.message}`);
  }
}

/**
 * 递归遍历目录
 */
function walkDirectory(dir, callback) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // 跳过忽略的目录
        if (IGNORE_PATTERNS.some(pattern => file.includes(pattern))) {
          continue;
        }
        walkDirectory(filePath, callback);
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))) {
        callback(filePath);
      }
    }
  } catch (error) {
    console.log(`⚠️  无法遍历目录: ${dir} - ${error.message}`);
  }
}

/**
 * 使用 ripgrep 进行更精确的搜索
 */
function checkWithRipgrep() {
  console.log('🔍 使用 ripgrep 进行高级搜索...\n');
  
  try {
    // 搜索 profile.role 的使用（排除注释）
    const profileRoleResult = execSync(
      `rg -n "profile\\.role(?!\\s*\\?\\s*\\[)" --type ts --type tsx --type js --type jsx src/ || true`,
      { encoding: 'utf8', cwd: path.join(__dirname, '..') }
    );
    
    if (profileRoleResult.trim()) {
      console.log('❌ 发现 profile.role 的直接使用:');
      console.log(profileRoleResult);
      errorCount += profileRoleResult.split('\n').length;
    }
    
    // 搜索 user.role 的使用（排除注释）
    const userRoleResult = execSync(
      `rg -n "user\\.role(?!\\s*\\?\\s*\\[)" --type ts --type tsx --type js --type jsx src/ || true`,
      { encoding: 'utf8', cwd: path.join(__dirname, '..') }
    );
    
    if (userRoleResult.trim()) {
      console.log('❌ 发现 user.role 的直接使用:');
      console.log(userRoleResult);
      errorCount += userRoleResult.split('\n').length;
    }
    
    // 检查正确的 roles 使用情况
    const rolesUsageResult = execSync(
      `rg -n "roles\\.includes|Array\\.isArray.*roles|userRoles|adminRoles" --type ts --type tsx --type js --type jsx src/ || true`,
      { encoding: 'utf8', cwd: path.join(__dirname, '..') }
    );
    
    if (rolesUsageResult.trim()) {
      console.log('✅ 正确的 roles 数组使用示例:');
      const examples = rolesUsageResult.split('\n').slice(0, 5); // 只显示前5个
      examples.forEach(line => {
        if (line.trim()) {
          console.log(`   ${line}`);
        }
      });
      console.log(`   ... (共 ${rolesUsageResult.split('\n').length} 处正确使用)`);
    }
    
  } catch (error) {
    console.log('⚠️  ripgrep 搜索失败:', error.message);
  }
}

/**
 * 检查关键文件的修复状态
 */
function checkKeyFiles() {
  console.log('\n🎯 检查关键文件修复状态...\n');
  
  const keyFiles = [
    'src/lib/auth-helpers.ts',
    'src/lib/api-helpers.ts', 
    'src/contexts/AuthContext.tsx',
    'src/app/api/admin/dashboard/stats/route.ts',
    'src/app/api/admin/users/[id]/role/route.ts',
    'src/app/api/admin/users/[id]/status/route.ts',
    'src/app/api/solutions/[id]/route.ts',
    'src/components/layout/AdminLayout.tsx'
  ];
  
  for (const file of keyFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} - 存在`);
      checkFile(filePath);
    } else {
      console.log(`❌ ${file} - 不存在`);
    }
  }
}

// 主执行流程
console.log('📋 角色字段一致性验证报告');
console.log('=====================================\n');

// 检查关键文件
checkKeyFiles();

// 使用 ripgrep 进行精确搜索
checkWithRipgrep();

// 输出总结
console.log('\n📊 验证总结:');
console.log('=====================================');
console.log(`📁 已检查文件数: ${checkedFiles}`);
console.log(`❌ 发现问题: ${errorCount} 处`);
console.log(`⚠️  问题文件数: ${warningCount} 个`);

if (errorCount === 0) {
  console.log('\n🎉 恭喜！未发现角色字段一致性问题！');
  console.log('✅ 所有代码都正确使用了 roles 数组');
} else {
  console.log('\n⚠️  发现角色字段一致性问题，需要修复：');
  console.log('1. 将 profile.role 访问改为 roles 数组访问');
  console.log('2. 使用 roles.includes() 进行权限检查');
  console.log('3. 确保向后兼容性（如果需要）');
  console.log('\n💡 修复示例:');
  console.log('   // 错误 ❌');
  console.log('   if (user.profile.role === "ADMIN") { ... }');
  console.log('   ');
  console.log('   // 正确 ✅');
  console.log('   const userRoles = user.profile.roles || [];');
  console.log('   if (userRoles.includes("ADMIN")) { ... }');
}

// 退出码
process.exit(errorCount > 0 ? 1 : 0);