/**
 * 邮件模板配置脚本
 * 用于配置Supabase的邮件模板
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadEmailTemplates() {
  const templatePath = path.join(process.cwd(), 'supabase/email-templates.json');
  
  if (!fs.existsSync(templatePath)) {
    log('❌ 邮件模板文件不存在: ' + templatePath, 'red');
    return null;
  }
  
  try {
    const content = fs.readFileSync(templatePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log('❌ 读取邮件模板文件失败: ' + error.message, 'red');
    return null;
  }
}

function generateSupabaseEmailSQL(templates) {
  let sql = `-- Supabase邮件模板配置\n-- 请在Supabase Dashboard > SQL Editor中执行\n\n`;
  
  Object.entries(templates).forEach(([type, config]) => {
    const escapedTemplate = config.template.replace(/'/g, "''");
    const escapedSubject = config.subject.replace(/'/g, "''");
    
    sql += `-- 更新${type}邮件模板\n`;
    sql += `UPDATE auth.config\n`;
    sql += `SET ${type}_subject = '${escapedSubject}',\n`;
    sql += `    ${type}_template = '${escapedTemplate}'\n`;
    sql += `WHERE id = 1;\n\n`;
  });
  
  // 添加SMTP配置示例
  sql += `-- SMTP配置示例（根据实际情况修改）\n`;
  sql += `UPDATE auth.config\n`;
  sql += `SET smtp_host = 'smtp.gmail.com',\n`;
  sql += `    smtp_port = 587,\n`;
  sql += `    smtp_user = 'your-email@gmail.com',\n`;
  sql += `    smtp_pass = 'your-app-password',\n`;
  sql += `    smtp_sender_name = 'OpenAero',\n`;
  sql += `    smtp_sender_email = 'noreply@openaero.com'\n`;
  sql += `WHERE id = 1;\n\n`;
  
  sql += `-- 完成配置\n`;
  sql += `SELECT 'Email templates configured successfully' as status;\n`;
  
  return sql;
}

function displayEmailTemplates(templates) {
  log('\n📧 邮件模板预览', 'blue');
  log('================================', 'blue');
  
  Object.entries(templates).forEach(([type, config]) => {
    log(`\n📋 ${type.toUpperCase()} 模板`, 'cyan');
    log(`   主题: ${config.subject}`, 'white');
    log(`   变量: [${config.variables.join(', ')}]`, 'yellow');
    
    // 显示模板预览（截取前100个字符）
    const preview = config.template.replace(/<[^>]*>/g, '').substring(0, 100) + '...';
    log(`   预览: ${preview}`, 'white');
  });
}

function generateTestEmails() {
  log('\n📄 生成测试邮件...', 'blue');
  
  const testDir = path.join(process.cwd(), 'test-emails');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }
  
  // 生成测试邮件HTML文件
  const testEmails = {
    'confirmation-test.html': {
      title: '邮箱验证测试',
      type: 'confirmation',
      testData: {
        confirmation_url: 'http://localhost:3000/auth/confirm?token=test-token',
        user_email: 'test@example.com'
      }
    },
    'recovery-test.html': {
      title: '密码重置测试',
      type: 'recovery',
      testData: {
        recovery_url: 'http://localhost:3000/auth/reset?token=test-token',
        user_email: 'test@example.com'
      }
    },
    'invitation-test.html': {
      title: '邀请邮件测试',
      type: 'invitation',
      testData: {
        confirmation_url: 'http://localhost:3000/auth/accept-invite?token=test-token',
        user_email: 'test@example.com',
        inviter_name: 'John Doe',
        timestamp: new Date().toLocaleString('zh-CN'),
        team_name: 'AeroDesign Team'
      }
    }
  };
  
  const templates = loadEmailTemplates();
  if (!templates) return;
  
  Object.entries(testEmails).forEach(([filename, config]) => {
    const template = templates[config.type];
    if (!template) return;
    
    let html = template.template;
    
    // 替换变量
    Object.entries(config.testData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
    });
    
    // 添加测试页面结构
    const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-info { background: #f0f8ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .email-content { border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
        iframe { width: 100%; height: 600px; border: none; }
    </style>
</head>
<body>
    <div class="test-info">
        <h2>📧 ${config.title}</h2>
        <p><strong>模板类型:</strong> ${config.type}</p>
        <p><strong>测试数据:</strong></p>
        <ul>
            ${Object.entries(config.testData).map(([key, value]) => `<li>${key}: ${value}</li>`).join('')}
        </ul>
        <p><em>下方是邮件预览效果：</em></p>
    </div>
    <div class="email-content">
        ${html}
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(testDir, filename), fullHtml);
    log(`✅ 生成测试邮件: ${filename}`, 'green');
  });
  
  log(`\n📁 测试邮件目录: ${testDir}`, 'cyan');
  log('可以在浏览器中打开HTML文件查看邮件效果', 'white');
}

function checkSMTPConfiguration() {
  log('\n🔧 SMTP配置检查', 'blue');
  log('================================', 'blue');
  
  const requiredEnvVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_SENDER_EMAIL',
    'SMTP_SENDER_NAME'
  ];
  
  const envPath = path.join(process.cwd(), '.env.local');
  let allConfigured = true;
  
  if (!fs.existsSync(envPath)) {
    log('❌ .env.local 文件不存在', 'red');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  requiredEnvVars.forEach(varName => {
    const match = envContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
    const value = match ? match[1].trim() : '';
    
    if (value) {
      log(`✅ ${varName}: ${value.includes('password') || value.includes('secret') ? '已配置' : value}`, 'green');
    } else {
      log(`❌ ${varName}: 未配置`, 'red');
      allConfigured = false;
    }
  });
  
  return allConfigured;
}

function generateSMTPGuide() {
  log('\n📖 SMTP配置指南', 'blue');
  log('================================', 'blue');
  
  log('\n🔗 常用SMTP服务商配置:', 'cyan');
  
  const providers = {
    'Gmail': {
      host: 'smtp.gmail.com',
      port: 587,
      notes: '需要启用两步验证并使用应用密码'
    },
    'Outlook': {
      host: 'smtp-mail.outlook.com',
      port: 587,
      notes: '使用Microsoft账户密码'
    },
    'SendGrid': {
      host: 'smtp.sendgrid.net',
      port: 587,
      notes: '需要SendGrid API密钥'
    },
    'Amazon SES': {
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      notes: '需要AWS SES凭证'
    }
  };
  
  Object.entries(providers).forEach(([name, config]) => {
    log(`\n📧 ${name}:`, 'white');
    log(`   Host: ${config.host}`, 'yellow');
    log(`   Port: ${config.port}`, 'yellow');
    log(`   注意: ${config.notes}`, 'cyan');
  });
  
  log('\n📋 环境变量配置示例:', 'cyan');
  log(`# SMTP配置`, 'white');
  log(`SMTP_HOST=smtp.gmail.com`, 'yellow');
  log(`SMTP_PORT=587`, 'yellow');
  log(`SMTP_USER=your-email@gmail.com`, 'yellow');
  log(`SMTP_PASS=your-app-password`, 'yellow');
  log(`SMTP_SENDER_EMAIL=noreply@openaero.com`, 'yellow');
  log(`SMTP_SENDER_NAME=OpenAero`, 'yellow');
  
  log('\n🔧 Gmail应用密码设置步骤:', 'cyan');
  log('1. 登录Google账户设置', 'white');
  log('2. 启用两步验证', 'white');
  log('3. 进入"应用密码"页面', 'white');
  log('4. 生成新的应用密码', 'white');
  log('5. 使用生成的16位密码作为SMTP_PASS', 'white');
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  log('📧 邮件模板配置工具', 'magenta');
  log('================================', 'magenta');
  
  const templates = loadEmailTemplates();
  if (!templates) return;
  
  if (args.length === 0) {
    // 显示默认信息
    displayEmailTemplates(templates);
    
    log('\n📋 可用命令:', 'cyan');
    log('  --preview                  预览邮件模板', 'white');
    log('  --generate-sql             生成Supabase配置SQL', 'white');
    log('  --generate-test            生成测试邮件', 'white');
    log('  --check-smtp               检查SMTP配置', 'white');
    log('  --smtp-guide               显示SMTP配置指南', 'white');
    return;
  }
  
  switch (args[0]) {
    case '--preview':
      displayEmailTemplates(templates);
      break;
      
    case '--generate-sql':
      const sql = generateSupabaseEmailSQL(templates);
      log('\n📝 Supabase邮件模板配置SQL:', 'blue');
      log('================================', 'blue');
      log(sql, 'white');
      
      log('\n💡 使用说明:', 'cyan');
      log('1. 复制上面的SQL代码', 'white');
      log('2. 在Supabase Dashboard > SQL Editor中粘贴并执行', 'white');
      log('3. 在Authentication > Settings中配置SMTP设置', 'white');
      break;
      
    case '--generate-test':
      generateTestEmails();
      break;
      
    case '--check-smtp':
      const smtpOk = checkSMTPConfiguration();
      if (!smtpOk) {
        log('\n💡 使用 --smtp-guide 查看配置指南', 'yellow');
      }
      break;
      
    case '--smtp-guide':
      generateSMTPGuide();
      break;
      
    default:
      log('❌ 未知命令: ' + args[0], 'red');
      log('使用 --help 查看可用命令', 'yellow');
  }
}

// 运行脚本
main();