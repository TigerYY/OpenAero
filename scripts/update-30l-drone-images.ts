/**
 * 更新所有30L型号植保无人机产品的图片
 * 将30L型号的植保无人机产品图片设置为指定的图片
 */

import { resolve } from 'path';

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

/**
 * 更新所有30L型号植保无人机产品的图片
 * @param imagePath 图片路径或URL
 */
async function update30LDroneImages(imagePath: string) {
  console.log('🚀 开始更新30L型号植保无人机产品图片...\n');
  console.log(`📷 图片路径: ${imagePath}\n`);

  try {
    // 1. 查找植保无人机分类
    const category = await prisma.productCategory.findFirst({
      where: {
        slug: 'plant-protection-drone',
      },
    });

    if (!category) {
      console.error('❌ 未找到"植保无人机"分类！');
      console.log('   请确保分类 slug 为 "plant-protection-drone"');
      return;
    }

    console.log(`✅ 找到分类: ${category.name} (ID: ${category.id})\n`);

    // 2. 查找所有30L型号的植保无人机产品
    // 30L产品的slug包含 "f30" 或名称包含 "30L"
    const products = await prisma.product.findMany({
      where: {
        category_id: category.id,
        is_active: true,
        OR: [
          { slug: { contains: 'f30', mode: 'insensitive' } },
          { name: { contains: '30L', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        dimensions: true,
      },
    });

    if (products.length === 0) {
      console.log('⚠️  未找到任何30L型号的植保无人机产品');
      return;
    }

    console.log(`📦 找到 ${products.length} 个30L型号的植保无人机产品\n`);

    // 3. 更新每个产品的图片
    let updatedCount = 0;
    for (const product of products) {
      // 使用指定的图片作为产品的第一张图片
      const images = [imagePath];

      await prisma.product.update({
        where: { id: product.id },
        data: { images },
      });

      console.log(`✅ 已更新: ${product.name} (${product.slug})`);
      updatedCount++;
    }

    console.log(`\n✨ 更新完成！共更新 ${updatedCount} 个30L型号产品的图片`);
    console.log('\n💡 提示：');
    console.log('   - 如果使用本地图片，请确保图片已放置在 public/images/products/ 目录');
    console.log(
      '   - 如果页面仍显示旧图片，请清除浏览器缓存并硬刷新（Cmd+Shift+R 或 Ctrl+Shift+R）'
    );
  } catch (error) {
    console.error('❌ 更新失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 从命令行参数获取图片路径
const imagePath = process.argv[2];

if (!imagePath) {
  console.error('❌ 请提供图片路径！');
  console.log('   用法: npx tsx scripts/update-30l-drone-images.ts <图片路径>');
  console.log(
    '   示例: npx tsx scripts/update-30l-drone-images.ts "/images/products/植保无人机30L.png"'
  );
  process.exit(1);
}

// 运行更新
update30LDroneImages(imagePath).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
