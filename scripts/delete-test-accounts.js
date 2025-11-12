const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// 创建命令行交互
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// 定义清理方案
const cleanupPlans = {
  conservative: {
    name: '方案A: 保守清理 (推荐)',
    description: '删除所有明确的测试账号，保留可能的真实用户',
    emailPatterns: [
      '@example.com',
      'testuser@',
    ],
    count: 8
  },
  thorough: {
    name: '方案B: 彻底清理',
    description: '删除所有测试和未验证账号，只保留管理员',
    emailPatterns: [
      '@example.com',
      'testuser@',
      'test1@',
      'test2@',
      'testuser1@',
      'testuser2@',
      'testuser3@',
      'demo@',
      'user@openaero.cn' // 未验证
    ],
    count: 14
  },
  exampleOnly: {
    name: '方案C: 只删除 example.com',
    description: '只删除明确的测试域名账号',
    emailPatterns: [
      '@example.com'
    ],
    count: 7
  }
};

async function deleteUsersByPattern(patterns, dryRun = true) {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('❌ 获取用户列表失败:', error);
    return;
  }

  // 筛选要删除的用户
  const usersToDelete = users.filter(user => {
    return patterns.some(pattern => user.email?.includes(pattern));
  });

  console.log(`\n找到 ${usersToDelete.length} 个匹配的账号:\n`);
  usersToDelete.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   验证: ${user.email_confirmed_at ? '✅' : '❌'}`);
    console.log(`   创建: ${new Date(user.created_at).toLocaleDateString('zh-CN')}`);
    console.log('');
  });

  if (dryRun) {
    console.log('🔍 这是预览模式，不会实际删除账号。');
    console.log('如需执行删除，请使用: node scripts/delete-test-accounts.js --execute\n');
    return usersToDelete;
  }

  // 确认删除
  const confirm = await question(`\n⚠️  确定要删除这 ${usersToDelete.length} 个账号吗? (输入 YES 确认): `);
  
  if (confirm.trim() !== 'YES') {
    console.log('\n❌ 取消删除操作');
    return [];
  }

  // 执行删除
  console.log('\n开始删除账号...\n');
  const deletedUsers = [];
  const failedUsers = [];

  for (const user of usersToDelete) {
    try {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error(`❌ 删除失败: ${user.email}`, deleteError.message);
        failedUsers.push({ email: user.email, error: deleteError.message });
      } else {
        console.log(`✅ 已删除: ${user.email}`);
        deletedUsers.push(user.email);
      }
    } catch (err) {
      console.error(`❌ 错误: ${user.email}`, err.message);
      failedUsers.push({ email: user.email, error: err.message });
    }
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 删除总结:\n');
  console.log(`✅ 成功删除: ${deletedUsers.length} 个`);
  console.log(`❌ 删除失败: ${failedUsers.length} 个`);
  
  if (failedUsers.length > 0) {
    console.log('\n失败的账号:');
    failedUsers.forEach(u => {
      console.log(`   - ${u.email}: ${u.error}`);
    });
  }

  console.log('\n清理完成！\n');
  return deletedUsers;
}

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');
  const planArg = args.find(arg => arg.startsWith('--plan='));
  const planName = planArg ? planArg.split('=')[1] : null;

  console.log('\n' + '='.repeat(60));
  console.log('🧹 Supabase 测试账号清理工具');
  console.log('='.repeat(60) + '\n');

  if (!executeMode) {
    console.log('📋 可用的清理方案:\n');
    Object.entries(cleanupPlans).forEach(([key, plan]) => {
      console.log(`${key}:`);
      console.log(`  ${plan.name}`);
      console.log(`  ${plan.description}`);
      console.log(`  将删除约 ${plan.count} 个账号\n`);
    });

    console.log('使用方法:');
    console.log('  预览: node scripts/delete-test-accounts.js --plan=<方案名>');
    console.log('  执行: node scripts/delete-test-accounts.js --plan=<方案名> --execute\n');
    console.log('方案名: conservative (推荐) | thorough | exampleOnly\n');

    if (!planName) {
      console.log('⚠️  请指定一个清理方案');
      rl.close();
      return;
    }
  }

  const selectedPlan = cleanupPlans[planName || 'conservative'];
  
  if (!selectedPlan) {
    console.log('❌ 无效的方案名，请使用: conservative, thorough, 或 exampleOnly');
    rl.close();
    return;
  }

  console.log(`📌 选择的方案: ${selectedPlan.name}`);
  console.log(`📝 描述: ${selectedPlan.description}\n`);

  await deleteUsersByPattern(selectedPlan.emailPatterns, !executeMode);
  
  rl.close();
}

main();
