/**
 * 设置用户为管理员脚本
 * 将指定邮箱的用户角色设置为 ADMIN
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

async function setAdminRole(email: string, role: 'ADMIN' | 'SUPER_ADMIN' = 'ADMIN') {
  try {
    console.log(`\n🔧 设置用户角色: ${email} -> ${role}\n`);

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

    // 2. 检查 user_profiles 是否存在
    const profile = await prisma.userProfile.findUnique({
      where: { user_id: authUser.id },
    });

    if (!profile) {
      console.log('\n⚠️  未找到 user_profiles 记录');
      console.log('   正在创建 user_profiles...');
      
      // 创建 user_profiles
      const newProfile = await prisma.userProfile.create({
        data: {
          user_id: authUser.id,
          role: role,
          status: 'ACTIVE',
        },
      });
      
      console.log('✅ user_profiles 创建成功');
      console.log(`   角色已设置为: ${newProfile.role}`);
      return;
    }

    // 3. 更新角色
    console.log(`\n📝 当前角色: ${profile.role}`);
    console.log(`📝 目标角色: ${role}`);

    if (profile.role === role) {
      console.log(`\n✅ 用户已经是 ${role}，无需修改`);
      return;
    }

    const updatedProfile = await prisma.userProfile.update({
      where: { user_id: authUser.id },
      data: { role: role },
    });

    console.log('\n✅ 角色更新成功！');
    console.log(`   旧角色: ${profile.role}`);
    console.log(`   新角色: ${updatedProfile.role}`);
    console.log(`   状态: ${updatedProfile.status}`);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 用户现在是管理员了！');
    console.log(`   邮箱: ${email}`);
    console.log(`   角色: ${role}`);
    if (role === 'SUPER_ADMIN') {
      console.log('   ⭐ 超级管理员 - 拥有所有权限');
    } else {
      console.log('   🔑 管理员 - 拥有管理权限');
    }
    console.log('='.repeat(50) + '\n');

    console.log('💡 提示:');
    console.log('   1. 请重新登录以刷新权限');
    console.log('   2. 登录后可以在用户菜单中看到"管理员仪表盘"选项');
    console.log('   3. 访问 /admin/dashboard 查看管理员页面\n');

  } catch (error) {
    console.error('❌ 设置失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 主函数
async function main() {
  const email = process.argv[2] || 'openaero.iot@gmail.com';
  const role = (process.argv[3] || 'ADMIN').toUpperCase() as 'ADMIN' | 'SUPER_ADMIN';
  
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    console.error('❌ 无效的角色');
    console.error('   有效角色: ADMIN, SUPER_ADMIN');
    process.exit(1);
  }

  await setAdminRole(email, role);
}

main().catch(console.error);

