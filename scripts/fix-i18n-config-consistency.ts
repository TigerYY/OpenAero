#!/usr/bin/env node
/**
 * 修复国际化配置一致性问题
 * 
 * 问题:
 * 1. zh.json 和 en.json 的用途不明确
 * 2. 部分脚本引用了这些文件，但主配置不使用
 * 
 * 解决方案:
 * 1. 检查这些文件是否被实际使用
 * 2. 如果不使用，提示删除
 * 3. 如果使用，提示更新配置
 */

import * as fs from 'fs';
import * as path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const PRIMARY_LOCALES = ['zh-CN', 'en-US'];
const SECONDARY_LOCALES = ['zh', 'en'];

interface LocaleFileInfo {
  locale: string;
  filePath: string;
  exists: boolean;
  keyCount: number;
  size: number;
}

interface CheckResult {
  primaryFiles: LocaleFileInfo[];
  secondaryFiles: LocaleFileInfo[];
  recommendations: string[];
}

function analyzeLocaleFile(locale: string): LocaleFileInfo {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  const exists = fs.existsSync(filePath);
  
  if (!exists) {
    return { locale, filePath, exists: false, keyCount: 0, size: 0 };
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const stats = fs.statSync(filePath);
  
  try {
    const data = JSON.parse(content);
    const keyCount = countKeys(data);
    return { locale, filePath, exists: true, keyCount, size: stats.size };
  } catch (error) {
    return { locale, filePath, exists: true, keyCount: 0, size: stats.size };
  }
}

function countKeys(obj: any, prefix = ''): number {
  let count = 0;
  
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countKeys(obj[key], `${prefix}${key}.`);
    } else {
      count++;
    }
  }
  
  return count;
}

function searchFileUsage(fileName: string): string[] {
  const srcDir = path.join(process.cwd(), 'src');
  const scriptsDir = path.join(process.cwd(), 'scripts');
  const usages: string[] = [];
  
  // 搜索源代码中的引用
  const searchDirs = [srcDir, scriptsDir];
  
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    
    const files = getAllFiles(dir);
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes(fileName)) {
          usages.push(path.relative(process.cwd(), file));
        }
      }
    }
  }
  
  return usages;
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);
  
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // 跳过 node_modules
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(filePath);
    }
  });
  
  return arrayOfFiles;
}

function checkConfiguration(): CheckResult {
  const result: CheckResult = {
    primaryFiles: [],
    secondaryFiles: [],
    recommendations: []
  };
  
  console.log('\n🔍 开始检查国际化配置一致性...\n');
  
  // 分析主要语言文件
  console.log('📂 主要语言文件:');
  for (const locale of PRIMARY_LOCALES) {
    const info = analyzeLocaleFile(locale);
    result.primaryFiles.push(info);
    
    if (info.exists) {
      console.log(`  ✅ ${locale}.json - ${info.keyCount} keys, ${(info.size / 1024).toFixed(2)} KB`);
    } else {
      console.log(`  ❌ ${locale}.json - 文件不存在`);
      result.recommendations.push(`创建缺失的主要语言文件: ${locale}.json`);
    }
  }
  
  // 分析次要语言文件
  console.log('\n📂 次要语言文件 (用途待确认):');
  for (const locale of SECONDARY_LOCALES) {
    const info = analyzeLocaleFile(locale);
    result.secondaryFiles.push(info);
    
    if (info.exists) {
      console.log(`  ⚠️  ${locale}.json - ${info.keyCount} keys, ${(info.size / 1024).toFixed(2)} KB`);
      
      // 搜索使用情况
      const usages = searchFileUsage(`${locale}.json`);
      if (usages.length > 0) {
        console.log(`     📍 被以下文件引用:`);
        usages.forEach(usage => console.log(`        - ${usage}`));
        result.recommendations.push(
          `${locale}.json 被使用中，考虑:\n` +
          `  1. 如果要支持，添加到 middleware.ts 的 locales 配置\n` +
          `  2. 如果不支持，从引用文件中移除`
        );
      } else {
        console.log(`     ❌ 未发现代码引用`);
        result.recommendations.push(`${locale}.json 未被使用，建议删除`);
      }
    } else {
      console.log(`  ℹ️  ${locale}.json - 文件不存在`);
    }
  }
  
  return result;
}

