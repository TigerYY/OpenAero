#!/usr/bin/env tsx
/**
 * 路由覆盖率检查工具
 * 检查 ROUTES 中定义的路由是否都有对应的页面文件
 */

import * as fs from 'fs';
import * as path from 'path';

// 直接导入 ROUTES 定义
const ROUTES = {
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    VERIFY_EMAIL: '/verify-email',
    VERIFY_EMAIL_NOTICE: '/verify-email-notice',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    PROFILE: '/profile',
    SESSIONS: '/profile/sessions',
    LOGOUT: '/logout',
  },
  BUSINESS: {
    HOME: '/',
    SOLUTIONS: '/solutions',
    SOLUTION_DETAIL: '/solutions/[id]',
    SHOP: '/shop/products',
    PRODUCT_DETAIL: '/shop/products/[slug]',
    CREATORS_APPLY: '/creators/apply',
    CONTACT: '/contact',
    ABOUT: '/about',
    CASES: '/cases',
    CASE_DETAIL: '/cases/[id]',
  },
  CREATORS: {
    HOME: '/creators',
    DASHBOARD: '/creators/dashboard',
    PRODUCTS: '/creators/products',
    ORDERS: '/creators/orders',
    ANALYTICS: '/creators/analytics',
    STATUS: '/creators/status',
    GUIDE: '/creators/guide',
    REVENUE: '/creators/revenue',
  },
  ORDERS: {
    HOME: '/orders',
    DETAIL: '/orders/[id]',
  },
  SUPPLY_CHAIN: {
    FACTORIES: '/supply-chain/factories',
    SAMPLE_ORDERS: '/supply-chain/sample-orders',
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    SOLUTIONS: '/admin/solutions',
    ORDERS: '/admin/orders',
    CREATORS: '/admin/creators',
    SETTINGS: '/admin/settings',
  },
} as const;

function flattenRoutes(routes: any, prefix = '', category = ''): Array<{ path: string; category: string }> {
  const result: Array<{ path: string; category: string }> = [];
  
  for (const [key, value] of Object.entries(routes)) {
    if (typeof value === 'string') {
      result.push({ 
        path: value, 
        category: category || key 
      });
    } else if (typeof value === 'object' && value !== null) {
      result.push(...flattenRoutes(value, prefix, category || key));
    }
  }
  
  return result;
}

function checkPageExists(route: string): { exists: boolean; foundPath?: string } {
  const possiblePaths = [
    `src/app${route}/page.tsx`,
    `src/app/[locale]${route}/page.tsx`,
    `src/app${route}/page.ts`,
    `src/app/[locale]${route}/page.ts`,
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return { exists: true, foundPath: p };
    }
  }
  
  return { exists: false };
}

function checkRouteCoverage() {
  console.log('📋 开始路由覆盖率检查...\n');
  
  const definedRoutes = flattenRoutes(ROUTES);
  
  console.log(`📊 发现 ${definedRoutes.length} 个定义的路由\n`);
  
  const missingPages: Array<{ path: string; category: string }> = [];
  const existingPages: Array<{ path: string; category: string; file: string }> = [];
  
  for (const { path: route, category } of definedRoutes) {
    const { exists, foundPath } = checkPageExists(route);
    
    if (exists) {
      existingPages.push({ path: route, category, file: foundPath! });
    } else {
      missingPages.push({ path: route, category });
    }
  }
  
  // 按类别分组显示
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 存在的页面 (' + existingPages.length + '/' + definedRoutes.length + ')');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const categorized = existingPages.reduce((acc, { path, category, file }) => {
    if (!acc[category]) acc[category] = [];
    acc[category].push({ path, file });
    return acc;
  }, {} as Record<string, Array<{ path: string; file: string }>>);
  
  for (const [category, routes] of Object.entries(categorized)) {
    console.log(`📁 ${category}:`);
    routes.forEach(({ path, file }) => {
      console.log(`  ✅ ${path.padEnd(30)} → ${file}`);
    });
    console.log();
  }
  
  // 显示缺失的页面
  if (missingPages.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ 缺失的页面 (' + missingPages.length + ')');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const missingCategorized = missingPages.reduce((acc, { path, category }) => {
      if (!acc[category]) acc[category] = [];
      acc[category].push(path);
      return acc;
    }, {} as Record<string, string[]>);
    
    for (const [category, routes] of Object.entries(missingCategorized)) {
      console.log(`📁 ${category}:`);
      routes.forEach(route => {
        console.log(`  ❌ ${route}`);
        console.log(`     建议创建: src/app/[locale]${route}/page.tsx`);
      });
      console.log();
    }
  }
  
  // 统计信息
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 统计信息');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const coverage = ((existingPages.length / definedRoutes.length) * 100).toFixed(2);
  console.log(`总路由数量: ${definedRoutes.length}`);
  console.log(`存在页面: ${existingPages.length}`);
  console.log(`缺失页面: ${missingPages.length}`);
  console.log(`覆盖率: ${coverage}%\n`);
  
  if (missingPages.length === 0) {
    console.log('🎉 所有路由都有对应的页面文件！\n');
    process.exit(0);
  } else {
    console.log('⚠️  存在缺失的页面文件，请及时创建\n');
    process.exit(1);
  }
}

checkRouteCoverage();
