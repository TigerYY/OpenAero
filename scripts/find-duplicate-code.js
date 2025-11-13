#!/usr/bin/env node

/**
 * 重复代码检测脚本
 * 识别常见的重复代码模式
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');
const patterns = {
  authCheck: {
    name: '认证检查模式',
    regex: /const\s+authResult\s*=\s*await\s+authenticateRequest\(request\)/g,
    files: []
  },
  adminCheck: {
    name: '管理员权限检查模式',
    regex: /requireAdminAuth|checkAdminAuth|role\s*!==\s*['"]ADMIN['"]/g,
    files: []
  },
  errorResponse: {
    name: '错误响应模式',
    regex: /NextResponse\.json\(\s*\{\s*success:\s*false\s*,\s*error:/g,
    files: []
  },
  successResponse: {
    name: '成功响应模式',
    regex: /NextResponse\.json\(\s*\{\s*success:\s*true\s*,/g,
    files: []
  },
  tryCatch: {
    name: 'Try-Catch错误处理模式',
    regex: /try\s*\{[\s\S]{0,200}catch\s*\(error[^)]*\)\s*\{[\s\S]{0,200}console\.error/g,
    files: []
  }
};

function scanFile(filePath, patternName, regex) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = content.match(regex);
  if (matches && matches.length > 0) {
    return {
      file: path.relative(srcDir, filePath),
      count: matches.length,
      pattern: patternName
    };
  }
  return null;
}

function scanDirectory(dir, results = {}) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (item === 'node_modules' || item === '.next' || item === '__tests__') continue;
      scanDirectory(fullPath, results);
    } else if (/\.(ts|tsx)$/.test(item)) {
      Object.keys(patterns).forEach(key => {
        const pattern = patterns[key];
        const match = scanFile(fullPath, pattern.name, pattern.regex);
        if (match) {
          if (!results[key]) {
            results[key] = [];
          }
          results[key].push(match);
        }
      });
    }
  }
  
  return results;
}

// 扫描
console.log('🔍 扫描重复代码模式...\n');
const results = scanDirectory(srcDir);

// 输出结果
console.log('📊 重复代码模式分析结果:\n');

Object.keys(results).forEach(key => {
  const pattern = patterns[key];
  const matches = results[key];
  
  if (matches.length > 0) {
    const totalOccurrences = matches.reduce((sum, m) => sum + m.count, 0);
    console.log(`${pattern.name}:`);
    console.log(`  出现次数: ${totalOccurrences} 次`);
    console.log(`  涉及文件: ${matches.length} 个`);
    
    // 显示前5个文件
    matches.slice(0, 5).forEach(match => {
      console.log(`    - ${match.file}: ${match.count} 次`);
    });
    if (matches.length > 5) {
      console.log(`    ... 还有 ${matches.length - 5} 个文件`);
    }
    console.log('');
  }
});

// 计算重复度
const totalFiles = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
const totalOccurrences = Object.values(results).reduce((sum, arr) => 
  sum + arr.reduce((s, m) => s + m.count, 0), 0);

console.log(`📈 总计: ${totalOccurrences} 个重复模式，涉及 ${totalFiles} 个文件`);

// 保存报告
const report = {
  patterns: results,
  summary: {
    totalOccurrences,
    totalFiles,
    patterns: Object.keys(results).map(key => ({
      name: patterns[key].name,
      occurrences: results[key].reduce((sum, m) => sum + m.count, 0),
      files: results[key].length
    }))
  }
};

fs.writeFileSync(
  path.join(process.cwd(), 'duplicate-code-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n💾 详细报告已保存到: duplicate-code-report.json');

