#!/usr/bin/env node

/**
 * 分析重复路由脚本
 * 识别需要迁移或删除的重复路由
 */

const fs = require('fs');
const path = require('path');

const srcAppDir = path.join(process.cwd(), 'src/app');

// 需要检查的重复路由模式
const duplicatePatterns = [
  { nonI18n: 'admin', i18n: '[locale]/admin' },
  { nonI18n: 'creators', i18n: '[locale]/creators' },
  { nonI18n: 'login', i18n: '[locale]/(auth)/login' },
  { nonI18n: 'register', i18n: '[locale]/(auth)/register' },
  { nonI18n: 'forgot-password', i18n: '[locale]/(auth)/forgot-password' },
];

function findPages(dir, basePath = '') {
  const pages = [];
  if (!fs.existsSync(dir)) return pages;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (item === 'node_modules' || item === '.next') continue;
      pages.push(...findPages(fullPath, path.join(basePath, item)));
    } else if (item === 'page.tsx' || item === 'page.ts') {
      pages.push(basePath || '/');
    }
  }
  return pages;
}

function analyzeDuplicates() {
  console.log('🔍 分析重复路由...\n');

  const results = {
    duplicates: [],
    nonI18nOnly: [],
    i18nOnly: [],
    recommendations: []
  };

  for (const pattern of duplicatePatterns) {
    const nonI18nPath = path.join(srcAppDir, pattern.nonI18n);
    const i18nPath = path.join(srcAppDir, pattern.i18n);

    const nonI18nPages = fs.existsSync(nonI18nPath) 
      ? findPages(nonI18nPath, pattern.nonI18n)
      : [];
    const i18nPages = fs.existsSync(i18nPath)
      ? findPages(i18nPath, pattern.i18n)
      : [];

    if (nonI18nPages.length > 0 && i18nPages.length > 0) {
      results.duplicates.push({
        pattern: pattern.nonI18n,
        nonI18n: nonI18nPages,
        i18n: i18nPages,
        action: 'migrate_or_redirect'
      });
    } else if (nonI18nPages.length > 0) {
      results.nonI18nOnly.push({
        pattern: pattern.nonI18n,
        pages: nonI18nPages
      });
    } else if (i18nPages.length > 0) {
      results.i18nOnly.push({
        pattern: pattern.i18n,
        pages: i18nPages
      });
    }
  }

  // 输出结果
  console.log('📊 重复路由分析结果:\n');

  if (results.duplicates.length > 0) {
    console.log('⚠️  发现重复路由:');
    results.duplicates.forEach(dup => {
      console.log(`\n  ${dup.pattern}:`);
      console.log(`    非国际化: ${dup.nonI18n.length} 个页面`);
      console.log(`    国际化: ${dup.i18n.length} 个页面`);
      console.log(`    建议: 迁移到 ${dup.i18n} 或创建重定向`);
    });
  }

  if (results.nonI18nOnly.length > 0) {
    console.log('\n📁 仅非国际化路由:');
    results.nonI18nOnly.forEach(item => {
      console.log(`  ${item.pattern}: ${item.pages.length} 个页面`);
    });
  }

  if (results.i18nOnly.length > 0) {
    console.log('\n✅ 仅国际化路由 (正确):');
    results.i18nOnly.forEach(item => {
      console.log(`  ${item.pattern}: ${item.pages.length} 个页面`);
    });
  }

  // 生成建议
  console.log('\n💡 迁移建议:');
  results.duplicates.forEach(dup => {
    console.log(`\n  ${dup.pattern}:`);
    console.log(`    1. 检查非国际化路由的内容`);
    console.log(`    2. 如果内容相同，删除非国际化路由`);
    console.log(`    3. 如果内容不同，迁移到国际化路由`);
    console.log(`    4. 创建重定向（如果需要保持向后兼容）`);
  });

  return results;
}

analyzeDuplicates();

