#!/usr/bin/env ts-node

/**
 * 全面的路由诊断脚本
 * 1. 扫描所有硬编码路由
 * 2. 验证文件系统路由结构
 * 3. 检查路由是否正确使用 i18n
 * 4. 生成详细的修复报告
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
  type: 'hardcoded-href' | 'hardcoded-push' | 'hardcoded-replace' | 'hardcoded-redirect' | 'missing-route-wrapper';
  code: string;
  suggestion: string;
}

interface FileRoute {
  path: string;
  urlPath: string;
  isDynamic: boolean;
  isRouteGroup: boolean;
}

const issues: RouteIssue[] = [];
const fileRoutes: FileRoute[] = [];

// 1. 扫描文件系统路由结构
function scanFileSystemRoutes(dir: string, basePath: string = ''): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // 检查是否是 [locale] 动态路由
      if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
        // 跳过 locale，不添加到 URL
        scanFileSystemRoutes(fullPath, basePath);
      }
      // 检查是否是路由组 (group)
      else if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        const groupName = entry.name.slice(1, -1);
        fileRoutes.push({
          path: fullPath,
          urlPath: basePath, // 路由组不出现在 URL 中
          isDynamic: false,
          isRouteGroup: true
        });
        scanFileSystemRoutes(fullPath, basePath);
      }
      // 动态路由
      else if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
        const paramName = entry.name;
        const newPath = basePath + '/' + paramName;
        fileRoutes.push({
          path: fullPath,
          urlPath: newPath,
          isDynamic: true,
          isRouteGroup: false
        });
        scanFileSystemRoutes(fullPath, newPath);
      }
      // 普通路由
      else {
        const newPath = basePath + '/' + entry.name;
        fileRoutes.push({
          path: fullPath,
          urlPath: newPath,
          isDynamic: false,
          isRouteGroup: false
        });
        scanFileSystemRoutes(fullPath, newPath);
      }
    } else if (entry.name === 'page.tsx' || entry.name === 'page.jsx' || entry.name === 'page.js') {
      // 找到页面文件
      console.log(`📄 找到页面: ${basePath || '/'} -> ${fullPath}`);
    }
  }
}

// 2. 扫描文件中的硬编码路由
function scanFileForHardcodedRoutes(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(srcDir, filePath);

  // 检查是否导入了 useRouting
  const hasUseRouting = content.includes('useRouting');
  const hasRouteImport = /import.*{.*route.*}.*from.*['"].*routing['"]/.test(content);

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 检测 href="/xxx"
    const hrefMatch = line.match(/href=["']\/([^"']*?)["']/g);
    if (hrefMatch) {
      hrefMatch.forEach(match => {
        // 排除外部链接和特殊协议
        if (!match.includes('http') && !match.includes('mailto') && !match.includes('tel')) {
          const url = match.match(/["']([^"']+)["']/)?.[1];
          if (url && !url.startsWith('http')) {
            issues.push({
              file: relativePath,
              line: lineNum,
              type: 'hardcoded-href',
              code: line.trim(),
              suggestion: `使用: href={route('${url}')} 或 href={route(routes.XXX)}`
            });
          }
        }
      });
    }

    // 检测 router.push('/xxx')
    const pushMatch = line.match(/router\.(push|replace)\(['"](\/[^'"]*)['"]\)/);
    if (pushMatch) {
      const [, method, url] = pushMatch;
      if (!url.startsWith('http')) {
        issues.push({
          file: relativePath,
          line: lineNum,
          type: method === 'push' ? 'hardcoded-push' : 'hardcoded-replace',
          code: line.trim(),
          suggestion: `使用: router.${method}(route('${url}')) 或 router.${method}(route(routes.XXX))`
        });
      }
    }

    // 检测 redirect('/xxx')
    const redirectMatch = line.match(/redirect\(['"](\/[^'"]*)['"]\)/);
    if (redirectMatch) {
      const url = redirectMatch[1];
      if (!url.startsWith('http')) {
        issues.push({
          file: relativePath,
          line: lineNum,
          type: 'hardcoded-redirect',
          code: line.trim(),
          suggestion: `使用: redirect(route('${url}'))`
        });
      }
    }
  });

  // 如果文件中有路由使用但没有导入 useRouting
  if (issues.some(i => i.file === relativePath) && !hasUseRouting && !hasRouteImport) {
    issues.push({
      file: relativePath,
      line: 1,
      type: 'missing-route-wrapper',
      code: '// 文件顶部',
      suggestion: `需要导入: import { useRouting } from '@/lib/routing'; 并在组件中使用: const { route, routes } = useRouting();`
    });
  }
}

// 3. 递归扫描目录
function scanDirectory(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 跳过 node_modules 等
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      // 只扫描 TypeScript/JavaScript React 文件
      if (
        entry.name.endsWith('.tsx') ||
        entry.name.endsWith('.ts') ||
        entry.name.endsWith('.jsx') ||
        entry.name.endsWith('.js')
      ) {
        scanFileForHardcodedRoutes(fullPath);
      }
    }
  }
}

// 4. 生成报告
function generateReport(): void {
  console.log('\n');
  console.log('='.repeat(80));
  console.log('🔍 OpenAero 路由诊断报告');
  console.log('='.repeat(80));
  console.log('\n');

  // 文件系统路由摘要
  console.log('📁 文件系统路由结构:');
  console.log('-'.repeat(80));
  const routeGroups = fileRoutes.filter(r => r.isRouteGroup);
  const dynamicRoutes = fileRoutes.filter(r => r.isDynamic);
  const staticRoutes = fileRoutes.filter(r => !r.isDynamic && !r.isRouteGroup);

  console.log(`  总路由数: ${fileRoutes.length}`);
  console.log(`  - 路由组 (不影响URL): ${routeGroups.length}`);
  console.log(`  - 动态路由: ${dynamicRoutes.length}`);
  console.log(`  - 静态路由: ${staticRoutes.length}`);
  console.log('\n');

  console.log('🚨 路由组 (这些不会出现在 URL 中):');
  routeGroups.forEach(r => {
    const groupName = path.basename(r.path);
    console.log(`  - ${groupName} -> URL路径: ${r.urlPath || '/'}`);
  });
  console.log('\n');

  // 问题摘要
  console.log('⚠️  发现的问题:');
  console.log('-'.repeat(80));
  console.log(`  总计: ${issues.length} 个问题`);
  
  const issuesByType = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(issuesByType).forEach(([type, count]) => {
    const typeLabel = {
      'hardcoded-href': '硬编码 href',
      'hardcoded-push': '硬编码 router.push',
      'hardcoded-replace': '硬编码 router.replace',
      'hardcoded-redirect': '硬编码 redirect',
      'missing-route-wrapper': '缺少 route 包装'
    }[type] || type;
    console.log(`  - ${typeLabel}: ${count}`);
  });
  console.log('\n');

  // 按文件分组的详细问题
  console.log('📝 详细问题列表:');
  console.log('-'.repeat(80));
  
  const issuesByFile = issues.reduce((acc, issue) => {
    if (!acc[issue.file]) {
      acc[issue.file] = [];
    }
    acc[issue.file].push(issue);
    return acc;
  }, {} as Record<string, RouteIssue[]>);

  Object.entries(issuesByFile).forEach(([file, fileIssues]) => {
    console.log(`\n📄 ${file} (${fileIssues.length} 个问题):`);
    fileIssues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. [行 ${issue.line}] ${issue.type}`);
      console.log(`     代码: ${issue.code}`);
      console.log(`     建议: ${issue.suggestion}`);
    });
  });

  // 生成 JSON 报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRoutes: fileRoutes.length,
      routeGroups: routeGroups.length,
      dynamicRoutes: dynamicRoutes.length,
      staticRoutes: staticRoutes.length,
      totalIssues: issues.length,
      issuesByType
    },
    fileSystemRoutes: fileRoutes.map(r => ({
      path: path.relative(projectRoot, r.path),
      urlPath: r.urlPath,
      isDynamic: r.isDynamic,
      isRouteGroup: r.isRouteGroup
    })),
    issues: issues,
    recommendations: [
      '1. 所有 href 应使用 route() 包装',
      '2. 所有 router.push/replace 应使用 route() 包装',
      '3. 所有 redirect() 应使用 route() 包装',
      '4. 路由组 (auth)、(dashboard) 等不应出现在 URL 中',
      '5. 使用 routes 常量而非硬编码字符串',
      '6. 确保导入 useRouting hook'
    ]
  };

  const reportPath = path.join(projectRoot, 'route-diagnosis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log(`✅ 完整报告已保存到: route-diagnosis-report.json`);
  console.log('='.repeat(80));
  console.log('\n');

  // 退出码
  process.exit(issues.length > 0 ? 1 : 0);
}

// 主函数
function main(): void {
  console.log('🚀 开始诊断路由...\n');
  
  console.log('1️⃣ 扫描文件系统路由结构...');
  const appDir = path.join(srcDir, 'app');
  scanFileSystemRoutes(appDir);
  
  console.log('2️⃣ 扫描代码中的硬编码路由...');
  scanDirectory(srcDir);
  
  console.log('3️⃣ 生成诊断报告...');
  generateReport();
}

main();
