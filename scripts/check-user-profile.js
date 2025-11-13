/**
 * 检查用户 profile 是否存在
 * 用于诊断 profile 加载问题
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

async function checkUserProfile(userId) {
  console.log(`\n=== 检查用户 Profile ===`);
  console.log(`用户ID: ${userId}\n`);

  // 1. 检查 auth.users
  console.log('1. 检查 auth.users...');
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError) {
    console.error('❌ 无法获取 auth.users:', authError.message);
    return;
  }
  if (!authUser.user) {
    console.error('❌ 用户不存在于 auth.users');
    return;
  }
  console.log('✅ 用户存在于 auth.users');
  console.log(`   - Email: ${authUser.user.email}`);
  console.log(`   - Phone: ${authUser.user.phone || '未设置'}`);
  console.log(`   - Email 已验证: ${authUser.user.email_confirmed_at ? '是' : '否'}`);

  // 2. 检查 user_profiles
  console.log('\n2. 检查 user_profiles...');
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError) {
    console.error('❌ 无法获取 user_profiles:', profileError.message);
    console.log(`   错误代码: ${profileError.code}`);
    
    if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
      console.log('\n⚠️  Profile 不存在，尝试创建...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([
          {
            user_id: userId,
            role: 'USER',
            status: 'ACTIVE',
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error('❌ 创建 profile 失败:', createError.message);
        console.log(`   错误代码: ${createError.code}`);
        console.log('\n可能的原因:');
        console.log('  1. RLS 策略阻止了插入');
        console.log('  2. 数据库触发器配置问题');
        console.log('  3. 权限不足');
      } else {
        console.log('✅ Profile 创建成功!');
        console.log('   新 Profile:', newProfile);
      }
    }
  } else if (profile) {
    console.log('✅ Profile 存在');
    console.log(`   - ID: ${profile.id}`);
    console.log(`   - 角色: ${profile.role}`);
    console.log(`   - 状态: ${profile.status}`);
    console.log(`   - 显示名称: ${profile.display_name || '未设置'}`);
  }

  // 3. 检查 RLS 策略
  console.log('\n3. 检查 RLS 策略...');
  console.log('   提示: 请在 Supabase Dashboard > Authentication > Policies 中检查');
  console.log('   user_profiles 表的 RLS 策略应该允许:');
  console.log('   - SELECT: 用户只能查询自己的 profile');
  console.log('   - INSERT: 允许创建自己的 profile');
  console.log('   - UPDATE: 用户只能更新自己的 profile');
}

// 主函数
async function main() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.log('用法: node scripts/check-user-profile.js <user_id>');
    console.log('\n示例:');
    console.log('  node scripts/check-user-profile.js 123e4567-e89b-12d3-a456-426614174000');
    console.log('\n提示:');
    console.log('  1. 从浏览器控制台获取 user.id');
    console.log('  2. 或从 Supabase Dashboard > Authentication > Users 获取');
    process.exit(1);
  }

  await checkUserProfile(userId);
}

main().catch(console.error);

