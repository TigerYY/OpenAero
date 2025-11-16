#!/usr/bin/env node

/**
 * 直接测试Solutions数据库查询
 * 绕过API，直接使用Prisma查询
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testDirectQuery() {
  console.log('🔍 直接测试Solutions表查询...\n');
  
  try {
    // 测试1: 简单查询
    console.log('📝 测试1: 基本查询 (select *)');
    const solutions = await prisma.solution.findMany({
      take: 5,
    });
    console.log(`✅ 查询成功，找到 ${solutions.length} 条记录\n`);
    
    // 测试2: 带关联查询
    console.log('📝 测试2: 带creator关联查询');
    try {
      const solutionsWithCreator = await prisma.solution.findMany({
        take: 5,
        include: {
          creator: true,
        },
      });
      console.log(`✅ 关联查询成功，找到 ${solutionsWithCreator.length} 条记录\n`);
    } catch (error) {
      console.log(`⚠️  关联查询失败: ${error.message}\n`);
    }
    
    // 测试3: 带user关联查询
    console.log('📝 测试3: 带user关联查询');
    try {
      const solutionsWithUser = await prisma.solution.findMany({
        take: 5,
        include: {
          user: true,
        },
      });
      console.log(`✅ User关联查询成功，找到 ${solutionsWithUser.length} 条记录\n`);
    } catch (error) {
      console.log(`⚠️  User关联查询失败: ${error.message}\n`);
    }
    
    // 测试4: 按状态筛选
    console.log('📝 测试4: 按状态筛选');
    const publishedSolutions = await prisma.solution.findMany({
      where: {
        status: 'PUBLISHED',
      },
      take: 5,
    });
    console.log(`✅ 状态筛选成功，找到 ${publishedSolutions.length} 条PUBLISHED记录\n`);
    
    // 测试5: 按分类筛选
    console.log('📝 测试5: 按分类筛选');
    const categorySolutions = await prisma.solution.findMany({
      where: {
        category: 'electronics',
      },
      take: 5,
    });
    console.log(`✅ 分类筛选成功，找到 ${categorySolutions.length} 条electronics记录\n`);
    
    // 测试6: 计数查询
    console.log('📝 测试6: 统计总数');
    const count = await prisma.solution.count();
    console.log(`✅ 计数查询成功，总共 ${count} 条记录\n`);
    
    // 测试7: 检查字段是否存在
    if (solutions.length > 0) {
      console.log('📝 测试7: 检查返回字段');
      const firstSolution = solutions[0];
      const fields = Object.keys(firstSolution);
      console.log('✅ 返回字段:', fields.join(', '));
      
      // 检查关键字段
      const requiredFields = ['id', 'title', 'category', 'status', 'created_at', 'updated_at'];
      const missingFields = requiredFields.filter(f => !fields.includes(f));
      
      if (missingFields.length > 0) {
        console.log(`⚠️  缺少字段: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ 所有必需字段都存在');
      }
    }
    
    console.log('\n✅ 所有直接查询测试通过！');
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectQuery();
