/**
 * 检查用户角色脚本
 * 查询指定邮箱的用户角色
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
  console.error('请确保 .env.local 文件中包含:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
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
    console.log(`\n🔍 查询用户: ${email}\n`);

    // 1. 从 Supabase Auth 查找用户
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ 查询 Supabase Auth 用户失败:', authError.message);
      return;
    }

    const authUser = authUsers.users.find(u => u.email === email);

    if (!authUser) {
      console.log('❌ 未找到该邮箱的用户');
      console.log('\n📋 Supabase Auth 中的用户列表:');
      authUsers.users.forEach(u => {
        console.log(`  - ${u.email} (${u.id})`);
      });
      return;
    }

    console.log('✅ 在 Supabase Auth 中找到用户:');
    console.log(`   ID: ${authUser.id}`);
    console.log(`   邮箱: ${authUser.email}`);
    console.log(`   邮箱已验证: ${authUser.email_confirmed_at ? '是' : '否'}`);
    console.log(`   创建时间: ${authUser.created_at}`);

    // 2. 从 user_profiles 表查找用户资料
    const profile = await prisma.userProfile.findUnique({
      where: { user_id: authUser.id },
    });

    if (!profile) {
      console.log('\n⚠️  未找到 user_profiles 记录');
      console.log('   用户可能还未完成注册流程');
      return;
    }

    console.log('\n✅ 在 user_profiles 中找到用户资料:');
    console.log(`   Profile ID: ${profile.id}`);
    console.log(`   显示名称: ${profile.display_name || '(未设置)'}`);
    console.log(`   名字: ${profile.first_name || '(未设置)'}`);
    console.log(`   姓氏: ${profile.last_name || '(未设置)'}`);
    console.log(`   角色: ${profile.role}`);
    console.log(`   状态: ${profile.status}`);
    console.log(`   是否被阻止: ${profile.is_blocked ? '是' : '否'}`);
    console.log(`   创建时间: ${profile.created_at}`);
    console.log(`   最后登录: ${profile.last_login_at || '(从未登录)'}`);

    // 3. 检查是否为管理员
    const isAdmin = profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';
    
    console.log('\n' + '='.repeat(50));
    if (isAdmin) {
      console.log('✅ 该用户是管理员');
      console.log(`   角色: ${profile.role}`);
      if (profile.role === 'SUPER_ADMIN') {
        console.log('   ⭐ 超级管理员 - 拥有所有权限');
      } else {
        console.log('   🔑 管理员 - 拥有管理权限');
      }
    } else {
      console.log('❌ 该用户不是管理员');
      console.log(`   当前角色: ${profile.role}`);
      console.log('\n💡 要将其设置为管理员，可以:');
      console.log('   1. 在 Supabase Dashboard 中手动更新 user_profiles 表');
      console.log('   2. 使用管理员账号在用户管理页面修改角色');
      console.log('   3. 运行 SQL:');
      console.log(`      UPDATE user_profiles SET role = 'ADMIN' WHERE user_id = '${authUser.id}';`);
    }
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 主函数
async function main() {
  const email = process.argv[2] || 'openaero.iot@gmail.com';
  
  if (!email) {
    console.error('❌ 请提供邮箱地址');
    console.error('用法: npx tsx scripts/check-user-role.ts <email>');
    process.exit(1);
  }

  await checkUserRole(email);
}

main().catch(console.error);

