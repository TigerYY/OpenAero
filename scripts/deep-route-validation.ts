#!/usr/bin/env tsx
/**
 * 深度路由验证工具 - 检测静态分析遗漏的运行时问题
 * 
 * 检测项：
 * 1. 服务端组件中使用 useRouting (运行时错误)
 * 2. 使用 route() 但未声明的变量 (运行时错误)
 * 3. 客户端组件缺少 'use client' 指令
 * 4. 动态导入的路由问题
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface Issue {
  file: string;
  line: number;
  type: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  code: string;
}

const issues: Issue[] = [];

function checkFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const hasUseClient = content.includes("'use client'") || content.includes('"use client"');
  const hasUseRouting = content.includes('useRouting');
  const hasRouteCall = /\broute\s*\(/.test(content);
  const hasRouteDeclaration = /const\s*{\s*route\s*}\s*=\s*useRouting\s*\(\)/.test(content);
  
  // 🔴 严重问题：服务端组件使用 useRouting
  if (!hasUseClient && hasUseRouting) {
    const importLine = lines.findIndex(l => l.includes('useRouting'));
    issues.push({
      file: filePath,
      line: importLine + 1,
      type: 'critical',
      category: 'Server Component Hook Usage',
      message: '服务端组件不能使用 React hooks (useRouting)',
      code: lines[importLine]?.trim() || ''
    });
  }
  
  // 🔴 严重问题：使用 route() 但未声明
  if (hasRouteCall && !hasRouteDeclaration && hasUseClient) {
    const routeCallLine = lines.findIndex(l => /\broute\s*\(/.test(l));
    issues.push({
      file: filePath,
      line: routeCallLine + 1,
      type: 'critical',
      category: 'Undefined Variable',
      message: '使用了 route() 但未通过 useRouting() 声明',
      code: lines[routeCallLine]?.trim() || ''
    });
  }
  
  // ⚠️ 警告：客户端组件缺少 'use client'
  if (hasUseRouting && !hasUseClient) {
    // 检查是否在 (auth) 或 (dashboard) 等客户端目录中
    if (filePath.includes('/(auth)/') || filePath.includes('/(dashboard)/')) {
      issues.push({
        file: filePath,
        line: 1,
        type: 'warning',
        category: 'Missing Use Client',
        message: '客户端目录中的组件应该添加 "use client" 指令',
        code: 'Missing: "use client"'
      });
    }
  }
  
  // 🔴 严重问题：动态路由在服务端组件中
  if (!hasUseClient && /href=\{.*route\s*\(/.test(content)) {
    const dynamicRouteLine = lines.findIndex(l => /href=\{.*route\s*\(/.test(l));
    issues.push({
      file: filePath,
      line: dynamicRouteLine + 1,
      type: 'critical',
      category: 'Dynamic Route in Server Component',
      message: '服务端组件不能使用动态路由函数',
      code: lines[dynamicRouteLine]?.trim() || ''
    });
  }
  
  // ℹ️ 信息：检查是否使用了旧的硬编码模式
  const hardcodedPatterns = [
    /href=["']\/(?!_next|api)[a-z]/,  // href="/xxx"
    /push\(["']\/[a-z]/,                // router.push("/xxx")
    /redirect\(["']\/[a-z]/             // redirect("/xxx")
  ];
  
  hardcodedPatterns.forEach(pattern => {
    lines.forEach((line, idx) => {
      if (pattern.test(line) && !line.includes('route(')) {
        // 排除注释和导入语句
        if (!line.trim().startsWith('//') && !line.includes('import')) {
          issues.push({
            file: filePath,
            line: idx + 1,
            type: 'info',
            category: 'Potential Hardcoded Route',
            message: '可能存在硬编码路由（需人工确认）',
            code: line.trim()
          });
        }
      }
    });
  });
}

async function main() {
  console.log('🔍 开始深度路由验证...\n');
  
  const files = await glob('src/**/*.{ts,tsx}', {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', '**/*.d.ts', '**/*.test.*']
  });
  
  console.log(`📁 扫描 ${files.length} 个文件...\n`);
  
  files.forEach(file => {
    checkFile(path.join(process.cwd(), file));
  });
  
  // 分类统计
  const critical = issues.filter(i => i.type === 'critical');
  const warnings = issues.filter(i => i.type === 'warning');
  const info = issues.filter(i => i.type === 'info');
  
  console.log('📊 验证结果：\n');
  console.log(`🔴 严重问题: ${critical.length}`);
  console.log(`⚠️  警告: ${warnings.length}`);
  console.log(`ℹ️  信息: ${info.length}\n`);
  
  // 输出详细问题
  if (critical.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔴 严重问题（会导致运行时错误）：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    critical.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.file}:${issue.line}`);
      console.log(`   [${issue.category}] ${issue.message}`);
      console.log(`   代码: ${issue.code}\n`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  警告（可能导致问题）：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    warnings.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.file}:${issue.line}`);
      console.log(`   [${issue.category}] ${issue.message}\n`);
    });
  }
  
  // 保存报告
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    summary: {
      critical: critical.length,
      warnings: warnings.length,
      info: info.length
    },
    issues: issues
  };
  
  fs.writeFileSync(
    'deep-validation-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📄 详细报告已保存: deep-validation-report.json`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 退出码
  process.exit(critical.length > 0 ? 1 : 0);
}

main().catch(console.error);
