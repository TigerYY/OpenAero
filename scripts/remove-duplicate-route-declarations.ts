#!/usr/bin/env tsx
/**
 * 自动移除重复的 useRouting 声明
 */

import * as fs from 'fs';
import * as path from 'path';

const files = [
  'src/app/solutions/[id]/edit/page.tsx',
  'src/app/solutions/create/page.tsx',
  'src/app/register/page.tsx',
  'src/app/orders/[id]/page.tsx',
  'src/app/orders/page.tsx',
  'src/app/login/page.tsx',
  'src/components/ui/Logo.tsx',
  'src/components/sections/SolutionsSection.tsx',
  'src/components/sections/CaseStudiesSection.tsx',
  'src/components/sections/HeroSection.tsx',
  'src/components/auth/ProtectedRoute.tsx',
  'src/components/auth/UserMenu.tsx',
  'src/components/layout/RoleBasedNavigation.tsx',
  'src/components/layout/ClientHeader.tsx',
];

function removeDuplicateRouteDeclarations(filePath: string): boolean {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    let content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    // 找到所有 useRouting 声明行
    const routingDeclarations: number[] = [];
    lines.forEach((line, index) => {
      if (/const\s*{\s*route/.test(line) && /useRouting\(\)/.test(line)) {
        routingDeclarations.push(index);
      }
    });
    
    if (routingDeclarations.length <= 1) {
      console.log(`✅ ${filePath} - 无重复声明`);
      return false;
    }
    
    console.log(`🔧 ${filePath} - 发现 ${routingDeclarations.length} 个声明，正在修复...`);
    
    // 保留第一个完整的声明（包含 routes 的），删除其他的
    let firstCompleteIndex = -1;
    let firstSimpleIndex = -1;
    
    for (const index of routingDeclarations) {
      const line = lines[index];
      if (/routes/.test(line) && firstCompleteIndex === -1) {
        firstCompleteIndex = index;
      } else if (firstSimpleIndex === -1) {
        firstSimpleIndex = index;
      }
    }
    
    // 决定保留哪一个
    const keepIndex = firstCompleteIndex !== -1 ? firstCompleteIndex : firstSimpleIndex;
    
    // 删除其他声明
    const newLines = lines.filter((line, index) => {
      if (routingDeclarations.includes(index) && index !== keepIndex) {
        console.log(`  ❌ 删除第 ${index + 1} 行: ${line.trim()}`);
        return false;
      }
      return true;
    });
    
    // 写回文件
    fs.writeFileSync(fullPath, newLines.join('\n'), 'utf-8');
    console.log(`  ✅ 已修复，保留第 ${keepIndex + 1} 行\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${filePath} - 修复失败:`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 开始移除重复的 useRouting 声明...\n');
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  for (const file of files) {
    const fixed = removeDuplicateRouteDeclarations(file);
    if (fixed) {
      fixedCount++;
    } else {
      skippedCount++;
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 修复完成统计：');
  console.log(`✅ 成功修复: ${fixedCount}`);
  console.log(`⏭️  无需修复: ${skippedCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
