/**
 * 更新产品图片路径为 SVG 格式
 */

import { resolve } from 'path';

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

const products = [
  'f20-a-overseas',
  'f20-a-domestic',
  'f20-b-overseas',
  'f20-b-domestic',
  'f30-a-overseas',
  'f30-a-domestic',
  'f30-b-overseas',
  'f30-b-domestic',
];

async function updateProductImages() {
  console.log('开始更新产品图片路径...\n');

  for (const slug of products) {
    const images = [`/images/products/${slug}-1.svg`, `/images/products/${slug}-2.svg`];

    const result = await prisma.product.updateMany({
      where: { slug },
      data: { images },
    });

    if (result.count > 0) {
      console.log(`✅ 已更新: ${slug}`);
    } else {
      console.log(`⚠️  未找到: ${slug}`);
    }
  }

  console.log('\n✅ 更新完成！');
}

updateProductImages()
  .catch(error => {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
