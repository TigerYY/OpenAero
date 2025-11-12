require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function simpleTest() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ 数据库连接修复完成 - 简单验证');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    await prisma.$connect();
    console.log('✅ Prisma连接成功!\n');
    
    // 查询用户数
    const userCount = await prisma.user.count();
    console.log(`👥 用户总数: ${userCount}`);
    
    // 查询简单用户信息
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        take: 3,
        select: {
          id: true,
          email: true,
          emailVerified: true
        }
      });
      
      console.log('\n示例用户:');
      users.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.email} ${u.emailVerified ? '✅' : '⚠️'}`);
      });
    }
    
    // 查询会话
    const sessionCount = await prisma.session.count();
    console.log(`\n🔐 会话数: ${sessionCount}`);
    
    // 查询账户
    const accountCount = await prisma.account.count();
    console.log(`🔗 账户数: ${accountCount}`);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  🎉 数据库连接问题已完全修复!');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('✅ 修复内容:');
    console.log('   1. 更新了正确的Supabase区域: us-east-2');
    console.log('   2. 使用新的数据库密码: 4gPPhKf90F6ayAka');
    console.log('   3. 更新了.env.local配置');
    console.log('   4. 重新生成了Prisma Client');
    console.log('   5. 验证了业务数据查询正常\n');
    
    console.log('📊 当前数据:');
    console.log(`   用户: ${userCount}`);
    console.log(`   会话: ${sessionCount}`);
    console.log(`   账户: ${accountCount}\n`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

simpleTest();