function checkMiddlewareConfig(): void {
  const middlewarePath = path.join(process.cwd(), 'middleware.ts');
  
  if (!fs.existsSync(middlewarePath)) {
    console.log('\n⚠️  middleware.ts 不存在');
    return;
  }
  
  const content = fs.readFileSync(middlewarePath, 'utf-8');
  const localesMatch = content.match(/locales:\s*\[(.*?)\]/s);
  
  if (localesMatch) {
    const localesStr = localesMatch[1].replace(/['\s]/g, '');
    const locales = localesStr.split(',').filter(Boolean);
    
    console.log('\n⚙️  Middleware 配置:');
    console.log(`  locales: [${locales.join(', ')}]`);
    
    // 检查一致性
    const expectedLocales = new Set(PRIMARY_LOCALES);
    const configuredLocales = new Set(locales);
    
    const missing = [...expectedLocales].filter(l => !configuredLocales.has(l));
    const extra = [...configuredLocales].filter(l => !expectedLocales.has(l));
    
    if (missing.length > 0) {
      console.log(`  ⚠️  缺少配置: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      console.log(`  ⚠️  额外配置: ${extra.join(', ')}`);
    }
    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ✅ 配置一致`);
    }
  }
}

function checkI18nConfig(): void {
  const i18nPath = path.join(process.cwd(), 'src', 'i18n.ts');
  
  if (!fs.existsSync(i18nPath)) {
    console.log('\n⚠️  src/i18n.ts 不存在');
    return;
  }
  
  const content = fs.readFileSync(i18nPath, 'utf-8');
  
  console.log('\n⚙️  i18n.ts 配置:');
  
  // 检查消息映射
  const messagesMatch = content.match(/const messages\s*=\s*{([^}]+)}/s);
  if (messagesMatch) {
    const mappings = messagesMatch[1].match(/'([^']+)':/g);
    if (mappings) {
      const configuredLocales = mappings.map(m => m.replace(/['":]/g, ''));
      console.log(`  messages 映射: [${configuredLocales.join(', ')}]`);
      
      // 检查一致性
      const expectedSet = new Set(PRIMARY_LOCALES);
      const configuredSet = new Set(configuredLocales);
      
      if ([...expectedSet].every(l => configuredSet.has(l)) &&
          [...configuredSet].every(l => expectedSet.has(l))) {
        console.log(`  ✅ 配置一致`);
      } else {
        console.log(`  ⚠️  配置不一致`);
      }
    }
  }
}

function generateFixScript(result: CheckResult): void {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 修复建议');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (result.recommendations.length === 0) {
    console.log('✅ 未发现配置问题\n');
    return;
  }
  
  result.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}\n`);
  });
  
  // 检查次要语言文件
  const unusedFiles = result.secondaryFiles.filter(f => f.exists);
  
  if (unusedFiles.length > 0) {
    console.log('🗑️  建议删除未使用的语言文件:\n');
    console.log('```bash');
    unusedFiles.forEach(f => {
      console.log(`rm ${path.relative(process.cwd(), f.filePath)}`);
    });
    console.log('```\n');
    
    console.log('⚠️  删除前请确认这些文件确实不再使用！\n');
  }
  
  // 统一配置建议
  console.log('📝 统一配置建议:\n');
  console.log('1. 在 src/config/app.ts 中定义唯一的语言配置源:');
  console.log('```typescript');
  console.log("export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;");
  console.log("export const DEFAULT_LOCALE = 'zh-CN' as const;");
  console.log('```\n');
  
  console.log('2. 在其他文件中从 app.ts 导入:');
  console.log('```typescript');
  console.log("import { SUPPORTED_LOCALES } from '@/config/app';");
  console.log('```\n');
  
  console.log('3. 更新以下文件使用统一配置:');
  console.log('   - middleware.ts');
  console.log('   - src/i18n.ts');
  console.log('   - src/types/i18n.ts');
  console.log('   - src/components/ui/LanguageSwitcher.tsx');
  console.log('   - scripts/check-i18n-completeness.ts');
  console.log('   - scripts/validate-translations.js');
  console.log('\n');
}

// 主函数
function main() {
  console.log('🌍 国际化配置一致性检查工具');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const result = checkConfiguration();
  checkMiddlewareConfig();
  checkI18nConfig();
  generateFixScript(result);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ 检查完成\n');
}

main();
