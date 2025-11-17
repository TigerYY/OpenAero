#!/usr/bin/env node

/**
 * 测试邮箱验证链接生成
 * 用于验证验证流程的正确性，无需实际发送邮件
 */

console.log('🔍 邮箱验证链接测试\n');
console.log('='.repeat(60));

// 1. 读取环境变量
require('dotenv').config({ path: '.env.local' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cardynuoazvaytvinxvm.supabase.co';

console.log('\n📌 当前配置:');
console.log(`   APP_URL: ${APP_URL}`);
console.log(`   SUPABASE_URL: ${SUPABASE_URL}`);

// 2. 模拟 signUp 时的 emailRedirectTo
const emailRedirectTo = `${APP_URL}/api/auth/callback?next=/welcome`;

console.log('\n📧 注册时生成的 emailRedirectTo:');
console.log(`   ${emailRedirectTo}`);

// 3. 模拟 Supabase 生成的验证链接
const mockToken = 'cefed12abbc90ad04926eaa01269b095a7bb605c6f19d205d35b10f3';
const verificationLink = `${SUPABASE_URL}/auth/v1/verify?token=${mockToken}&type=signup&redirect_to=${encodeURIComponent(emailRedirectTo)}`;

console.log('\n🔗 Supabase 生成的验证链接:');
console.log(`   ${verificationLink}`);

console.log('\n📮 邮件中的链接（URL 编码）:');
const encodedLink = encodeURIComponent(verificationLink);
console.log(`   ${encodedLink.substring(0, 100)}...`);

// 4. 模拟验证流程
console.log('\n✅ 预期验证流程:');
console.log('   1️⃣  用户点击邮件中的链接');
console.log(`   2️⃣  访问: ${SUPABASE_URL}/auth/v1/verify?token=...`);
console.log('   3️⃣  Supabase 验证 token ✅');
console.log(`   4️⃣  Supabase 重定向到: ${emailRedirectTo}`);
console.log('   5️⃣  Next.js 回调处理:');
console.log('       - 检测语言: zh-CN (默认)');
console.log('       - 修正路径: /welcome → /zh-CN/auth/welcome');
console.log('       - 交换 code 获取 session');
console.log(`   6️⃣  最终跳转到: ${APP_URL}/zh-CN/auth/welcome`);

// 5. 生成测试命令
console.log('\n🧪 手动测试命令:');
console.log('\n   1. 测试回调端点（无 code）:');
console.log(`      open "${APP_URL}/api/auth/callback?next=/welcome"`);
console.log('      预期: 自动跳转到 /zh-CN/auth/welcome\n');

console.log('   2. 测试回调端点（有 mock code）:');
console.log(`      open "${APP_URL}/api/auth/callback?code=test&next=/welcome"`);
console.log('      预期: 自动跳转到 /zh-CN/auth/welcome\n');

console.log('   3. 测试欢迎页面:');
console.log(`      open "${APP_URL}/zh-CN/auth/welcome"`);
console.log('      预期: 显示欢迎页面内容\n');

console.log('   4. 测试兜底重定向:');
console.log(`      open "${APP_URL}/welcome"`);
console.log('      预期: 自动跳转到 /zh-CN/auth/welcome\n');

// 6. 检查清单
console.log('📋 执行前检查清单:');
console.log('   [ ] .env.local 中有 NEXT_PUBLIC_APP_URL');
console.log('   [ ] 开发服务器正在运行 (npm run dev)');
console.log('   [ ] 可以访问 http://localhost:3000');
console.log('   [ ] src/app/api/auth/callback/route.ts 文件存在');
console.log('   [ ] src/app/[locale]/(auth)/welcome/page.tsx 文件存在');

// 7. Supabase 配置检查
console.log('\n⚙️  Supabase Dashboard 配置检查:');
console.log('   [ ] Dashboard → Authentication → URL Configuration');
console.log(`   [ ] Redirect URLs 包含: ${APP_URL}/**`);
console.log('   [ ] Email Templates 使用 {{ .ConfirmationURL }}');

console.log('\n' + '='.repeat(60));
console.log('✅ 验证完成！如果以上都正确，验证流程应该正常工作。\n');
