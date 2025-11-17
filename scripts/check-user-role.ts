/**
 * 验证用户角色脚本
 * 检查指定用户的角色和权限
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误: 缺少 Supabase 环境变量');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkUserRole(email: string) {
  try {
    console.log(`🔍 检查用户角色: ${email}\n`);

    // 1. 从 Supabase Auth 查找用户
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ 查询 Supabase Auth 用户失败:', authError.message);
      return;
    }

    const authUser = authUsers.users.find(u => u.email === email);

    if (!authUser) {
      console.log('❌ 未找到该邮箱的用户');
      return;
    }

    console.log('✅ 找到用户:');
    console.log(`   ID: ${authUser.id}`);
    console.log(`   邮箱: ${authUser.email}`);
    console.log(`   邮箱验证: ${authUser.email_confirmed_at ? '已验证' : '未验证'}`);
    console.log(`   创建时间: ${authUser.created_at}`);

    // 2. 检查 user_profiles
    const profile = await prisma.userProfile.findUnique({
      where: { user_id: authUser.id },
    });

    if (!profile) {
      console.log('\n❌ 未找到 user_profiles 记录');
      console.log('   用户需要先登录创建档案，或使用 set-admin-role.ts 创建');
      return;
    }

    console.log('\n📋 用户档案信息:');
    console.log(`   档案ID: ${profile.id}`);
    console.log(`   状态: ${profile.status}`);
    console.log(`   角色: ${Array.isArray(profile.roles) ? profile.roles.join(', ') : profile.roles}`);
    console.log(`   显示名称: ${profile.display_name || '未设置'}`);
    console.log(`   创建时间: ${profile.created_at}`);
    console.log(`   更新时间: ${profile.updated_at}`);

    // 3. 权限分析
    const roles = Array.isArray(profile.roles) ? profile.roles : [profile.roles];
    
    console.log('\n🔐 权限分析:');
    if (roles.includes('SUPER_ADMIN')) {
      console.log('   ⭐ 超级管理员 - 拥有所有系统权限');
      console.log('   ✅ 可以访问: /admin/* 所有管理页面');
      console.log('   ✅ 可以管理: 用户、角色、方案、系统设置');
      console.log('   ✅ 可以修改: 其他超级管理员');
    } else if (roles.includes('ADMIN')) {
      console.log('   🔑 管理员 - 拥有大部分管理权限');
      console.log('   ✅ 可以访问: /admin/* 大部分管理页面');
      console.log('   ✅ 可以管理: 用户、方案、内容');
      console.log('   ❌ 不能管理: 超级管理员');
    } else if (roles.includes('CREATOR')) {
      console.log('   🎨 创作者 - 可以创建和管理自己的方案');
      console.log('   ✅ 可以访问: /creator/* 创作者页面');
      console.log('   ✅ 可以管理: 自己的方案和资产');
    } else if (roles.includes('REVIEWER')) {
      console.log('   👀 审核员 - 可以审核方案');
      console.log('   ✅ 可以访问: /review/* 审核页面');
      console.log('   ✅ 可以管理: 方案审核流程');
    } else {
      console.log('   👤 普通用户 - 基本权限');
      console.log('   ✅ 可以访问: 个人资料、浏览内容');
    }

    // 4. 访问建议
    console.log('\n💻 访问建议:');
    if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
      console.log('   🌐 管理员仪表盘: http://localhost:3000/admin/dashboard');
      console.log('   👥 用户管理: http://localhost:3000/admin/users');
      console.log('   🛡️ 权限管理: http://localhost:3000/admin/permissions');
    }
    if (roles.includes('CREATOR')) {
      console.log('   🎨 创作者中心: http://localhost:3000/creator/dashboard');
    }
    console.log('   👤 个人资料: http://localhost:3000/profile');

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 主函数
async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ 请提供邮箱地址');
    console.error('用法: npx tsx scripts/check-user-role.ts user@example.com');
    process.exit(1);
  }

  await checkUserRole(email);
}

main().catch(console.error);