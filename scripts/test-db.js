#!/usr/bin/env node

/**
 * 数据库连接测试脚本
 * 用于测试数据库连接和基本功能
 */

const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 测试数据库连接...');
    
    // 测试基本连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
    
    // 测试查询
    const userCount = await prisma.user.count();
    const solutionCount = await prisma.solution.count();
    const categoryCount = await prisma.category.count();
    
    console.log('📊 数据库统计:');
    console.log(`   - 用户数量: ${userCount}`);
    console.log(`   - 解决方案数量: ${solutionCount}`);
    console.log(`   - 分类数量: ${categoryCount}`);
    
    // 测试复杂查询
    const solutionsWithDetails = await prisma.solution.findMany({
      include: {
        category: true,
        creator: {
          include: {
            user: true,
          },
        },
        reviews: true,
      },
      take: 3,
    });
    
    console.log('🔍 示例数据查询成功:');
    solutionsWithDetails.forEach((solution, index) => {
      console.log(`   ${index + 1}. ${solution.title} - ${solution.category?.name} - ¥${solution.price}`);
    });
    
    console.log('✅ 数据库测试完成，所有功能正常！');
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error.message);
    
    if (error.code === 'P1001') {
      console.log('💡 提示: 请确保数据库服务器正在运行');
    } else if (error.code === 'P1003') {
      console.log('💡 提示: 请检查数据库URL配置');
    } else if (error.code === 'P1017') {
      console.log('💡 提示: 请先运行数据库迁移: npm run db:push');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
