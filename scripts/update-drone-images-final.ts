/* eslint-disable no-console, no-hardcoded-routes */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

// 使用真实的无人机图片URL（从Unsplash搜索到的无人机相关图片）
// 这些是真正的无人机图片，不是人物照片
const realDroneImages: Record<string, string[]> = {
  '农业植保无人机解决方案': [
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop', // 无人机航拍农田
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80&auto=format&fit=crop' // 无人机飞行
  ],
  '电力巡检无人机解决方案': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop', // 无人机设备
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop' // 无人机航拍
  ],
  '测绘与地理信息无人机解决方案': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop', // 测绘设备
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop' // 无人机航拍
  ],
  '影视航拍无人机解决方案': [
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop', // 专业航拍
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80&auto=format&fit=crop' // 无人机飞行
  ],
  '应急救援无人机解决方案': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop', // 救援无人机
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop' // 无人机航拍
  ],
  '环境监测无人机解决方案': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop', // 监测设备
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop' // 无人机航拍
  ],
  '交通监控无人机解决方案': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop', // 监控无人机
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop' // 无人机设备
  ],
  '边境巡逻无人机解决方案': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop', // 巡逻无人机
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop' // 工业级无人机
  ],
  '物流配送无人机解决方案': [
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop', // 配送无人机
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80&auto=format&fit=crop' // 无人机飞行
  ],
  '森林防火无人机解决方案': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop', // 监测无人机
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop' // 无人机设备
  ]
};

async function updateImages() {
  try {
    console.log('开始更新为真实的无人机图片...\n');

    for (const [title, images] of Object.entries(realDroneImages)) {
      const solution = await prisma.solution.findFirst({
        where: { title }
      });

      if (solution) {
        await prisma.solution.update({
          where: { id: solution.id },
          data: { images }
        });
        console.log(`✓ 更新方案: ${title}`);
        console.log(`  图片URL: ${images[0]}`);
      } else {
        console.log(`✗ 未找到方案: ${title}`);
      }
    }

    console.log('\n✅ 图片更新完成！');
    console.log('⚠️  注意：如果页面仍显示旧图片，请：');
    console.log('   1. 硬刷新页面：Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows)');
    console.log('   2. 清除浏览器缓存');
    console.log('   3. 在开发者工具中禁用缓存');
  } catch (error) {
    console.error('更新图片时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateImages();

