/**
 * 验证 RLS 修复是否成功
 * 检查 user_profiles 表的策略是否正确配置
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('错误: 缺少 Supabase 环境变量');
  console.log('请设置:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyRLSFix() {
  console.log('\n=== 验证 RLS 修复 ===\n');

  try {
    // 1. 检查函数是否存在
    console.log('1. 检查 is_admin_user 函数...');
    const { data: functions, error: funcError } = await supabase.rpc('is_admin_user', {
      user_uuid: '00000000-0000-0000-0000-000000000000', // 测试 UUID
    });

    if (funcError && funcError.message.includes('function') && funcError.message.includes('does not exist')) {
      console.error('❌ 函数 is_admin_user 不存在');
      console.log('   请确保已执行修复 SQL');
    } else {
      console.log('✅ 函数 is_admin_user 存在');
    }

    // 2. 检查策略是否存在（使用 Service Role Key 绕过 RLS）
    console.log('\n2. 检查 RLS 策略...');
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', 'user_profiles');

    if (policyError) {
      console.warn('⚠️  无法查询策略（可能需要直接查询数据库）');
      console.log('   请在 Supabase Dashboard > Database > Policies 中手动检查');
    } else if (policies && policies.length > 0) {
      console.log(`✅ 找到 ${policies.length} 个策略:`);
      policies.forEach((policy) => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });

      // 检查是否有问题的策略
      const problematicPolicies = policies.filter((p) =>
        p.policyname.includes('Admins can manage all profiles') ||
        p.policyname.includes('管理员可以查看所有用户资料')
      );

      if (problematicPolicies.length > 0) {
        console.warn('\n⚠️  发现可能有问题的策略:');
        problematicPolicies.forEach((p) => {
          console.log(`   - ${p.policyname}`);
        });
        console.log('   请确保已删除这些策略并重新创建');
      } else {
        console.log('\n✅ 未发现问题的策略');
      }
    }

    // 3. 测试查询（使用 Service Role Key）
    console.log('\n3. 测试查询 user_profiles 表...');
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('id, user_id, role')
      .limit(1);

    if (testError) {
      console.error('❌ 查询失败:', testError.message);
      if (testError.message.includes('42P17') || testError.message.includes('infinite recursion')) {
        console.error('   ⚠️  仍然存在递归问题！');
        console.log('   请检查策略是否正确更新');
      }
    } else {
      console.log('✅ 查询成功（使用 Service Role Key）');
      console.log('   注意: 使用 Service Role Key 会绕过 RLS');
      console.log('   实际用户查询可能仍有问题');
    }

    console.log('\n=== 验证完成 ===');
    console.log('\n📋 下一步:');
    console.log('1. 刷新浏览器页面');
    console.log('2. 检查浏览器控制台是否有错误');
    console.log('3. 如果仍有问题，查看具体的错误信息');
  } catch (error) {
    console.error('验证过程出错:', error);
  }
}

verifyRLSFix().catch(console.error);

