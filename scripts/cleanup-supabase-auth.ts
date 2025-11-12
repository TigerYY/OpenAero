/**
 * 清理 Supabase Auth 中的所有测试用户
 * 只保留管理员账号
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
config({ path: resolve(__dirname, '../.env.local') });

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

async function cleanupSupabaseAuth() {
  console.log('🚀 开始清理 Supabase Auth 用户...\n');

  try {
    // 1. 获取所有用户
    console.log('📊 步骤 1: 获取所有 Supabase Auth 用户...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error(`❌ 获取用户失败: ${authError.message}`);
      return;
    }

    if (!authData || authData.users.length === 0) {
      console.log('✅ Supabase Auth 中没有用户');
      return;
    }

    console.log(`   总用户数: ${authData.users.length}\n`);

    // 2. 分类用户
    const adminUsers = authData.users.filter(user => ADMIN_EMAILS.includes(user.email || ''));
    const testUsers = authData.users.filter(user => !ADMIN_EMAILS.includes(user.email || ''));

    console.log('👤 用户分类:');
    console.log(`   管理员用户: ${adminUsers.length} 个`);
    adminUsers.forEach(user => {
      console.log(`     - ${user.email}`);
    });
    console.log(`\n   测试用户: ${testUsers.length} 个`);
    testUsers.forEach(user => {
      console.log(`     - ${user.email} (验证: ${user.email_confirmed_at ? '✓' : '✗'})`);
    });

    if (testUsers.length === 0) {
      console.log('\n✅ 没有需要清理的测试用户');
      return;
    }

    console.log('\n⚠️  即将删除以上测试用户，10秒后开始...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 3. 删除测试用户
    console.log('\n🗑️  步骤 2: 删除 Supabase Auth 用户...');
    
    let successCount = 0;
    let failCount = 0;

    for (const user of testUsers) {
      try {
        console.log(`   删除用户: ${user.email} (ID: ${user.id})`);

        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.log(`     ❌ 删除失败: ${deleteError.message}`);
          failCount++;
        } else {
          console.log(`     ✓ 删除成功`);
          successCount++;
        }

        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`     ❌ 删除出错: ${error.message}`);
        failCount++;
      }
    }

    // 4. 验证清理结果
    console.log('\n✅ 步骤 3: 验证清理结果...');
    const { data: verifyData, error: verifyError } = await supabase.auth.admin.listUsers();

    if (verifyError) {
      console.log(`   ❌ 验证失败: ${verifyError.message}`);
    } else {
      console.log(`   剩余用户数: ${verifyData ? verifyData.users.length : 0}`);
      if (verifyData && verifyData.users.length > 0) {
        verifyData.users.forEach(user => {
          console.log(`     - ${user.email} (验证: ${user.email_confirmed_at ? '✓' : '✗'})`);
        });
      }
    }

    // 5. 打印统计信息
    console.log('\n📈 清理统计:');
    console.log(`   原始用户数: ${authData.users.length}`);
    console.log(`   管理员用户: ${adminUsers.length}`);
    console.log(`   测试用户数: ${testUsers.length}`);
    console.log(`   成功删除: ${successCount}`);
    console.log(`   删除失败: ${failCount}`);
    console.log(`   剩余用户数: ${verifyData ? verifyData.users.length : 0}`);

    if (successCount === testUsers.length) {
      console.log('\n✅ 所有测试用户已成功清理！');
    } else {
      console.log(`\n⚠️  部分用户删除失败 (${testUsers.length - successCount} 个)`);
    }

  } catch (error: any) {
    console.error('\n❌ 清理过程出错:', error.message);
    throw error;
  }
}

// 执行清理
cleanupSupabaseAuth()
  .then(() => {
    console.log('\n✅ 清理完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 清理失败:', error);
    process.exit(1);
  });
