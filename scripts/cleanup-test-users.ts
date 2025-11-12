/**
 * 彻底清理测试用户脚本
 * 删除所有测试和未验证账号，只保留管理员账号
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的环境变量:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 管理员邮箱列表（需要保留的账号）
const ADMIN_EMAILS = [
  'openaero.iot@gmail.com'  // 主管理员账号
];

interface UserStats {
  totalUsers: number;
  adminUsers: number;
  testUsers: number;
  deletedUsers: number;
}

async function cleanupTestUsers() {
  console.log('🚀 开始清理测试用户...\n');

  const stats: UserStats = {
    totalUsers: 0,
    adminUsers: 0,
    testUsers: 0,
    deletedUsers: 0
  };

  try {
    // 1. 从 Prisma 数据库获取所有用户
    console.log('📊 步骤 1: 获取所有用户信息...');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        supabaseId: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    stats.totalUsers = allUsers.length;
    console.log(`   总用户数: ${stats.totalUsers}\n`);

    // 2. 分类用户
    const adminUsers = allUsers.filter(user => ADMIN_EMAILS.includes(user.email));
    const testUsers = allUsers.filter(user => !ADMIN_EMAILS.includes(user.email));

    stats.adminUsers = adminUsers.length;
    stats.testUsers = testUsers.length;

    console.log('👤 用户分类:');
    console.log(`   管理员用户: ${stats.adminUsers} 个`);
    adminUsers.forEach(user => {
      console.log(`     - ${user.email} (${user.role})`);
    });
    console.log(`\n   测试用户: ${stats.testUsers} 个`);
    testUsers.forEach(user => {
      console.log(`     - ${user.email} (验证: ${user.emailVerified ? '✓' : '✗'})`);
    });

    if (testUsers.length === 0) {
      console.log('\n✅ 没有需要清理的测试用户');
      return stats;
    }

    console.log('\n⚠️  即将删除以上测试用户，10秒后开始...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 3. 删除测试用户
    console.log('\n🗑️  步骤 2: 删除测试用户...');
    
    for (const user of testUsers) {
      try {
        console.log(`   删除用户: ${user.email}`);

        // 3.1 从 Supabase Auth 删除
        if (user.supabaseId) {
          const { error: authError } = await supabase.auth.admin.deleteUser(
            user.supabaseId
          );
          if (authError) {
            console.error(`     ❌ Supabase Auth 删除失败: ${authError.message}`);
          } else {
            console.log(`     ✓ Supabase Auth 删除成功`);
          }
        }

        // 3.2 从 Prisma 数据库删除（级联删除关联数据）
        await prisma.user.delete({
          where: { id: user.id }
        });
        console.log(`     ✓ Prisma 数据库删除成功`);

        stats.deletedUsers++;

        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`     ❌ 删除失败: ${error.message}`);
      }
    }

    // 4. 验证清理结果
    console.log('\n✅ 步骤 3: 验证清理结果...');
    const remainingUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true
      }
    });

    console.log(`   剩余用户数: ${remainingUsers.length}`);
    remainingUsers.forEach(user => {
      console.log(`     - ${user.email} (${user.role}, 验证: ${user.emailVerified ? '✓' : '✗'})`);
    });

    // 5. 打印统计信息
    console.log('\n📈 清理统计:');
    console.log(`   原始用户数: ${stats.totalUsers}`);
    console.log(`   管理员用户: ${stats.adminUsers}`);
    console.log(`   测试用户数: ${stats.testUsers}`);
    console.log(`   已删除用户: ${stats.deletedUsers}`);
    console.log(`   剩余用户数: ${remainingUsers.length}`);

    if (stats.deletedUsers === stats.testUsers) {
      console.log('\n✅ 所有测试用户已成功清理！');
    } else {
      console.log(`\n⚠️  部分用户删除失败 (${stats.testUsers - stats.deletedUsers} 个)`);
    }

    return stats;

  } catch (error: any) {
    console.error('\n❌ 清理过程出错:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行清理
cleanupTestUsers()
  .then(stats => {
    console.log('\n✅ 清理完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 清理失败:', error);
    process.exit(1);
  });
