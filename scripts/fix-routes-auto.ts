#!/usr/bin/env ts-node

/**
 * 自动修复路由问题脚本
 * 根据 route-diagnosis-report.json 生成的问题列表自动修复
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

interface RouteIssue {
  file: string;
  line: number;
  type: string;
  code: string;
  suggestion: string;
}

interface DiagnosisReport {
  issues: RouteIssue[];
}

let fixedCount = 0;
let skippedCount = 0;

// 读取诊断报告
function loadDiagnosisReport(): DiagnosisReport {
  const reportPath = path.join(projectRoot, 'route-diagnosis-report.json');
  const content = fs.readFileSync(reportPath, 'utf-8');
  return JSON.parse(content);
}

// 修复单个文件
function fixFile(filePath: string, issues: RouteIssue[]): void {
  const fullPath = path.join(srcDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    skippedCount++;
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  const lines = content.split('\n');
  
  // 检查是否需要添加导入
  const needsImport = issues.some(i => i.type === 'missing-route-wrapper');
  const hasUseClient = content.includes("'use client'") || content.includes('"use client"');
  const hasReactImport = content.includes('from \'react\'') || content.includes('from "react"');
  
  // 按行号降序排序,从文件底部开始修复,避免行号错位
  const sortedIssues = [...issues].sort((a, b) => b.line - a.line);
  
  for (const issue of sortedIssues) {
    if (issue.type === 'missing-route-wrapper') {
      continue; // 稍后统一处理
    }
    
    const lineIndex = issue.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) {
      continue;
    }
    
    let line = lines[lineIndex];
    
    try {
      switch (issue.type) {
        case 'hardcoded-href':
          // 修复 href="/xxx" -> href={route('/xxx')}
          line = line.replace(
            /href=["'](\/?[^"']*?)["']/g,
            (match, url) => {
              // 跳过外部链接
              if (url.startsWith('http') || url.includes('mailto') || url.includes('tel')) {
                return match;
              }
              return `href={route('${url}')}`;
            }
          );
          break;
          
        case 'hardcoded-push':
          // 修复 router.push('/xxx') -> router.push(route('/xxx'))
          line = line.replace(
            /router\.push\(['"](\/?[^'"]*?)['"]\)/g,
            (match, url) => {
              if (url.startsWith('http')) return match;
              return `router.push(route('${url}'))`;
            }
          );
          break;
          
        case 'hardcoded-replace':
          // 修复 router.replace('/xxx') -> router.replace(route('/xxx'))
          line = line.replace(
            /router\.replace\(['"](\/?[^'"]*?)['"]\)/g,
            (match, url) => {
              if (url.startsWith('http')) return match;
              return `router.replace(route('${url}'))`;
            }
          );
          break;
          
        case 'hardcoded-redirect':
          // 修复 redirect('/xxx') -> redirect(route('/xxx'))
          line = line.replace(
            /redirect\(['"](\/?[^'"]*?)['"]\)/g,
            (match, url) => {
              if (url.startsWith('http')) return match;
              return `redirect(route('${url}'))`;
            }
          );
          break;
      }
      
      lines[lineIndex] = line;
    } catch (error) {
      console.error(`❌ 修复失败 ${filePath}:${issue.line} - ${error}`);
      skippedCount++;
    }
  }
  
  content = lines.join('\n');
  
  // 添加必要的导入
  if (needsImport && !content.includes('@/lib/routing')) {
    const importStatement = "import { useRouting } from '@/lib/routing';\n";
    
    // 找到合适的插入位置
    if (hasUseClient) {
      // 在 'use client' 后插入
      content = content.replace(
        /(['"]use client['"];?\n)/,
        `$1${importStatement}`
      );
    } else if (hasReactImport) {
      // 在 React 导入后插入
      content = content.replace(
        /(import.*from ['"]react['"];?\n)/,
        `$1${importStatement}`
      );
    } else {
      // 在文件开头插入
      content = importStatement + content;
    }
    
    // 如果文件中使用了 router 但没有声明,添加 hook 调用
    if (content.includes('router.') && !content.includes('const { route, routes } = useRouting()')) {
      // 在组件函数内部第一行添加
      content = content.replace(
        /(export default function \w+\([^)]*\)\s*{)/,
        `$1\n  const { route, routes } = useRouting();`
      );
    }
  }
  
  // 只有内容改变才写入文件
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    fixedCount++;
    console.log(`✅ 已修复: ${filePath} (${issues.length} 个问题)`);
  } else {
    console.log(`⏭️  跳过(无变化): ${filePath}`);
    skippedCount++;
  }
}

// 主函数
function main(): void {
  console.log('🚀 开始自动修复路由问题...\n');
  
  const report = loadDiagnosisReport();
  console.log(`📊 发现 ${report.issues.length} 个问题\n`);
  
  // 按文件分组
  const issuesByFile = report.issues.reduce((acc, issue) => {
    if (!acc[issue.file]) {
      acc[issue.file] = [];
    }
    acc[issue.file].push(issue);
    return acc;
  }, {} as Record<string, RouteIssue[]>);
  
  console.log(`📁 涉及 ${Object.keys(issuesByFile).length} 个文件\n`);
  console.log('='.repeat(80));
  
  // 逐文件修复
  Object.entries(issuesByFile).forEach(([file, issues]) => {
    fixFile(file, issues);
  });
  
  console.log('='.repeat(80));
  console.log('\n📈 修复统计:');
  console.log(`  ✅ 成功修复: ${fixedCount} 个文件`);
  console.log(`  ⏭️  跳过: ${skippedCount} 个文件`);
  console.log('\n✨ 修复完成!');
  console.log('\n💡 建议:');
  console.log('  1. 请运行 npm run dev 测试修复后的代码');
  console.log('  2. 再次运行 npx tsx scripts/diagnose-routes.ts 验证所有问题已解决');
  console.log('  3. 手动检查部分复杂场景的路由是否正确\n');
}

main();
