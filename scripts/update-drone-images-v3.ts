/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

// 使用更具体的无人机图片URL（Unsplash的无人机相关图片ID）
const solutionImages: Record<string, string[]> = {
  '农业植保无人机解决方案': [
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop', // 无人机航拍
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80&auto=format&fit=crop' // 无人机飞行
  ],
  '电力巡检无人机解决方案': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop', // 无人机设备
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop' // 无人机航拍
  ],
  '测绘与地理信息无人机解决方案': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop', // 无人机设备
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop' // 无人机航拍
  ],
  '影视航拍无人机解决方案': [
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop', // 专业航拍无人机
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80&auto=format&fit=crop' // 无人机飞行
  ],
  '应急救援无人机解决方案': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop', // 工业级无人机
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop' // 无人机航拍
  ],
  '环境监测无人机解决方案': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop', // 无人机设备
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
    console.log('开始更新无人机解决方案图片为真实的无人机图片...\n');

    // 使用更真实的无人机图片URL（从Unsplash搜索到的无人机相关图片）
    const realDroneImages: Record<string, string[]> = {
      '农业植保无人机解决方案': [
        'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80&auto=format&fit=crop'
      ],
      '电力巡检无人机解决方案': [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop'
      ],
      '测绘与地理信息无人机解决方案': [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop'
      ],
      '影视航拍无人机解决方案': [
        'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80&auto=format&fit=crop'
      ],
      '应急救援无人机解决方案': [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop'
      ],
      '环境监测无人机解决方案': [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop'
      ],
      '交通监控无人机解决方案': [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop'
      ],
      '边境巡逻无人机解决方案': [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop'
      ],
      '物流配送无人机解决方案': [
        'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80&auto=format&fit=crop'
      ],
      '森林防火无人机解决方案': [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop'
      ]
    };

    for (const [title, images] of Object.entries(realDroneImages)) {
      const solution = await prisma.solution.findFirst({
        where: { title }
      });

      if (solution) {
        // 添加时间戳参数确保图片更新
        const timestampedImages = images.map(img => 
          `${img}${img.includes('?') ? '&' : '?'}v=${Date.now()}`
        );
        
        await prisma.solution.update({
          where: { id: solution.id },
          data: { images: timestampedImages }
        });
        console.log(`✓ 更新方案: ${title}`);
        console.log(`  图片URL: ${images[0]}`);
      } else {
        console.log(`✗ 未找到方案: ${title}`);
      }
    }

    console.log('\n图片更新完成！请清除浏览器缓存后刷新页面查看。');
  } catch (error) {
    console.error('更新图片时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateImages();

