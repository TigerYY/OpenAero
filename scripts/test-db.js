const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function main() {
  console.log('🔍 测试数据库连接...\n');
  
  try {
    // 测试连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功\n');
    
    // 测试查询 solutions
    console.log('📝 测试查询 solutions 表...');
    const solutions = await prisma.solution.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        created_at: true
      }
    });
    
    console.log(`✅ 查询成功，找到 ${solutions.length} 条记录`);
    if (solutions.length > 0) {
      console.log('\n示例数据:');
      console.log(JSON.stringify(solutions[0], null, 2));
    } else {
      console.log('\n⚠️  数据库为空，没有solution记录');
    }
    
    // 测试查询 user_profiles
    console.log('\n📝 测试查询 user_profiles 表...');
    const profiles = await prisma.userProfile.findMany({
      take: 5,
      select: {
        id: true,
        user_id: true,
        display_name: true,
        created_at: true
      }
    });
    
    console.log(`✅ 查询成功，找到 ${profiles.length} 条profile记录\n`);
    
    console.log('✅ 所有测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
