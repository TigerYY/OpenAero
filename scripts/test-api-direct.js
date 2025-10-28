const { PrismaClient } = require('@prisma/client');

// 模拟API路由逻辑
async function testApiLogic() {
  const prisma = new PrismaClient();
  
  try {
    console.log('开始测试API逻辑...');

    // 模拟请求参数
    const limit = 3;
    const page = 1;
    const status = 'PUBLISHED';

    // 构建查询条件
    const where = {};
    if (status) {
      where.status = status;
    }

    console.log('查询条件:', where);

    // 获取总数
    const total = await prisma.solution.count({ where });
    console.log('总数:', total);

    // 获取方案列表
    const solutions = await prisma.solution.findMany({
      where,
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
      skip: (page - 1) * limit,
      take: limit
    });

    console.log('查询到的解决方案数量:', solutions.length);

    const totalPages = Math.ceil(total / limit);

    // 格式化响应数据
    const formattedSolutions = solutions.map(solution => ({
      id: solution.id,
      title: solution.title,
      description: solution.description,
      category: solution.category,
      status: solution.status,
      price: solution.price,
      version: solution.version,
      tags: solution.features || [],
      images: solution.images || [],
      createdAt: solution.createdAt,
      updatedAt: solution.updatedAt,
      creatorId: solution.creatorId,
      creatorName: solution.user?.firstName && solution.user?.lastName 
                    ? `${solution.user.firstName} ${solution.user.lastName}` 
                    : 'Unknown',
      reviewCount: solution._count.reviews,
      downloadCount: 0,
      specs: solution.specs || {},
      bom: solution.bom || []
    }));

    const response = {
      success: true,
      data: {
        solutions: formattedSolutions,
        total,
        page,
        limit,
        totalPages
      }
    };

    console.log('API响应:', JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('API逻辑测试失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  } finally {
    await prisma.$disconnect();
  }
}

testApiLogic();