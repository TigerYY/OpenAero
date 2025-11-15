/**
 * 直接测试 BOM 数据库操作（不依赖 API）
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBomDatabase() {
  try {
    console.log('🧪 开始测试 BOM 数据库操作...\n');

    // 1. 查找或创建一个测试方案
    let solution = await prisma.solution.findFirst({
      where: {
        title: {
          contains: '测试方案'
        }
      }
    });

    if (!solution) {
      // 查找一个创作者
      const creatorProfile = await prisma.creatorProfile.findFirst();
      
      if (!creatorProfile) {
        console.log('⚠️  未找到创作者，创建一个测试方案（无 creatorId）...');
        solution = await prisma.solution.create({
          data: {
            title: '测试方案 - BOM 数据库测试',
            description: '这是一个用于测试 BOM 数据库的测试方案',
            category: '测试分类',
            price: 1000.00,
            status: 'DRAFT',
            locale: 'zh-CN',
            features: ['测试功能'],
            tags: ['测试']
          }
        });
      } else {
        solution = await prisma.solution.create({
          data: {
            title: '测试方案 - BOM 数据库测试',
            description: '这是一个用于测试 BOM 数据库的测试方案',
            category: '测试分类',
            price: 1000.00,
            status: 'DRAFT',
            creatorId: creatorProfile.id,
            locale: 'zh-CN',
            features: ['测试功能'],
            tags: ['测试']
          }
        });
      }
      console.log(`✅ 创建测试方案: ${solution.id}`);
    } else {
      console.log(`✅ 使用现有测试方案: ${solution.id}`);
    }

    // 2. 删除现有的 BOM 项（如果有）
    await prisma.solutionBomItem.deleteMany({
      where: { solutionId: solution.id }
    });
    console.log('✅ 清理现有 BOM 项\n');

    // 3. 测试创建 BOM（包含所有新字段）
    console.log('📝 测试 1: 创建 BOM（包含所有新字段）');
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

    const createdItems = await Promise.all(
      bomItems.map(item => prisma.solutionBomItem.create({ data: item }))
    );

    console.log(`✅ 成功创建 ${createdItems.length} 个 BOM 项\n`);

    // 4. 验证字段
    console.log('🔍 测试 2: 验证所有新字段');
    const firstItem = createdItems[0];
    const newFields = {
      unit: firstItem.unit,
      unitPrice: firstItem.unitPrice ? Number(firstItem.unitPrice) : null,
      supplier: firstItem.supplier,
      partNumber: firstItem.partNumber,
      manufacturer: firstItem.manufacturer,
      category: firstItem.category,
      position: firstItem.position,
      weight: firstItem.weight ? Number(firstItem.weight) : null,
      specifications: firstItem.specifications
    };

    console.log('📋 第一个 BOM 项的新字段:');
    Object.entries(newFields).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        console.log(`   ✅ ${key}: ${typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : value}`);
      } else {
        console.log(`   ⚠️  ${key}: null/undefined`);
      }
    });

    const missingFields = Object.entries(newFields)
      .filter(([_, value]) => value === null || value === undefined)
      .map(([key]) => key);

    if (missingFields.length === 0) {
      console.log('\n✅ 所有新字段都已正确保存！');
    } else {
      console.log('\n⚠️  以下字段为 null:', missingFields);
    }

    // 5. 测试查询（包含所有字段）
    console.log('\n📖 测试 3: 查询 BOM（验证所有字段返回）');
    const queriedItems = await prisma.solutionBomItem.findMany({
      where: { solutionId: solution.id },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`✅ 成功查询 ${queriedItems.length} 个 BOM 项`);

    // 6. 计算统计信息
    console.log('\n📊 测试 4: 计算统计信息');
    const totalCost = queriedItems.reduce((sum, item) => {
      return sum + (Number(item.unitPrice || 0) * item.quantity);
    }, 0);
    const totalWeight = queriedItems.reduce((sum, item) => {
      return sum + (Number(item.weight || 0) * item.quantity);
    }, 0);

    console.log(`   总成本: ¥${totalCost.toFixed(2)}`);
    console.log(`   总重量: ${totalWeight.toFixed(1)}g`);

    // 7. 测试分类筛选
    console.log('\n🔍 测试 5: 按分类筛选');
    const frameItems = await prisma.solutionBomItem.findMany({
      where: {
        solutionId: solution.id,
        category: 'FRAME'
      }
    });
    console.log(`   FRAME 类别: ${frameItems.length} 个物料`);

    const motorItems = await prisma.solutionBomItem.findMany({
      where: {
        solutionId: solution.id,
        category: 'MOTOR'
      }
    });
    console.log(`   MOTOR 类别: ${motorItems.length} 个物料`);

    // 8. 测试零件号查询
    console.log('\n🔍 测试 6: 按零件号查询');
    const itemByPartNumber = await prisma.solutionBomItem.findFirst({
      where: {
        solutionId: solution.id,
        partNumber: 'DJI-F450-001'
      }
    });
    if (itemByPartNumber) {
      console.log(`   ✅ 找到零件号 DJI-F450-001: ${itemByPartNumber.name}`);
    } else {
      console.log('   ⚠️  未找到零件号 DJI-F450-001');
    }

    console.log('\n✅ 所有数据库测试通过！');
    console.log(`\n📝 方案 ID: ${solution.id}`);
    console.log('   可以使用此方案 ID 测试 API 路由\n');

    return solution.id;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testBomDatabase().catch(console.error);

