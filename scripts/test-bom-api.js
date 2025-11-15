/**
 * 测试 BOM API 路由
 * 测试创建和获取 BOM 清单（包含所有新字段）
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// 测试数据（方案 B - 完整增强）
const testBomItems = [
  {
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

async function testBomApi(solutionId, authToken) {
  console.log('🧪 开始测试 BOM API...\n');

  // 测试 1: 创建 BOM（PUT）
  console.log('📝 测试 1: 创建 BOM（包含所有新字段）');
  try {
    const createResponse = await fetch(`${BASE_URL}/api/solutions/${solutionId}/bom`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authToken ? `sb-access-token=${authToken}` : ''
      },
      credentials: 'include',
      body: JSON.stringify({ items: testBomItems })
    });

    const createData = await createResponse.json();
    
    if (createResponse.ok && createData.success) {
      console.log('✅ 创建 BOM 成功');
      console.log(`   创建了 ${createData.data.items.length} 个 BOM 项\n`);
      
      // 验证返回的字段
      const firstItem = createData.data.items[0];
      const requiredFields = [
        'id', 'name', 'model', 'quantity', 'unit', 'unitPrice',
        'supplier', 'partNumber', 'manufacturer', 'category',
        'position', 'weight', 'specifications'
      ];
      
      const missingFields = requiredFields.filter(field => !(field in firstItem));
      if (missingFields.length === 0) {
        console.log('✅ 所有新字段都已返回');
        console.log(`   示例: ${firstItem.name} - ${firstItem.category} - ¥${firstItem.unitPrice}\n`);
      } else {
        console.log('⚠️  缺失字段:', missingFields);
      }
    } else {
      console.log('❌ 创建 BOM 失败:', createData.error || createResponse.statusText);
      console.log('   响应:', JSON.stringify(createData, null, 2));
      return;
    }
  } catch (error) {
    console.error('❌ 创建 BOM 错误:', error.message);
    return;
  }

  // 测试 2: 获取 BOM（GET）
  console.log('📖 测试 2: 获取 BOM（验证所有字段）');
  try {
    const getResponse = await fetch(`${BASE_URL}/api/solutions/${solutionId}/bom`, {
      headers: {
        'Cookie': authToken ? `sb-access-token=${authToken}` : ''
      },
      credentials: 'include'
    });

    const getData = await getResponse.json();
    
    if (getResponse.ok && getData.success) {
      console.log('✅ 获取 BOM 成功');
      console.log(`   获取了 ${getData.data.items.length} 个 BOM 项\n`);
      
      // 验证所有字段
      const firstItem = getData.data.items[0];
      console.log('📋 第一个 BOM 项的完整字段:');
      console.log(`   - 基础信息: ${firstItem.name} (${firstItem.model}) x${firstItem.quantity} ${firstItem.unit || '个'}`);
      console.log(`   - 价格: ¥${firstItem.unitPrice || 'N/A'}`);
      console.log(`   - 供应商: ${firstItem.supplier || 'N/A'}`);
      console.log(`   - 零件号: ${firstItem.partNumber || 'N/A'}`);
      console.log(`   - 制造商: ${firstItem.manufacturer || 'N/A'}`);
      console.log(`   - 类别: ${firstItem.category || 'N/A'}`);
      console.log(`   - 位置: ${firstItem.position || 'N/A'}`);
      console.log(`   - 重量: ${firstItem.weight ? firstItem.weight + 'g' : 'N/A'}`);
      console.log(`   - 规格: ${firstItem.specifications ? JSON.stringify(firstItem.specifications).substring(0, 50) + '...' : 'N/A'}`);
      
      // 验证所有新字段都存在
      const newFields = ['unit', 'unitPrice', 'supplier', 'partNumber', 'manufacturer', 'category', 'position', 'weight', 'specifications'];
      const existingFields = Object.keys(firstItem);
      const missingFields = newFields.filter(f => !existingFields.includes(f));
      
      if (missingFields.length === 0) {
        console.log('\n✅ 所有新字段都已正确返回！');
      } else {
        console.log('\n⚠️  缺失字段:', missingFields);
      }
    } else {
      console.log('❌ 获取 BOM 失败:', getData.error || getResponse.statusText);
    }
  } catch (error) {
    console.error('❌ 获取 BOM 错误:', error.message);
  }

  console.log('\n✅ BOM API 测试完成！');
}

// 主函数
async function main() {
  const solutionId = process.argv[2];
  const authToken = process.argv[3];

  if (!solutionId) {
    console.error('❌ 错误: 请提供方案 ID');
    console.error('   用法: node scripts/test-bom-api.js <solutionId> [authToken]');
    console.error('   示例: node scripts/test-bom-api.js sol_123456789');
    process.exit(1);
  }

  await testBomApi(solutionId, authToken);
}

main().catch(console.error);

