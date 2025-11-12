const { PrismaClient } = require('@prisma/client');

// 使用Session模式连接
const sessionUrl = 'postgresql://postgres.cardynuoazvaytvinxvm:4gPPhKf90F6ayAka@aws-1-us-east-2.pooler.supabase.com:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: sessionUrl
    }
  }
});

async function testSessionMode() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🧪 测试Session Pooling模式');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    await prisma.$connect();
    console.log('✅ 连接成功 (Session模式, 端口5432)\n');
    
    const userCount = await prisma.user.count();
    console.log(`👥 用户总数: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        take: 3,
        select: { id: true, email: true }
      });
      
      console.log('\n示例用户:');
      users.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.email}`);
      });
    }
    
    const sessionCount = await prisma.session.count();
    const accountCount = await prisma.account.count();
    
    console.log(`\n🔐 会话数: ${sessionCount}`);
    console.log(`🔗 账户数: ${accountCount}`);
    
    console.log('\n✅ Session模式工作正常!');
    console.log('   建议使用Session模式(端口5432)作为主要连接\n');
    
  } catch (error) {
    console.error('❌ Session模式错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSessionMode();
