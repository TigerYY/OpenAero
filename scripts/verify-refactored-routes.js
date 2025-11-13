#!/usr/bin/env node

/**
 * 验证重构后的API路由功能
 * 检查统一响应函数的使用情况
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src/app/api');

// 需要验证的API路由文件
const refactoredRoutes = [
  'solutions/route.ts',
  'admin/applications/route.ts',
];

// 统一响应函数名称
const unifiedFunctions = [
  'createSuccessResponse',
  'createErrorResponse',
  'createValidationErrorResponse',
  'createPaginatedResponse',
  'withErrorHandler',
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const results = {
    file: path.relative(srcDir, filePath),
    usesUnifiedFunctions: false,
    functionsUsed: [],
    hasOldPattern: false,
    oldPatterns: [],
  };

  // 检查是否使用了统一函数
  unifiedFunctions.forEach(func => {
    if (content.includes(func)) {
      results.usesUnifiedFunctions = true;
      results.functionsUsed.push(func);
    }
  });

  // 检查是否还有旧的响应模式
  const oldPatterns = [
    /NextResponse\.json\(\s*\{\s*success:\s*(true|false)\s*,/g,
    /NextResponse\.json\(\s*\{\s*success:\s*(true|false)\s*,\s*error:/g,
  ];

  oldPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // 检查是否在注释中
      const lines = content.split('\n');
      matches.forEach(match => {
        const lineIndex = content.substring(0, content.indexOf(match)).split('\n').length - 1;
        const line = lines[lineIndex];
        if (line && !line.trim().startsWith('//')) {
          results.hasOldPattern = true;
          results.oldPatterns.push(`Line ${lineIndex + 1}: ${match}`);
        }
      });
    }
  });

  return results;
}

console.log('🔍 验证重构后的API路由...\n');

const allResults = [];
refactoredRoutes.forEach(routePath => {
  const fullPath = path.join(srcDir, routePath);
  if (fs.existsSync(fullPath)) {
    const result = checkFile(fullPath);
    allResults.push(result);
  } else {
    console.log(`⚠️  文件不存在: ${routePath}`);
  }
});

// 输出结果
console.log('📊 验证结果:\n');

allResults.forEach(result => {
  console.log(`📄 ${result.file}:`);
  if (result.usesUnifiedFunctions) {
    console.log(`  ✅ 使用了统一响应函数: ${result.functionsUsed.join(', ')}`);
  } else {
    console.log(`  ⚠️  未使用统一响应函数`);
  }
  
  if (result.hasOldPattern) {
    console.log(`  ⚠️  发现旧模式:`);
    result.oldPatterns.forEach(pattern => {
      console.log(`    - ${pattern}`);
    });
  } else {
    console.log(`  ✅ 未发现旧响应模式`);
  }
  console.log('');
});

// 统计
const usingUnified = allResults.filter(r => r.usesUnifiedFunctions).length;
const hasOldPatterns = allResults.filter(r => r.hasOldPattern).length;

console.log(`📈 统计:`);
console.log(`  - 已重构文件: ${allResults.length}`);
console.log(`  - 使用统一函数: ${usingUnified}/${allResults.length}`);
console.log(`  - 仍有旧模式: ${hasOldPatterns}/${allResults.length}`);

if (hasOldPatterns === 0 && usingUnified === allResults.length) {
  console.log('\n✅ 所有重构的路由都正确使用了统一响应函数！');
  process.exit(0);
} else {
  console.log('\n⚠️  部分路由需要进一步重构');
  process.exit(1);
}

