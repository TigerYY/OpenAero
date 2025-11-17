/**
 * 验证路由修复脚本
 * 检查修复后的路由是否正确使用路由工具库
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface RouteFixResult {
  file: string;
  status: 'fixed' | 'needs_fix' | 'ok';
  issues: string[];
  fixes: string[];
}

const results: RouteFixResult[] = [];

// 需要检查的文件模式
const patterns = {
  hardcodedRoute: /router\.push\(['"]\/[a-z]|href=['"]\/[a-z]|redirect\(['"]\/[a-z]/i,
  usingRouteUtils: /route\(routes\.|routeWithParams\(routes\.|routeWithDynamicParams\(routes\.|RoutingUtils\.generateRoute/i,
  usingRouteFunction: /route\(['"]\/|routeWithParams\(['"]\/|routeWithDynamicParams\(['"]\//i,
};

// 已修复的文件列表
const fixedFiles = [
  'src/components/profile/PasswordChangeForm.tsx',
  'src/app/api/auth/callback/route.ts',
  'src/app/api/auth/verify-email/route.ts',
  'src/app/[locale]/(dashboard)/settings/page.tsx',
  'src/app/[locale]/(auth)/register/page.tsx',
  'src/app/[locale]/(auth)/reset-password/page.tsx',
  'src/app/[locale]/creators/apply/page.tsx',
  'src/app/[locale]/creators/apply/success/page.tsx',
  'src/app/[locale]/creators/apply/status/page.tsx',
  'src/app/[locale]/creators/solutions/page.tsx',
  'src/app/[locale]/creators/solutions/[id]/edit/page.tsx',
  'src/app/[locale]/creators/solutions/new/page.tsx',
  'src/app/[locale]/solutions/[id]/page.tsx',
  'src/app/[locale]/shop/page.tsx',
  'src/app/[locale]/shop/products/[slug]/page.tsx',
  'src/app/[locale]/admin/applications/page.tsx',
  'src/app/[locale]/admin/solutions/page.tsx',
  'src/app/[locale]/contact/ContactPageClient.tsx',
  'src/app/[locale]/payment/success/page.tsx',
  'src/app/[locale]/payment/failure/page.tsx',
  'src/app/sw.js',
];

function checkFile(filePath: string): RouteFixResult {
  const content = readFileSync(filePath, 'utf-8');
  const issues: string[] = [];
  const fixes: string[] = [];
  let status: 'fixed' | 'needs_fix' | 'ok' = 'ok';

  // 检查是否使用路由工具库
  const hasRouteUtils = patterns.usingRouteUtils.test(content);
  const hasRouteFunction = patterns.usingRouteFunction.test(content);
  const hasHardcoded = patterns.hardcodedRoute.test(content);

  if (hasHardcoded) {
    status = 'needs_fix';
    issues.push('发现硬编码路由');
  } else if (hasRouteUtils || hasRouteFunction) {
    status = 'fixed';
    fixes.push('已使用路由工具库');
  }

  return {
    file: filePath,
    status,
    issues,
    fixes,
  };
}

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // 跳过不需要的目录
      if (!['node_modules', '.next', 'coverage', 'dist', 'build', 'out'].includes(file)) {
        scanDirectory(filePath, fileList);
      }
    } else if (
      (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) &&
      !file.includes('.test.') &&
      !file.includes('.spec.')
    ) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// 主函数
function main() {
  console.log('🔍 开始验证路由修复...\n');

  // 扫描关键目录
  const srcDir = join(process.cwd(), 'src');
  const files = scanDirectory(srcDir);

  // 检查已修复的文件
  let fixedCount = 0;
  let needsFixCount = 0;
  let okCount = 0;

  files.forEach((file) => {
    const relativePath = file.replace(process.cwd() + '/', '');
    const result = checkFile(file);

    if (fixedFiles.includes(relativePath)) {
      result.status = 'fixed';
      fixedCount++;
    } else if (result.status === 'needs_fix') {
      needsFixCount++;
    } else {
      okCount++;
    }

    if (result.status !== 'ok' || fixedFiles.includes(relativePath)) {
      results.push({ ...result, file: relativePath });
    }
  });

  // 输出结果
  console.log('📊 验证结果统计:');
  console.log(`  ✅ 已修复: ${fixedCount} 个文件`);
  console.log(`  ⚠️  需要修复: ${needsFixCount} 个文件`);
  console.log(`  ✓ 正常: ${okCount} 个文件`);
  console.log(`  📁 总计检查: ${files.length} 个文件\n`);

  if (results.length > 0) {
    console.log('📋 详细结果:\n');
    results.forEach((result) => {
      const icon = result.status === 'fixed' ? '✅' : result.status === 'needs_fix' ? '⚠️' : '✓';
      console.log(`${icon} ${result.file}`);
      if (result.fixes.length > 0) {
        result.fixes.forEach((fix) => console.log(`   ✓ ${fix}`));
      }
      if (result.issues.length > 0) {
        result.issues.forEach((issue) => console.log(`   ⚠️  ${issue}`));
      }
    });
  }

  console.log('\n✨ 验证完成！');
  
  if (needsFixCount === 0) {
    console.log('🎉 所有关键文件的路由修复已完成！');
    process.exit(0);
  } else {
    console.log(`⚠️  还有 ${needsFixCount} 个文件需要检查。`);
    process.exit(1);
  }
}

main();

