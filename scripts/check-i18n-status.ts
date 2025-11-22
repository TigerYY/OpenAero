/* eslint-disable no-console */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

console.log('🔍 检查项目国际化（i18n）配置状态...\n');

// 1. 检查配置文件
console.log('1️⃣ 检查配置文件:');
const configFiles = [
  'next.config.js',
  'middleware.ts',
  'src/i18n.ts',
  'src/config/app.ts',
  'src/lib/i18n-utils.ts'
];

let configOk = true;
for (const file of configFiles) {
  const exists = existsSync(resolve(process.cwd(), file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) configOk = false;
}

// 2. 检查翻译文件
console.log('\n2️⃣ 检查翻译文件:');
const translationFiles = [
  'messages/zh-CN.json',
  'messages/en-US.json'
];

let translationOk = true;
for (const file of translationFiles) {
  const exists = existsSync(resolve(process.cwd(), file));
  if (exists) {
    try {
      const content = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf-8'));
      const keys = Object.keys(content).length;
      console.log(`   ✅ ${file} (${keys} 个顶级键)`);
    } catch (error) {
      console.log(`   ⚠️  ${file} (JSON解析失败)`);
      translationOk = false;
    }
  } else {
    console.log(`   ❌ ${file} (不存在)`);
    translationOk = false;
  }
}

// 3. 检查语言切换组件
console.log('\n3️⃣ 检查语言切换组件:');
const componentFiles = [
  'src/components/ui/LanguageSwitcher.tsx',
  'src/components/layout/ClientLanguageSwitcher.tsx',
  'src/components/layout/Header.tsx'
];

let componentOk = true;
for (const file of componentFiles) {
  const exists = existsSync(resolve(process.cwd(), file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) componentOk = false;
}

// 4. 检查路由结构
console.log('\n4️⃣ 检查路由结构:');
const routeDirs = [
  'src/app/[locale]',
  'src/app/[locale]/layout.tsx',
  'src/app/[locale]/page.tsx'
];

let routeOk = true;
for (const dir of routeDirs) {
  const exists = existsSync(resolve(process.cwd(), dir));
  console.log(`   ${exists ? '✅' : '❌'} ${dir}`);
  if (!exists) routeOk = false;
}

// 5. 检查package.json依赖
console.log('\n5️⃣ 检查依赖:');
try {
  const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
  const hasNextIntl = packageJson.dependencies?.['next-intl'] || packageJson.devDependencies?.['next-intl'];
  console.log(`   ${hasNextIntl ? '✅' : '❌'} next-intl: ${hasNextIntl || '未安装'}`);
} catch (error) {
  console.log('   ❌ 无法读取 package.json');
}

// 6. 验证翻译文件键的一致性
console.log('\n6️⃣ 验证翻译文件键的一致性:');
try {
  const zhCN = JSON.parse(readFileSync(resolve(process.cwd(), 'messages/zh-CN.json'), 'utf-8'));
  const enUS = JSON.parse(readFileSync(resolve(process.cwd(), 'messages/en-US.json'), 'utf-8'));
  
  const zhKeys = getAllKeys(zhCN);
  const enKeys = getAllKeys(enUS);
  
  const missingInEn = zhKeys.filter(key => !enKeys.includes(key));
  const missingInZh = enKeys.filter(key => !zhKeys.includes(key));
  
  if (missingInEn.length === 0 && missingInZh.length === 0) {
    console.log(`   ✅ 翻译键完全一致 (${zhKeys.length} 个键)`);
  } else {
    console.log(`   ⚠️  翻译键不一致:`);
    if (missingInEn.length > 0) {
      console.log(`      - 英文缺失 ${missingInEn.length} 个键: ${missingInEn.slice(0, 5).join(', ')}${missingInEn.length > 5 ? '...' : ''}`);
    }
    if (missingInZh.length > 0) {
      console.log(`      - 中文缺失 ${missingInZh.length} 个键: ${missingInZh.slice(0, 5).join(', ')}${missingInZh.length > 5 ? '...' : ''}`);
    }
  }
} catch (error) {
  console.log('   ⚠️  无法验证翻译键一致性');
}

// 7. 总结
console.log('\n' + '='.repeat(50));
console.log('📊 总结:');
console.log(`   配置文件: ${configOk ? '✅' : '❌'}`);
console.log(`   翻译文件: ${translationOk ? '✅' : '❌'}`);
console.log(`   组件文件: ${componentOk ? '✅' : '❌'}`);
console.log(`   路由结构: ${routeOk ? '✅' : '❌'}`);

const allOk = configOk && translationOk && componentOk && routeOk;
if (allOk) {
  console.log('\n✅ 国际化配置完整！');
  console.log('\n📝 测试建议:');
  console.log('   1. 访问 http://localhost:3000/zh-CN 测试中文版本');
  console.log('   2. 访问 http://localhost:3000/en-US 测试英文版本');
  console.log('   3. 点击页面上的语言切换器测试切换功能');
  console.log('   4. 检查URL是否正确包含语言前缀');
} else {
  console.log('\n⚠️  发现配置问题，请检查上述错误项');
}

// 辅助函数：获取所有嵌套键
function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

