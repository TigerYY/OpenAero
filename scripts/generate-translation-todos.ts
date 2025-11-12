#!/usr/bin/env node
/**
 * 生成翻译待办清单
 * 
 * 功能:
 * 1. 比较 zh-CN.json 和 en-US.json
 * 2. 找出缺失的翻译
 * 3. 生成待翻译清单文件
 */

import * as fs from 'fs';
import * as path from 'path';

interface TranslationKey {
  key: string;
  zhValue: string;
  enValue: string | null;
  path: string[];
}

function loadJSON(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function flattenObject(obj: any, prefix = '', result: Map<string, string> = new Map()): Map<string, string> {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      flattenObject(obj[key], fullKey, result);
    } else {
      result.set(fullKey, String(obj[key]));
    }
  }
  
  return result;
}

function compareTranslations(zhCN: Map<string, string>, enUS: Map<string, string>): {
  missingInEN: TranslationKey[];
  missingInZH: TranslationKey[];
  emptyInEN: TranslationKey[];
} {
  const missingInEN: TranslationKey[] = [];
  const missingInZH: TranslationKey[] = [];
  const emptyInEN: TranslationKey[] = [];
  
  // 检查 zh-CN 中有但 en-US 中缺失的
  for (const [key, zhValue] of zhCN) {
    const enValue = enUS.get(key);
    const path = key.split('.');
    
    if (!enValue) {
      missingInEN.push({ key, zhValue, enValue: null, path });
    } else if (enValue.trim() === '') {
      emptyInEN.push({ key, zhValue, enValue, path });
    }
  }
  
  // 检查 en-US 中有但 zh-CN 中缺失的
  for (const [key, enValue] of enUS) {
    if (!zhCN.has(key)) {
      const path = key.split('.');
      missingInZH.push({ key, zhValue: '', enValue, path });
    }
  }
  
  return { missingInEN, missingInZH, emptyInEN };
}

function generateMarkdown(
  missingInEN: TranslationKey[],
  missingInZH: TranslationKey[],
  emptyInEN: TranslationKey[]
): string {
  const now = new Date().toISOString().split('T')[0];
  
  let md = `# 翻译待办清单\n\n`;
  md += `**生成时间**: ${now}\n`;
  md += `**状态**: 待翻译\n\n`;
  md += `---\n\n`;
  
  // 统计信息
  md += `## 📊 统计\n\n`;
  md += `| 类别 | 数量 |\n`;
  md += `|------|------|\n`;
  md += `| 缺少 en-US 翻译 | ${missingInEN.length} |\n`;
  md += `| 缺少 zh-CN 翻译 | ${missingInZH.length} |\n`;
  md += `| en-US 翻译为空 | ${emptyInEN.length} |\n`;
  md += `| **总计** | **${missingInEN.length + missingInZH.length + emptyInEN.length}** |\n\n`;
  
  // 缺少 en-US 翻译
  if (missingInEN.length > 0) {
    md += `## ⚠️ 缺少 en-US 翻译 (${missingInEN.length})\n\n`;
    md += `这些 key 在 zh-CN.json 中存在，但在 en-US.json 中缺失。\n\n`;
    
    // 按命名空间分组
    const grouped = groupByNamespace(missingInEN);
    
    for (const [namespace, keys] of Object.entries(grouped)) {
      md += `### ${namespace}\n\n`;
      md += `| Key | 中文值 | 英文值 (待翻译) | 状态 |\n`;
      md += `|-----|--------|------------------|------|\n`;
      
      for (const item of keys) {
        md += `| \`${item.key}\` | ${item.zhValue} | _TODO_ | [ ] |\n`;
      }
      
      md += `\n`;
    }
  }
  
  // 缺少 zh-CN 翻译
  if (missingInZH.length > 0) {
    md += `## ⚠️ 缺少 zh-CN 翻译 (${missingInZH.length})\n\n`;
    md += `这些 key 在 en-US.json 中存在，但在 zh-CN.json 中缺失。\n\n`;
    
    const grouped = groupByNamespace(missingInZH);
    
    for (const [namespace, keys] of Object.entries(grouped)) {
      md += `### ${namespace}\n\n`;
      md += `| Key | 英文值 | 中文值 (待翻译) | 状态 |\n`;
      md += `|-----|--------|------------------|------|\n`;
      
      for (const item of keys) {
        md += `| \`${item.key}\` | ${item.enValue} | _TODO_ | [ ] |\n`;
      }
      
      md += `\n`;
    }
  }
  
  // en-US 翻译为空
  if (emptyInEN.length > 0) {
    md += `## ⚠️ en-US 翻译为空 (${emptyInEN.length})\n\n`;
    md += `这些 key 存在于两个文件中，但 en-US 的值为空字符串。\n\n`;
    
    md += `| Key | 中文值 | 状态 |\n`;
    md += `|-----|--------|------|\n`;
    
    for (const item of emptyInEN) {
      md += `| \`${item.key}\` | ${item.zhValue} | [ ] |\n`;
    }
    
    md += `\n`;
  }
  
  // 快速复制格式
  if (missingInEN.length > 0) {
    md += `---\n\n`;
    md += `## 📋 快速复制格式 (JSON)\n\n`;
    md += `以下是缺失的 en-US 翻译的 JSON 格式，可直接添加到 en-US.json：\n\n`;
    md += `\`\`\`json\n`;
    
    const jsonObj: any = {};
    for (const item of missingInEN) {
      setNestedValue(jsonObj, item.path, `TODO: ${item.zhValue}`);
    }
    
    md += JSON.stringify(jsonObj, null, 2);
    md += `\n\`\`\`\n\n`;
  }
  
  return md;
}

