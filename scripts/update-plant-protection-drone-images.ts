/**
 * 更新所有植保无人机产品的图片
 * 将所有植保无人机产品的图片设置为同一张农业无人机喷洒图片
 */

import { resolve } from 'path';

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

// 默认图片路径 - 可以根据实际情况修改
// 支持本地路径（如：/images/products/agricultural-drone-spraying.jpg）或远程URL
// 如果您有图片文件，请将其放在 public/images/products/ 目录，然后使用相对路径
// 如果使用远程URL，可以直接使用完整的HTTP/HTTPS URL

// 使用一个展示农业植保无人机喷洒农作物的图片URL
// 这是一个示例URL，您可以替换为您自己的图片URL或本地路径
const DEFAULT_IMAGE_PATH =
  'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1200&q=80&auto=format&fit=crop';

// 如果您想使用本地图片文件，请取消下面的注释并修改路径：
// const DEFAULT_IMAGE_PATH = '/images/products/agricultural-drone-spraying.jpg';

/**
 * 更新所有植保无人机产品的图片
 * @param imagePath 图片路径或URL，默认使用 DEFAULT_IMAGE_PATH
 */
async function updatePlantProtectionDroneImages(imagePath?: string) {
  const imageUrl = imagePath || DEFAULT_IMAGE_PATH;

  console.log('🚀 开始更新植保无人机产品图片...\n');
  console.log(`📷 图片路径: ${imageUrl}\n`);

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

    // 2. 查找所有植保无人机产品
    const products = await prisma.product.findMany({
      where: {
        category_id: category.id,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (products.length === 0) {
      console.log('⚠️  未找到任何植保无人机产品');
      return;
    }

    console.log(`📦 找到 ${products.length} 个植保无人机产品\n`);

    // 3. 更新每个产品的图片
    let updatedCount = 0;
    for (const product of products) {
      // 使用同一张图片作为所有产品的第一张图片
      // 如果需要多张图片，可以使用数组：[imageUrl, imageUrl2, ...]
      const images = [imageUrl];

      await prisma.product.update({
        where: { id: product.id },
        data: { images },
      });

      console.log(`✅ 已更新: ${product.name} (${product.slug})`);
      updatedCount++;
    }

    console.log(`\n✨ 更新完成！共更新 ${updatedCount} 个产品的图片`);
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

// 从命令行参数获取图片路径（如果提供）
const imagePath = process.argv[2];

// 运行更新
updatePlantProtectionDroneImages(imagePath).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
