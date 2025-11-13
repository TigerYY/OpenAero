/**
 * 测试个人信息更新功能
 * 验证 API 端点的正确性
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testProfileUpdate() {
  console.log('=== 个人信息更新功能测试 ===\n');

  // 测试用例
  const testCases = [
    {
      name: '测试 schema 验证 - 无效的 phone 格式',
      data: {
        phone: 'invalid-phone',
      },
      expectedStatus: 400,
    },
    {
      name: '测试 schema 验证 - firstName 过长',
      data: {
        first_name: 'a'.repeat(51),
      },
      expectedStatus: 400,
    },
    {
      name: '测试 schema 验证 - bio 过长',
      data: {
        bio: 'a'.repeat(501),
      },
      expectedStatus: 400,
    },
    {
      name: '测试 schema 验证 - 无效的 avatar URL',
      data: {
        avatar: 'not-a-url',
      },
      expectedStatus: 400,
    },
    {
      name: '测试 schema 验证 - 有效的 phone 格式',
      data: {
        phone: '+86 138 0013 8000',
      },
      expectedStatus: 401, // 需要认证
    },
  ];

  console.log('注意: 这些测试需要有效的认证 token');
  console.log('请在浏览器中登录后，从开发者工具中获取 session token\n');

  for (const testCase of testCases) {
    console.log(`测试: ${testCase.name}`);
    console.log(`数据:`, JSON.stringify(testCase.data, null, 2));
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // 注意: 实际测试时需要添加 Authorization header
        },
        body: JSON.stringify(testCase.data),
      });

      const data = await response.json();
      
      console.log(`状态码: ${response.status}`);
      console.log(`响应:`, JSON.stringify(data, null, 2));
      
      if (response.status === testCase.expectedStatus) {
        console.log('✅ 测试通过\n');
      } else {
        console.log(`❌ 测试失败: 期望状态码 ${testCase.expectedStatus}, 实际 ${response.status}\n`);
      }
    } catch (error) {
      console.error('❌ 请求失败:', error.message);
      console.log('');
    }
  }

  console.log('\n=== 测试完成 ===');
  console.log('\n提示:');
  console.log('1. 确保开发服务器正在运行 (npm run dev)');
  console.log('2. 在浏览器中登录后，从 Network 标签页获取请求的 Authorization header');
  console.log('3. 将 token 添加到测试脚本中进行完整测试');
}

// 如果直接运行此脚本
if (require.main === module) {
  testProfileUpdate().catch(console.error);
}

module.exports = { testProfileUpdate };

