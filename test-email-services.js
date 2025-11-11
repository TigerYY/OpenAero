// 测试所有邮件服务配置
const testEmailServices = async () => {
  console.log('🔍 开始测试所有邮件服务配置...\n');

  const testEmail = `test${Date.now()}@openaero.cn`;

  const tests = [
    {
      name: '主要邮件服务连接测试',
      url: 'http://localhost:3000/api/admin/test-email',
      method: 'GET'
    },
    {
      name: '主要邮件服务发送测试',
      url: 'http://localhost:3000/api/admin/test-email',
      method: 'POST',
      body: {
        to: testEmail,
        subject: '邮件服务配置测试',
        type: 'verification'
      }
    },
    {
      name: '注册邮件测试',
      url: 'http://localhost:3000/api/test-email-fix',
      method: 'POST',
      body: {
        email: testEmail
      }
    },
    {
      name: '联系表单测试',
      url: 'http://localhost:3000/api/contact',
      method: 'POST',
      body: {
        name: '测试用户',
        email: testEmail,
        subject: '邮件服务配置测试',
        message: '这是一封测试邮件，用于验证联系表单的邮件发送功能是否正常工作。',
        company: 'OpenAero测试',
        phone: '13800138000'
      }
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`📧 测试: ${test.name}`);
    
    try {
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: test.body ? JSON.stringify(test.body) : undefined
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${test.name} - 成功`);
        console.log(`   响应:`, result);
        results.push({ name: test.name, status: 'success', result });
      } else {
        console.log(`❌ ${test.name} - 失败`);
        console.log(`   错误:`, result);
        results.push({ name: test.name, status: 'failed', error: result });
      }
    } catch (error) {
      console.log(`❌ ${test.name} - 异常`);
      console.log(`   异常:`, error.message);
      results.push({ name: test.name, status: 'error', error: error.message });
    }
    
    console.log(''); // 空行分隔
  }

  // 输出测试总结
  console.log('📊 测试总结:');
  console.log('='.repeat(50));
  
  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status !== 'success').length;
  
  console.log(`✅ 成功: ${successCount} 项`);
  console.log(`❌ 失败: ${failedCount} 项`);
  console.log(`📈 成功率: ${((successCount / results.length) * 100).toFixed(1)}%`);
  
  if (failedCount > 0) {
    console.log('\n❌ 失败的测试:');
    results.filter(r => r.status !== 'success').forEach(r => {
      console.log(`   - ${r.name}: ${r.error?.error || r.error}`);
    });
  }

  // 检查配置一致性
  console.log('\n🔧 配置检查:');
  console.log('='.repeat(50));
  
  const configChecks = [
    { name: 'SMTP_HOST', expected: 'smtp.exmail.qq.com' },
    { name: 'SMTP_PORT', expected: '465' },
    { name: 'SMTP_USER', expected: 'support@openaero.cn' },
    { name: 'SMTP_SENDER_EMAIL', expected: 'support@openaero.cn' },
    { name: 'SMTP_SECURE', expected: 'true' },
    { name: 'FEATURE_EMAIL_VERIFICATION', expected: 'true' }
  ];

  configChecks.forEach(check => {
    const value = process.env[check.name];
    const status = value === check.expected ? '✅' : '❌';
    console.log(`${status} ${check.name}: ${value} ${value !== check.expected ? `(期望: ${check.expected})` : ''}`);
  });

  console.log('\n🎉 测试完成！');
};

// 检查服务器是否运行
const checkServer = async () => {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch (error) {
    return false;
  }
};

// 主函数
const main = async () => {
  console.log('🚀 邮件服务全面测试工具\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ 服务器未运行，请先启动开发服务器: npm run dev');
    process.exit(1);
  }

  await testEmailServices();
};

// 运行测试
main().catch(console.error);