function groupByNamespace(keys: TranslationKey[]): Record<string, TranslationKey[]> {
  const grouped: Record<string, TranslationKey[]> = {};
  
  for (const key of keys) {
    const namespace = key.path[0] || 'root';
    if (!grouped[namespace]) {
      grouped[namespace] = [];
    }
    grouped[namespace].push(key);
  }
  
  // 排序
  for (const namespace in grouped) {
    grouped[namespace].sort((a, b) => a.key.localeCompare(b.key));
  }
  
  return grouped;
}

function setNestedValue(obj: any, path: string[], value: string): void {
  let current = obj;
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[path[path.length - 1]] = value;
}

function main() {
  console.log('🌍 生成翻译待办清单...\n');
  
  const messagesDir = path.join(process.cwd(), 'messages');
  const zhCNPath = path.join(messagesDir, 'zh-CN.json');
  const enUSPath = path.join(messagesDir, 'en-US.json');
  
  // 加载文件
  console.log('📂 加载翻译文件...');
  const zhCNData = loadJSON(zhCNPath);
  const enUSData = loadJSON(enUSPath);
  
  // 展平对象
  console.log('🔍 分析翻译差异...');
  const zhCN = flattenObject(zhCNData);
  const enUS = flattenObject(enUSData);
  
  console.log(`  zh-CN: ${zhCN.size} keys`);
  console.log(`  en-US: ${enUS.size} keys`);
  
  // 比较
  const { missingInEN, missingInZH, emptyInEN } = compareTranslations(zhCN, enUS);
  
  console.log('\n📊 差异统计:');
  console.log(`  缺少 en-US 翻译: ${missingInEN.length}`);
  console.log(`  缺少 zh-CN 翻译: ${missingInZH.length}`);
  console.log(`  en-US 翻译为空: ${emptyInEN.length}`);
  
  if (missingInEN.length === 0 && missingInZH.length === 0 && emptyInEN.length === 0) {
    console.log('\n✅ 所有翻译都是完整的！');
    return;
  }
  
  // 生成 Markdown
  console.log('\n📝 生成待办清单...');
  const markdown = generateMarkdown(missingInEN, missingInZH, emptyInEN);
  
  // 写入文件
  const outputPath = path.join(process.cwd(), 'TRANSLATION_TODO.md');
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  
  console.log(`\n✅ 清单已生成: ${path.relative(process.cwd(), outputPath)}`);
  console.log('\n💡 下一步:');
  console.log('   1. 打开 TRANSLATION_TODO.md 查看待翻译清单');
  console.log('   2. 完成翻译后更新 messages/en-US.json');
  console.log('   3. 重新运行此脚本验证完整性');
  console.log('');
}

main();
