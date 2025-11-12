const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 读取 .env.local 文件
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

let supabaseUrl = '';
let supabaseServiceKey = '';

envLines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = trimmed.split('=')[1].replace(/['"]/g, '');
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.split('=')[1].replace(/['"]/g, '');
  }
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase环境变量');
  console.error('URL:', supabaseUrl ? '✅' : '❌');
  console.error('Service Key:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function analyzeUsers() {
  console.log('\n📊 Supabase Auth 用户分析\n');
  console.log('='.repeat(80));

  try {
    // 获取所有用户
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ 获取用户列表失败:', error);
      return;
    }

    console.log(`\n总用户数: ${users.length}\n`);

    // 分类用户
    const categories = {
      admin: [],
      verified: [],
      unverified: [],
      testAccounts: [],
      recentlyCreated: [],
      oldAccounts: []
    };

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    users.forEach((user, index) => {
      const createdAt = new Date(user.created_at);
      const isRecent = createdAt > sevenDaysAgo;
      
      // 检测测试账号（常见模式）
      const isTestAccount = 
        user.email?.includes('test') ||
        user.email?.includes('demo') ||
        user.email?.includes('example') ||
        user.email?.includes('+') || // Gmail的+别名
        user.email?.match(/^\d+@/); // 数字开头的邮箱

      const userInfo = {
        index: index + 1,
        id: user.id,
        email: user.email,
        emailVerified: user.email_confirmed_at ? '✅ 已验证' : '❌ 未验证',
        createdAt: createdAt.toLocaleString('zh-CN'),
        lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '从未登录',
        role: user.user_metadata?.role || user.app_metadata?.role || 'USER',
        provider: user.app_metadata?.provider || 'email',
        isRecent: isRecent ? '🆕 近7天' : '📅 旧账号'
      };

      // 分类
      if (user.email?.includes('admin')) {
        categories.admin.push(userInfo);
      }
      
      if (user.email_confirmed_at) {
        categories.verified.push(userInfo);
      } else {
        categories.unverified.push(userInfo);
      }

      if (isTestAccount) {
        categories.testAccounts.push(userInfo);
      }

      if (isRecent) {
        categories.recentlyCreated.push(userInfo);
      } else {
        categories.oldAccounts.push(userInfo);
      }
    });

    // 打印详细信息
    console.log('\n📋 所有用户详情:\n');
    users.forEach((user, index) => {
      const createdAt = new Date(user.created_at);
      const isRecent = createdAt > sevenDaysAgo;
      
      console.log(`${index + 1}. ${user.email || '无邮箱'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   验证状态: ${user.email_confirmed_at ? '✅ 已验证' : '❌ 未验证'}`);
      console.log(`   创建时间: ${createdAt.toLocaleString('zh-CN')} ${isRecent ? '🆕' : '📅'}`);
      console.log(`   最后登录: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '从未登录'}`);
      console.log(`   角色: ${user.user_metadata?.role || user.app_metadata?.role || 'USER'}`);
      console.log(`   提供商: ${user.app_metadata?.provider || 'email'}`);
      
      // 检测是否为测试账号
      const isTestAccount = 
        user.email?.includes('test') ||
        user.email?.includes('demo') ||
        user.email?.includes('example') ||
        user.email?.includes('+') ||
        user.email?.match(/^\d+@/);
      
      if (isTestAccount) {
        console.log(`   🧪 疑似测试账号`);
      }
      
      console.log('');
    });

    // 打印分类统计
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 分类统计:\n');
    console.log(`✅ 已验证邮箱: ${categories.verified.length} 个`);
    console.log(`❌ 未验证邮箱: ${categories.unverified.length} 个`);
    console.log(`👨‍💼 管理员账号: ${categories.admin.length} 个`);
    console.log(`🧪 疑似测试账号: ${categories.testAccounts.length} 个`);
    console.log(`🆕 近7天创建: ${categories.recentlyCreated.length} 个`);
    console.log(`📅 7天前创建: ${categories.oldAccounts.length} 个`);

    // 建议清理的账号
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 清理建议:\n');

    // 未验证且超过7天的账号
    const unverifiedOld = users.filter(u => {
      const createdAt = new Date(u.created_at);
      return !u.email_confirmed_at && createdAt < sevenDaysAgo;
    });

    console.log('🗑️  可以安全删除的账号 (未验证且超过7天):\n');
    if (unverifiedOld.length === 0) {
      console.log('   ✅ 没有需要清理的账号');
    } else {
      unverifiedOld.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email || '无邮箱'} (创建于 ${new Date(user.created_at).toLocaleDateString('zh-CN')})`);
        console.log(`      ID: ${user.id}`);
      });
    }

    // 测试账号（已验证的除外）
    const testAccountsUnverified = users.filter(u => {
      const isTest = 
        u.email?.includes('test') ||
        u.email?.includes('demo') ||
        u.email?.includes('example') ||
        u.email?.includes('+');
      return isTest && !u.email_confirmed_at;
    });

    console.log('\n🧪 测试账号 (未验证):\n');
    if (testAccountsUnverified.length === 0) {
      console.log('   ✅ 没有未验证的测试账号');
    } else {
      testAccountsUnverified.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email || '无邮箱'}`);
        console.log(`      ID: ${user.id}`);
      });
    }

    // 必须保留的账号
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 必须保留的账号:\n');

    const mustKeep = users.filter(u => {
      return (
        u.email_confirmed_at && // 已验证
        !u.email?.includes('test') && // 非测试账号
        !u.email?.includes('example') // 非示例账号
      ) || 
      u.email?.includes('admin'); // 或是管理员
    });

    if (mustKeep.length === 0) {
      console.log('   ⚠️  没有找到必须保留的账号');
    } else {
      mustKeep.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email || '无邮箱'}`);
        console.log(`      验证: ${user.email_confirmed_at ? '✅' : '❌'}`);
        console.log(`      角色: ${user.user_metadata?.role || user.app_metadata?.role || 'USER'}`);
        console.log(`      最后登录: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '从未登录'}`);
        console.log('');
      });
    }

    // 生成清理脚本
    if (unverifiedOld.length > 0 || testAccountsUnverified.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('\n📝 生成清理脚本...\n');
      
      const deleteIds = [...new Set([
        ...unverifiedOld.map(u => u.id),
        ...testAccountsUnverified.map(u => u.id)
      ])];

      console.log('可以使用以下命令删除这些账号:\n');
      console.log('node scripts/delete-users.js ' + deleteIds.join(' '));
      
      // 创建删除脚本
      const deleteScript = `// 自动生成的用户删除脚本
// 生成时间: ${new Date().toLocaleString('zh-CN')}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const usersToDelete = ${JSON.stringify(deleteIds, null, 2)};

async function deleteUsers() {
  console.log('准备删除 ' + usersToDelete.length + ' 个用户...');
  
  for (const userId of usersToDelete) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        console.error('❌ 删除失败:', userId, error);
      } else {
        console.log('✅ 已删除:', userId);
      }
    } catch (err) {
      console.error('❌ 错误:', err);
    }
  }
  
  console.log('\\n清理完成！');
}

deleteUsers();
`;

      require('fs').writeFileSync(
        require('path').join(__dirname, 'delete-suggested-users.js'),
        deleteScript
      );
      
      console.log('\n✅ 已生成删除脚本: scripts/delete-suggested-users.js');
      console.log('⚠️  执行前请仔细检查要删除的账号！');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 分析完成！\n');

  } catch (error) {
    console.error('❌ 分析失败:', error);
  }
}

analyzeUsers();
