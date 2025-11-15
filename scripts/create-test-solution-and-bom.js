/**
 * 创建测试方案和 BOM，用于 API 测试
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestSolution() {
  try {
    console.log('📋 创建测试方案和 BOM...\n');

    // 1. 查找一个创作者（或使用第一个用户）
    const creatorProfile = await prisma.creatorProfile.findFirst({
      include: {
        userProfile: true
      }
    });

    if (!creatorProfile) {
      console.error('❌ 错误: 未找到已审核通过的创作者');
      console.error('   请先创建一个创作者账户并审核通过');
      process.exit(1);
    }

    console.log(`✅ 找到创作者: ${creatorProfile.userProfile?.display_name || creatorProfile.userProfile?.first_name || 'Unknown'}`);

    // 2. 创建测试方案
    const solution = await prisma.solution.create({
      data: {
        title: '测试方案 - BOM API 测试',
        description: '这是一个用于测试 BOM API 的测试方案',
        summary: '测试方案摘要',
        category: '测试分类',
        price: 1000.00,
        status: 'DRAFT',
        creatorId: creatorProfile.id,
        locale: 'zh-CN',
        features: ['测试功能1', '测试功能2'],
        tags: ['测试', 'BOM'],
        images: []
      }
    });

    console.log(`✅ 创建测试方案成功: ${solution.id}`);
    console.log(`   标题: ${solution.title}\n`);

    // 3. 创建测试 BOM（包含所有新字段）
    const bomItems = [
      {
        solutionId: solution.id,
        name: 'DJI F450 机架',
        model: 'F450',
        quantity: 1,
        unit: '套',
        unitPrice: 89.00,
        supplier: 'DJI官方',
        partNumber: 'DJI-F450-001',
        manufacturer: 'DJI',
        category: 'FRAME',
        position: '主体',
        weight: 350.5,
        specifications: {
          material: '碳纤维',
          size: '450mm',
          maxPayload: '1000g'
        }
      },
      {
        solutionId: solution.id,
        name: '2212 无刷电机',
        model: '2212-920KV',
        quantity: 4,
        unit: '个',
        unitPrice: 25.50,
        supplier: '新西达',
        partNumber: 'XSD-2212-920',
        manufacturer: '新西达',
        category: 'MOTOR',
        position: '四轴',
        weight: 55.0,
        specifications: {
          kv: 920,
          maxCurrent: '18A',
          maxPower: '200W'
        }
      },
      {
        solutionId: solution.id,
        name: '30A 电调',
        model: 'ESC-30A',
        quantity: 4,
        unit: '个',
        unitPrice: 35.00,
        supplier: '好盈',
        partNumber: 'HOBBYWING-30A',
        manufacturer: '好盈',
        category: 'ESC',
        position: '四轴',
        weight: 25.0,
        specifications: {
          maxCurrent: '30A',
          voltage: '2-6S',
          bec: '5V/2A'
        }
      }
    ];

    const createdBomItems = await Promise.all(
      bomItems.map(item => prisma.solutionBomItem.create({ data: item }))
    );

    console.log(`✅ 创建测试 BOM 成功: ${createdBomItems.length} 个物料`);
    createdBomItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} (${item.category}) - ¥${item.unitPrice} x${item.quantity}`);
    });

    console.log('\n📊 测试数据统计:');
    const totalCost = createdBomItems.reduce((sum, item) => {
      return sum + (Number(item.unitPrice || 0) * item.quantity);
    }, 0);
    const totalWeight = createdBomItems.reduce((sum, item) => {
      return sum + (Number(item.weight || 0) * item.quantity);
    }, 0);
    console.log(`   总成本: ¥${totalCost.toFixed(2)}`);
    console.log(`   总重量: ${totalWeight.toFixed(1)}g`);

    console.log('\n✅ 测试方案和 BOM 创建完成！');
    console.log(`\n📝 方案 ID: ${solution.id}`);
    console.log('   可以使用以下命令测试 API:');
    console.log(`   node scripts/test-bom-api.js ${solution.id}\n`);

    return solution.id;
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error.message);
    if (error.code === 'P2002') {
      console.error('   错误: 唯一约束冲突，可能已存在相同的测试数据');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestSolution().catch(console.error);

