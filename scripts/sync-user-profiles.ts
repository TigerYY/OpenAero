/**
 * 同步用户资料脚本
 * 为 auth.users 中所有没有 user_profiles 记录的用户创建记录
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const prisma = new PrismaClient();

async function syncUserProfiles() {
  try {
    console.log('🔄 开始同步用户资料...\n');

    // 创建 Supabase Admin 客户端
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. 获取所有 auth.users
    console.log('📋 获取所有 auth.users...');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      throw new Error(`获取 auth.users 失败: ${authError.message}`);
    }

    if (!authUsers?.users || authUsers.users.length === 0) {
      console.log('⚠️  auth.users 中没有用户');
      return;
    }

    console.log(`✅ 找到 ${authUsers.users.length} 个 auth.users\n`);

    // 2. 获取所有现有的 user_profiles
    console.log('📋 获取所有现有的 user_profiles...');
    const existingProfiles = await prisma.userProfile.findMany({
      select: { user_id: true },
    });
    const existingUserIds = new Set(existingProfiles.map(p => p.user_id));
    console.log(`✅ 找到 ${existingProfiles.length} 个现有的 user_profiles\n`);

    // 3. 找出需要创建 profile 的用户
    const usersToSync = authUsers.users.filter(
      authUser => !existingUserIds.has(authUser.id)
    );

    if (usersToSync.length === 0) {
      console.log('✅ 所有用户都已经有 user_profiles 记录，无需同步');
      return;
    }

    console.log(`📝 需要为 ${usersToSync.length} 个用户创建 user_profiles 记录\n`);

    // 4. 批量创建 user_profiles
    let successCount = 0;
    let errorCount = 0;

    for (const authUser of usersToSync) {
      try {
        // 检查用户邮箱是否已验证
        const emailVerified = !!authUser.email_confirmed_at;
        
        // 创建 user_profiles 记录
        await prisma.userProfile.create({
          data: {
            user_id: authUser.id,
            role: 'USER', // 默认角色
            status: emailVerified ? 'ACTIVE' : 'INACTIVE', // 如果邮箱已验证，状态为 ACTIVE
            created_at: new Date(authUser.created_at),
            updated_at: new Date(authUser.updated_at || authUser.created_at),
          },
        });

        successCount++;
        console.log(`  ✅ 已为用户创建 profile: ${authUser.email} (${authUser.id})`);
      } catch (error: any) {
        errorCount++;
        console.error(`  ❌ 创建用户 profile 失败: ${authUser.email} (${authUser.id})`);
        console.error(`     错误: ${error.message}`);
      }
    }

    console.log('\n📊 同步结果:');
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ❌ 失败: ${errorCount}`);
    console.log(`  📝 总计: ${usersToSync.length}`);

    if (successCount > 0) {
      console.log('\n✅ 用户资料同步完成！');
    } else {
      console.log('\n⚠️  没有成功同步任何用户资料');
    }
  } catch (error: any) {
    console.error('\n❌ 同步失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行同步
syncUserProfiles();

