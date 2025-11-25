/**
 * 验证30L型号植保无人机产品图片是否正确更新
 */

import { resolve } from 'path';

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function verify30LImages() {
  try {
    const category = await prisma.productCategory.findFirst({
      where: { slug: 'plant-protection-drone' },
    });

    if (!category) {
      console.log('❌ 未找到分类');
      return;
    }

    // 查找所有30L型号的产品
    const products = await prisma.product.findMany({
      where: {
        category_id: category.id,
        OR: [
          { slug: { contains: 'f30', mode: 'insensitive' } },
          { name: { contains: '30L', mode: 'insensitive' } },
        ],
      },
      select: { name: true, slug: true, images: true },
    });

    console.log(`\n📊 验证结果：共 ${products.length} 个30L型号产品\n`);

    const targetImage = '/images/products/植保无人机30L.png';
    let successCount = 0;

    products.forEach(p => {
      const hasImage = p.images && p.images.length > 0 && p.images[0] === targetImage;
      if (hasImage) successCount++;
      console.log(`${hasImage ? '✅' : '❌'} ${p.name}`);
      console.log(`   图片: ${p.images[0] || '无图片'}\n`);
    });

    console.log(`\n✨ 验证完成：${successCount}/${products.length} 个30L型号产品已更新为正确图片`);
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify30LImages();
