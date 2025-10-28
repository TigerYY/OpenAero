const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSolutions() {
  try {
    console.log('开始测试solutions查询...');

    // 测试基本查询
    const solutions = await prisma.solution.findMany({
      where: {
        status: 'PUBLISHED'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    console.log('查询成功！找到', solutions.length, '个解决方案');
    
    solutions.forEach((solution, index) => {
      console.log(`\n解决方案 ${index + 1}:`);
      console.log('- ID:', solution.id);
      console.log('- 标题:', solution.title);
      console.log('- 状态:', solution.status);
      console.log('- 价格:', solution.price);
      console.log('- 创作者:', solution.user?.firstName, solution.user?.lastName);
      console.log('- 评论数:', solution._count.reviews);
    });

    // 测试总数查询
    const total = await prisma.solution.count({
      where: {
        status: 'PUBLISHED'
      }
    });
    console.log('\n总共有', total, '个已发布的解决方案');

  } catch (error) {
    console.error('查询失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  } finally {
    await prisma.$disconnect();
  }
}

testSolutions();