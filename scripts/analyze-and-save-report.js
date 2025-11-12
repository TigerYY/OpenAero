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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function analyzeAndSaveReport() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('❌ 获取用户列表失败:', error);
    return;
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let report = `# Supabase Auth 用户分析报告\n\n`;
  report += `生成时间: ${now.toLocaleString('zh-CN')}\n`;
  report += `总用户数: ${users.length}\n\n`;
  report += `${'='.repeat(80)}\n\n`;

  // 所有用户详情
  report += `## 所有用户详情\n\n`;
  
  const mustKeep = [];
  const canDelete = [];

  users.forEach((user, index) => {
    const createdAt = new Date(user.created_at);
    const isRecent = createdAt > sevenDaysAgo;
    const isTestAccount = 
      user.email?.includes('test') ||
      user.email?.includes('demo') ||
      user.email?.includes('example') ||
      user.email?.includes('+');
    
    const isAdmin = user.email?.includes('admin');
    const isVerified = !!user.email_confirmed_at;

    report += `### ${index + 1}. ${user.email || '无邮箱'}\n\n`;
    report += `- **ID**: \`${user.id}\`\n`;
    report += `- **验证状态**: ${isVerified ? '✅ 已验证' : '❌ 未验证'}\n`;
    report += `- **创建时间**: ${createdAt.toLocaleString('zh-CN')} ${isRecent ? '🆕 近7天' : '📅 旧账号'}\n`;
    report += `- **最后登录**: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '从未登录'}\n`;
    report += `- **角色**: ${user.user_metadata?.role || user.app_metadata?.role || 'USER'}\n`;
    report += `- **提供商**: ${user.app_metadata?.provider || 'email'}\n`;
    
    if (isTestAccount) {
      report += `- **标记**: 🧪 疑似测试账号\n`;
    }
    if (isAdmin) {
      report += `- **标记**: 👨‍💼 管理员账号\n`;
    }

    // 判断是否必须保留
    const shouldKeep = (isVerified && !isTestAccount) || isAdmin;
    const canDeleteAccount = !isVerified && !isRecent && !isAdmin;

    if (shouldKeep) {
      report += `- **建议**: ✅ **必须保留**\n`;
      mustKeep.push({ email: user.email, id: user.id, reason: isAdmin ? '管理员账号' : '已验证的生产账号' });
    } else if (canDeleteAccount) {
      report += `- **建议**: 🗑️ **可以删除** (未验证且超过7天)\n`;
      canDelete.push({ email: user.email, id: user.id, createdAt: createdAt.toLocaleDateString('zh-CN') });
    } else {
      report += `- **建议**: ⏳ 观察中 (${isRecent ? '新账号' : '待确认'})\n`;
    }

    report += `\n`;
  });

  // 统计信息
  const verified = users.filter(u => u.email_confirmed_at).length;
  const unverified = users.filter(u => !u.email_confirmed_at).length;
  const testAccounts = users.filter(u => 
    u.email?.includes('test') || u.email?.includes('demo') || u.email?.includes('example') || u.email?.includes('+')
  ).length;
  const recentAccounts = users.filter(u => new Date(u.created_at) > sevenDaysAgo).length;

  report += `\n${'='.repeat(80)}\n\n`;
  report += `## 📊 统计摘要\n\n`;
  report += `| 分类 | 数量 |\n`;
  report += `|------|------|\n`;
  report += `| ✅ 已验证邮箱 | ${verified} |\n`;
  report += `| ❌ 未验证邮箱 | ${unverified} |\n`;
  report += `| 🧪 疑似测试账号 | ${testAccounts} |\n`;
  report += `| 🆕 近7天创建 | ${recentAccounts} |\n`;
  report += `| 📅 7天前创建 | ${users.length - recentAccounts} |\n\n`;

  // 必须保留的账号
  report += `\n${'='.repeat(80)}\n\n`;
  report += `## ✅ 必须保留的账号 (${mustKeep.length}个)\n\n`;
  
  if (mustKeep.length === 0) {
    report += `⚠️ 没有找到必须保留的账号\n\n`;
  } else {
    mustKeep.forEach((u, i) => {
      report += `${i + 1}. **${u.email}**\n`;
      report += `   - 原因: ${u.reason}\n`;
      report += `   - ID: \`${u.id}\`\n\n`;
    });
  }

  // 可以删除的账号
  report += `\n${'='.repeat(80)}\n\n`;
  report += `## 🗑️ 建议删除的账号 (${canDelete.length}个)\n\n`;
  report += `这些账号未验证邮箱且创建时间超过7天，可以安全删除：\n\n`;
  
  if (canDelete.length === 0) {
    report += `✅ 没有需要清理的账号\n\n`;
  } else {
    canDelete.forEach((u, i) => {
      report += `${i + 1}. **${u.email}**\n`;
      report += `   - 创建于: ${u.createdAt}\n`;
      report += `   - ID: \`${u.id}\`\n\n`;
    });

    report += `\n### 执行清理\n\n`;
    report += `已生成删除脚本: \`scripts/delete-suggested-users.js\`\n\n`;
    report += `执行命令:\n\`\`\`bash\n`;
    report += `node scripts/delete-suggested-users.js\n`;
    report += `\`\`\`\n\n`;
    report += `⚠️ **警告**: 执行前请仔细检查要删除的账号！\n\n`;
  }

  // 保存报告
  const reportPath = path.join(__dirname, '..', 'SUPABASE_USERS_ANALYSIS.md');
  fs.writeFileSync(reportPath, report);
  
  console.log('✅ 报告已生成: SUPABASE_USERS_ANALYSIS.md');
  console.log(`\n📊 摘要:`);
  console.log(`   总用户数: ${users.length}`);
  console.log(`   必须保留: ${mustKeep.length}`);
  console.log(`   建议删除: ${canDelete.length}`);
  console.log(`   观察中: ${users.length - mustKeep.length - canDelete.length}`);
}

analyzeAndSaveReport();
