/**
 * 直接测试 BOM 表的新字段（不依赖其他表）
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBomFields() {
  try {
    console.log('🧪 开始测试 BOM 表新字段...\n');

    // 1. 检查表结构
    console.log('📋 检查 solution_bom_items 表结构...');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'solution_bom_items'
      ORDER BY column_name
    `;

    console.log(`   找到 ${columns.length} 个字段:\n`);
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // 2. 验证新字段是否存在
    console.log('\n🔍 验证新字段...');
    const newFields = ['unit', 'unitPrice', 'supplier', 'partNumber', 'manufacturer', 'category', 'position', 'weight', 'specifications'];
    const existingFields = columns.map(c => c.column_name);
    
    const missingFields = newFields.filter(f => !existingFields.includes(f));
    const existingNewFields = newFields.filter(f => existingFields.includes(f));

    if (missingFields.length === 0) {
      console.log('✅ 所有新字段都已存在！');
      existingNewFields.forEach(field => {
        const col = columns.find(c => c.column_name === field);
        console.log(`   ✅ ${field}: ${col.data_type}`);
      });
    } else {
      console.log('⚠️  以下字段缺失:', missingFields);
      if (existingNewFields.length > 0) {
        console.log('✅ 以下字段已存在:');
        existingNewFields.forEach(field => {
          const col = columns.find(c => c.column_name === field);
          console.log(`   ✅ ${field}: ${col.data_type}`);
        });
      }
    }

    // 3. 检查索引
    console.log('\n📊 检查索引...');
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'solution_bom_items'
      ORDER BY indexname
    `;

    console.log(`   找到 ${indexes.length} 个索引:\n`);
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

    const expectedIndexes = ['solution_bom_items_category_idx', 'solution_bom_items_partNumber_idx', 'solution_bom_items_manufacturer_idx'];
    const existingIndexes = indexes.map(i => i.indexname);
    const missingIndexes = expectedIndexes.filter(idx => !existingIndexes.some(ei => ei.toLowerCase() === idx.toLowerCase()));

    if (missingIndexes.length === 0) {
      console.log('\n✅ 所有预期索引都已创建！');
    } else {
      console.log('\n⚠️  以下索引缺失:', missingIndexes);
    }

    // 4. 测试插入数据（如果有 solutionId）
    console.log('\n📝 测试数据插入...');
    try {
      // 查找一个现有的 solutionId
      const solutionId = await prisma.$queryRaw`
        SELECT id FROM solutions LIMIT 1
      `.then(rows => rows[0]?.id);

      if (solutionId) {
        console.log(`   找到方案 ID: ${solutionId}`);
        
        // 尝试插入测试数据
        const testItem = await prisma.solutionBomItem.create({
          data: {
            solutionId: solutionId,
            name: '测试物料',
            quantity: 1,
            unit: '个',
            unitPrice: 100.00,
            supplier: '测试供应商',
            partNumber: 'TEST-001',
            manufacturer: '测试制造商',
            category: 'FRAME',
            position: '主体',
            weight: 500.0,
            specifications: {
              test: 'value'
            }
          }
        });

        console.log('✅ 成功插入测试数据！');
        console.log(`   ID: ${testItem.id}`);
        console.log(`   名称: ${testItem.name}`);
        console.log(`   类别: ${testItem.category}`);
        console.log(`   单价: ${testItem.unitPrice}`);
        console.log(`   供应商: ${testItem.supplier}`);
        console.log(`   零件号: ${testItem.partNumber}`);
        console.log(`   制造商: ${testItem.manufacturer}`);
        console.log(`   位置: ${testItem.position}`);
        console.log(`   重量: ${testItem.weight}g`);
        console.log(`   规格: ${JSON.stringify(testItem.specifications)}`);

        // 清理测试数据
        await prisma.solutionBomItem.delete({
          where: { id: testItem.id }
        });
        console.log('\n✅ 测试数据已清理');
      } else {
        console.log('   ⚠️  未找到方案，跳过数据插入测试');
      }
    } catch (error) {
      console.log(`   ⚠️  数据插入测试失败: ${error.message}`);
    }

    console.log('\n✅ BOM 字段测试完成！');
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

testBomFields().catch(console.error);

