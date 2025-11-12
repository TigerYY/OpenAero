require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function verifyBusinessData() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🔍 验证业务数据查询');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // 测试数据库连接
    console.log('⏳ 测试Prisma连接...\n');
    await prisma.$connect();
    console.log('✅ Prisma连接成功!\n');
    
    // 查询用户数据
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👥 用户数据查询:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const userCount = await prisma.user.count();
    console.log(`✅ 总用户数: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true
        }
      });
      
      console.log(`\n最近的 ${Math.min(5, userCount)} 个用户:`);
      users.forEach((user, i) => {
        console.log(`\n${i + 1}. ${user.email}`);
        console.log(`   姓名: ${user.name || '(未设置)'}`);
        console.log(`   验证状态: ${user.emailVerified ? '✅ 已验证' : '⚠️  未验证'}`);
        console.log(`   创建时间: ${user.createdAt.toLocaleString('zh-CN')}`);
      });
    }
    
    // 查询会话数据
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 会话数据查询:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const sessionCount = await prisma.session.count();
    console.log(`✅ 活跃会话数: ${sessionCount}`);
    
    // 查询账户关联
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 账户关联查询:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const accountCount = await prisma.account.count();
    console.log(`✅ OAuth账户数: ${accountCount}`);
    
    if (accountCount > 0) {
      const accounts = await prisma.account.findMany({
        take: 3,
        select: {
          provider: true,
          providerAccountId: true,
          user: {
            select: { email: true }
          }
        }
      });
      
      console.log('\n示例账户:');
      accounts.forEach((acc, i) => {
        console.log(`${i + 1}. ${acc.provider} - ${acc.user.email}`);
      });
    }
    
    // 查询验证令牌
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎫 验证令牌查询:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const tokenCount = await prisma.verificationToken.count();
    console.log(`✅ 验证令牌数: ${tokenCount}`);
    
    // 测试复杂查询
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 复杂查询测试:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (userCount > 0) {
      const usersWithAccounts = await prisma.user.findMany({
        take: 3,
        include: {
          accounts: {
            select: { provider: true }
          },
          sessions: {
            select: { expires: true }
          }
        }
      });
      
      console.log('✅ 关联查询成功');
      console.log(`   查询了 ${usersWithAccounts.length} 个用户及其账户和会话`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ 所有业务数据查询正常!');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 数据统计摘要:');
    console.log(`   用户总数: ${userCount}`);
    console.log(`   活跃会话: ${sessionCount}`);
    console.log(`   OAuth账户: ${accountCount}`);
    console.log(`   验证令牌: ${tokenCount}`);
    
    console.log('\n🎉 数据库连接问题已完全修复!');
    console.log('   可以正常使用Prisma进行业务数据操作。\n');
    
  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    console.error('\n详细错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBusinessData();
