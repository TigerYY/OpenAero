#!/usr/bin/env node

/**
 * 硬编码路由检查工具
 * 用于检测项目中的硬编码路由路径
 */

const fs = require('fs');
const path = require('path');

// 支持的硬编码路由模式
const HARDCODED_ROUTE_PATTERNS = [
  /href="\/[^/]/g, // href="/path"
  /href='\/[^/]/g, // href='/path'
  /router\.push\(['"]\/[^/]/g, // router.push('/path')
  /redirect: ['"]\/[^/]/g, // redirect: '/path'
  /to="\/[^/]/g, // to="/path"
  /to='\/[^/]/g, // to='/path'
];

// 需要检查的文件扩展名
const SUPPORTED_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// 需要排除的目录
const EXCLUDED_DIRS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '__tests__',
  '__mocks__',
  '.git'
];

// 需要排除的文件
const EXCLUDED_FILES = [
  'routing.ts', // 路由工具文件本身
  'check-hardcoded-routes.js' // 检查工具本身
];

/**
 * 检查文件是否包含硬编码路由
 */
function checkFileForHardcodedRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    HARDCODED_ROUTE_PATTERNS.forEach((pattern, patternIndex) => {
      const matches = [...line.matchAll(pattern)];
      matches.forEach(match => {
        issues.push({
          file: filePath,
          line: index + 1,
          column: match.index + 1,
          pattern: patternIndex,
          match: match[0],
          context: line.trim()
        });
      });
    });
  });

  return issues;
}

/**
 * 递归遍历目录检查文件
 */
function scanDirectory(dirPath, results = []) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(item)) {
        scanDirectory(fullPath, results);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (SUPPORTED_EXTENSIONS.includes(ext) && !EXCLUDED_FILES.includes(item)) {
        const issues = checkFileForHardcodedRoutes(fullPath);
        if (issues.length > 0) {
          results.push({
            file: fullPath,
            issues: issues
          });
        }
      }
    }
  }
  
  return results;
}

/**
 * 生成检查报告
 */
function generateReport(results) {
  console.log('🔍 硬编码路由检查报告\n');
  
  if (results.length === 0) {
    console.log('✅ 未发现硬编码路由问题');
    return;
  }
  
  let totalIssues = 0;
  
  results.forEach(result => {
    console.log(`📄 文件: ${result.file}`);
    console.log(`  发现 ${result.issues.length} 个问题:`);
    
    result.issues.forEach(issue => {
      totalIssues++;
      console.log(`    • 第 ${issue.line} 行, 第 ${issue.column} 列`);
      console.log(`      匹配: ${issue.match}`);
      console.log(`      上下文: ${issue.context}`);
      console.log('');
    });
    
    console.log('');
  });
  
  console.log(`📊 总结: 共发现 ${totalIssues} 个硬编码路由问题`);
  
  // 生成修复建议
  if (totalIssues > 0) {
    console.log('\n💡 修复建议:');
    console.log('1. 使用 useRouting() hook 生成路由:');
    console.log('   const { route, routes } = useRouting();');
    console.log('   <Link href={route(routes.AUTH.LOGIN)}>登录</Link>');
    console.log('');
    console.log('2. 对于 router.push() 调用:');
    console.log('   router.push(route(routes.AUTH.LOGIN));');
    console.log('');
    console.log('3. 运行修复脚本: npm run fix-routes');
  }
}

/**
 * 主函数
 */
function main() {
  const projectRoot = process.cwd();
  const srcDir = path.join(projectRoot, 'src');
  
  console.log('🚀 开始检查硬编码路由...\n');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ 找不到 src 目录');
    process.exit(1);
  }
  
  const results = scanDirectory(srcDir);
  generateReport(results);
  
  // 设置退出码
  if (results.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  checkFileForHardcodedRoutes,
  scanDirectory,
  generateReport
};