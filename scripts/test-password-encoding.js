#!/usr/bin/env node

/**
 * 测试密码URL编码
 */

// 测试不同的密码和编码方式
const passwords = [
  'Apollo202%1419',
  'Apollo2021419',  // 假设%是输入错误
];

console.log('密码URL编码测试:\n');

passwords.forEach(pwd => {
  const encoded = encodeURIComponent(pwd);
  console.log(`原始密码: ${pwd}`);
  console.log(`URL编码:  ${encoded}`);
  console.log(`解码回去: ${decodeURIComponent(encoded)}`);
  console.log('---');
});

console.log('\n建议检查Supabase Dashboard中的实际数据库密码。');
console.log('路径: Project Settings > Database > Connection string\n');
