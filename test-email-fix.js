// 测试邮件修复效果
const testEmailFix = async () => {
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@openaero.cn`;
  
  console.log('测试邮件修复效果...');
  console.log('测试邮箱:', testEmail);
  
  try {
    const response = await fetch('http://localhost:3000/api/test-email-fix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ 测试成功!');
      console.log('响应:', result);
    } else {
      console.log('❌ 测试失败!');
      console.log('错误:', result);
      
      if (result.error?.includes('rate limit')) {
        console.log('\n💡 建议:');
        console.log('1. 等待几分钟后重试');
        console.log('2. 使用不同的邮箱地址');
        console.log('3. 检查 Supabase 项目设置');
      }
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
};

// 运行测试
testEmailFix();