/* eslint-disable no-console, no-hardcoded-routes */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

// 使用 Pexels 的真实无人机图片 URL
// 这些是从 Pexels 搜索到的真实无人机图片，不是人物照片
const pexelsDroneImages: Record<string, string[]> = {
  '农业植保无人机解决方案': [
    'https://images.pexels.com/photos/33949125/pexels-photo-33949125.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    'https://images.pexels.com/photos/33949126/pexels-photo-33949126.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
  ],
  '电力巡检无人机解决方案': [
    'https://images.pexels.com/photos/34476267/pexels-photo-34476267.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    'https://images.pexels.com/photos/13013366/pexels-photo-13013366.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
  ],
  '测绘与地理信息无人机解决方案': [
    'https://images.pexels.com/photos/33949127/pexels-photo-33949127.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    'https://images.pexels.com/photos/33751637/pexels-photo-33751637.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
  ],
  '影视航拍无人机解决方案': [
    'https://images.pexels.com/photos/13013366/pexels-photo-13013366.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    'https://images.pexels.com/photos/34476267/pexels-photo-34476267.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
  ],
  '应急救援无人机解决方案': [
    'https://images.pexels.com/photos/33751637/pexels-photo-33751637.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    'https://images.pexels.com/photos/33949125/pexels-photo-33949125.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
  ],
  '环境监测无人机解决方案': [
    'https://images.pexels.com/photos/33949126/pexels-photo-33949126.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    'https://images.pexels.com/photos/33949127/pexels-photo-33949127.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
  ],
  '交通监控无人机解决方案': [
    'https://images.pexels.com/photos/34476267/pexels-photo-34476267.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    'https://images.pexels.com/photos/13013366/pexels-photo-13013366.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
  ],
  '边境巡逻无人机解决方案': [
    'https://images.pexels.com/photos/2271587/pexels-photo-2271587.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    'https://images.pexels.com/photos/33751637/pexels-photo-33751637.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
  ],
  '物流配送无人机解决方案': [
    'https://images.pexels.com/photos/33949125/pexels-photo-33949125.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    'https://images.pexels.com/photos/33949126/pexels-photo-33949126.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
  ],
  '森林防火无人机解决方案': [
    'https://images.pexels.com/photos/33949127/pexels-photo-33949127.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    'https://images.pexels.com/photos/2271587/pexels-photo-2271587.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
  ]
};

async function updateImages() {
  try {
    console.log('开始使用 Pexels 的真实无人机图片更新数据库...\n');

    for (const [title, images] of Object.entries(pexelsDroneImages)) {
      const solution = await prisma.solution.findFirst({
        where: { title }
      });

      if (solution) {
        await prisma.solution.update({
          where: { id: solution.id },
          data: { images }
        });
        console.log(`✓ 更新方案: ${title}`);
        console.log(`  图片URL: ${images[0].substring(0, 100)}...`);
      } else {
        console.log(`✗ 未找到方案: ${title}`);
      }
    }

    console.log('\n✅ 图片更新完成！');
    console.log('⚠️  请清除浏览器缓存后刷新页面查看新图片：');
    console.log('   1. 硬刷新：Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows)');
    console.log('   2. 清除浏览器缓存');
    console.log('   3. 在开发者工具的Network标签页勾选"Disable cache"');
  } catch (error) {
    console.error('更新图片时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateImages();
