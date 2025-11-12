#!/usr/bin/env tsx
/**
 * 国际化完整性检查工具
 * 检查所有语言的翻译文件是否包含相同的 key
 */

import * as fs from 'fs';
import * as path from 'path';

const LOCALES = ['zh-CN', 'en-US'];
const MESSAGES_DIR = 'messages';

interface TranslationStats {
  locale: string;
  totalKeys: number;
  missingKeys: string[];
  extraKeys: string[];
}

function flattenKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys.sort();
}

function loadTranslations(locale: string): any {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 翻译文件不存在: ${filePath}`);
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error(`❌ 无法解析翻译文件 ${filePath}:`, error);
    return null;
  }
}

function checkI18nCompleteness() {
  console.log('🌍 开始国际化完整性检查...\n');
  
  const localeKeys: Record<string, Set<string>> = {};
  const translations: Record<string, any> = {};
  
  // 读取所有翻译文件
  for (const locale of LOCALES) {
    const content = loadTranslations(locale);
    if (content) {
      translations[locale] = content;
      localeKeys[locale] = new Set(flattenKeys(content));
      console.log(`✅ 已加载 ${locale}: ${localeKeys[locale].size} 个 key`);
    }
  }
  
  console.log();
  
  // 找出所有唯一的 keys（以第一个语言为基准）
  const baseLocale = LOCALES[0];
  const allKeys = new Set<string>();
  
  Object.values(localeKeys).forEach(keys => {
    keys.forEach(key => allKeys.add(key));
  });
  
  console.log(`📊 总共有 ${allKeys.size} 个唯一的翻译 key\n`);
  
  // 检查每个语言的完整性
  const stats: TranslationStats[] = [];
  
  for (const locale of LOCALES) {
    if (!localeKeys[locale]) continue;
    
    const missing = [...allKeys].filter(key => !localeKeys[locale].has(key));
    const extra = [...localeKeys[locale]].filter(key => !allKeys.has(key));
    
    stats.push({
      locale,
      totalKeys: localeKeys[locale].size,
      missingKeys: missing,
      extraKeys: extra,
    });
  }
  
  // 显示结果
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 翻译完整性报告');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let hasIssues = false;
  
  for (const stat of stats) {
    const completeness = ((stat.totalKeys / allKeys.size) * 100).toFixed(2);
    
    if (stat.missingKeys.length === 0 && stat.extraKeys.length === 0) {
      console.log(`✅ ${stat.locale.padEnd(10)} - 完整 (${completeness}%)`);
    } else {
      hasIssues = true;
      console.log(`⚠️  ${stat.locale.padEnd(10)} - 不完整 (${completeness}%)`);
      
      if (stat.missingKeys.length > 0) {
        console.log(`   缺少 ${stat.missingKeys.length} 个 key:`);
        stat.missingKeys.slice(0, 10).forEach(key => {
          console.log(`     - ${key}`);
        });
        if (stat.missingKeys.length > 10) {
          console.log(`     ... 还有 ${stat.missingKeys.length - 10} 个`);
        }
      }
      
      if (stat.extraKeys.length > 0) {
        console.log(`   多余 ${stat.extraKeys.length} 个 key:`);
        stat.extraKeys.slice(0, 5).forEach(key => {
          console.log(`     + ${key}`);
        });
        if (stat.extraKeys.length > 5) {
          console.log(`     ... 还有 ${stat.extraKeys.length - 5} 个`);
        }
      }
      console.log();
    }
  }
  
  // 详细的缺失 key 报告
  if (hasIssues) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 详细缺失 key 报告');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 找出在某些语言中存在但在其他语言中缺失的 key
    const keyLocales: Record<string, string[]> = {};
    
    for (const key of allKeys) {
      keyLocales[key] = LOCALES.filter(locale => localeKeys[locale]?.has(key));
    }
    
    // 找出不是在所有语言中都存在的 key
    const incompleteKeys = Object.entries(keyLocales)
      .filter(([_, locales]) => locales.length > 0 && locales.length < LOCALES.length)
      .sort((a, b) => a[1].length - b[1].length);
    
    if (incompleteKeys.length > 0) {
      console.log('以下 key 不在所有语言中存在:\n');
      incompleteKeys.slice(0, 20).forEach(([key, locales]) => {
        const missing = LOCALES.filter(l => !locales.includes(l));
        console.log(`  ${key}`);
        console.log(`    存在于: ${locales.join(', ')}`);
        console.log(`    缺失于: ${missing.join(', ')}`);
        console.log();
      });
      
      if (incompleteKeys.length > 20) {
        console.log(`  ... 还有 ${incompleteKeys.length - 20} 个不完整的 key\n`);
      }
    }
  }
  
  // 检查空值
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 检查空翻译');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let hasEmptyValues = false;
  
  for (const locale of LOCALES) {
    if (!translations[locale]) continue;
    
    const emptyKeys: string[] = [];
    const flatTranslations = flattenKeys(translations[locale]);
    
    for (const key of flatTranslations) {
      const value = key.split('.').reduce((obj, k) => obj?.[k], translations[locale]);
      if (value === '' || value === null || value === undefined) {
        emptyKeys.push(key);
      }
    }
    
    if (emptyKeys.length > 0) {
      hasEmptyValues = true;
      console.log(`⚠️  ${locale} 有 ${emptyKeys.length} 个空翻译:`);
      emptyKeys.slice(0, 10).forEach(key => {
        console.log(`     - ${key}`);
      });
      if (emptyKeys.length > 10) {
        console.log(`     ... 还有 ${emptyKeys.length - 10} 个`);
      }
      console.log();
    }
  }
  
  if (!hasEmptyValues) {
    console.log('✅ 没有发现空翻译\n');
  }
  
  // 总结
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 总结');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const avgCompleteness = stats.reduce((sum, s) => sum + (s.totalKeys / allKeys.size), 0) / stats.length * 100;
  
  console.log(`总翻译 key 数量: ${allKeys.size}`);
  console.log(`支持的语言: ${LOCALES.join(', ')}`);
  console.log(`平均完整度: ${avgCompleteness.toFixed(2)}%\n`);
  
  if (!hasIssues && !hasEmptyValues) {
    console.log('🎉 所有翻译文件都是完整的！\n');
    process.exit(0);
  } else {
    console.log('⚠️  发现翻译不完整或有空值，请及时补充\n');
    process.exit(1);
  }
}

checkI18nCompleteness();
