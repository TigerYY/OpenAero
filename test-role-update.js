#!/usr/bin/env node

// 测试用户角色更新API的脚本
// 注意：这个脚本需要有效的认证会话才能工作

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'test-user-id'; // 替换为实际的用户ID

async function testRoleUpdate() {
  console.log('🧪 测试用户角色更新API...\n');

  try {
    // 1. 首先获取用户列表（需要先登录）
    console.log('1. 获取用户列表...');
    const usersResponse = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.ADMIN_COOKIE || '' // 需要提供有效的cookie
      }
    });

    if (!usersResponse.ok) {
      console.log('❌ 获取用户列表失败:', usersResponse.status, usersResponse.statusText);
      const errorText = await usersResponse.text();
      console.log('错误详情:', errorText);
      return;
    }

    const usersData = await usersResponse.json();
    console.log('✅ 用户列表获取成功');
    console.log(`找到 ${usersData.data?.items?.length || 0} 个用户`);

    if (!usersData.data?.items?.length) {
      console.log('⚠️ 没有找到用户，无法测试角色更新');
      return;
    }

    const testUser = usersData.data.items[0];
    console.log(`\n选择测试用户: ${testUser.email} (ID: ${testUser.id})`);
    console.log(`当前角色: ${JSON.stringify(testUser.roles || testUser.role)}`);

    // 2. 测试角色更新
    console.log('\n2. 测试角色更新...');
    const newRoles = ['USER', 'CREATOR'];
    
    const updateResponse = await fetch(`${BASE_URL}/api/admin/users/${testUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.ADMIN_COOKIE || ''
      },
      body: JSON.stringify({ 
        roles: newRoles,
        reason: 'API测试'
      })
    });

    console.log(`响应状态: ${updateResponse.status} ${updateResponse.statusText}`);

    if (!updateResponse.ok) {
      console.log('❌ 角色更新失败');
      const errorText = await updateResponse.text();
      console.log('错误详情:', errorText);
      
      // 尝试解析错误
      try {
        const errorData = JSON.parse(errorText);
        console.log('结构化错误:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.log('无法解析错误响应');
      }
      return;
    }

    const updateData = await updateResponse.json();
    console.log('✅ 角色更新成功');
    console.log('响应数据:', JSON.stringify(updateData, null, 2));

    // 3. 验证更新结果
    console.log('\n3. 验证更新结果...');
    const verifyResponse = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.ADMIN_COOKIE || ''
      }
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      const updatedUser = verifyData.data.items.find(u => u.id === testUser.id);
      
      if (updatedUser) {
        console.log(`✅ 用户角色已更新: ${JSON.stringify(updatedUser.roles || updatedUser.role)}`);
      } else {
        console.log('❌ 无法找到更新后的用户');
      }
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

console.log('📝 使用说明:');
console.log('1. 确保开发服务器运行在 http://localhost:3000');
console.log('2. 设置环境变量 ADMIN_COOKIE 为有效的管理员会话cookie');
console.log('3. 运行脚本: node test-role-update.js\n');

if (process.env.ADMIN_COOKIE) {
  testRoleUpdate();
} else {
  console.log('⚠️ 未设置 ADMIN_COOKIE 环境变量，跳过测试');
  console.log('请先登录管理员账户，然后从浏览器开发者工具复制cookie');
}