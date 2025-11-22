/* eslint-disable no-console, no-hardcoded-routes */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Node.js 18+ 内置 fetch，无需额外导入
// 如果使用 Node.js < 18，需要安装 node-fetch

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

// 解决方案对应的AI生成提示词（英文，用于AI图片生成）
const solutionPrompts: Record<string, string> = {
  '农业植保无人机解决方案': 'Professional agricultural drone spraying pesticides over green farmland, modern quadcopter with spray equipment, sunny day, high quality, realistic, 4K, detailed',
  '电力巡检无人机解决方案': 'Industrial inspection drone flying near high-voltage power lines, quadcopter with thermal camera, professional equipment, clear sky, detailed, realistic, 4K',
  '测绘与地理信息无人机解决方案': 'Surveying drone with LiDAR equipment mapping terrain, professional mapping quadcopter, aerial view, modern technology, high quality, realistic, 4K',
  '影视航拍无人机解决方案': 'Professional cinematography drone with gimbal camera, film production quadcopter, cinematic lighting, high-end equipment, realistic, 4K',
  '应急救援无人机解决方案': 'Rescue drone with medical supplies and search equipment, emergency response quadcopter, professional equipment, clear visibility, realistic, 4K',
  '环境监测无人机解决方案': 'Environmental monitoring drone with sensors, scientific equipment, air quality monitoring, modern technology, detailed, realistic, 4K',
  '交通监控无人机解决方案': 'Traffic monitoring drone over city roads, surveillance quadcopter, urban environment, professional equipment, clear day, realistic, 4K',
  '边境巡逻无人机解决方案': 'Border patrol drone with surveillance equipment, security quadcopter, rugged terrain, professional military-grade equipment, realistic, 4K',
  '物流配送无人机解决方案': 'Delivery drone carrying package, logistics quadcopter with cargo box, modern urban environment, professional design, realistic, 4K',
  '森林防火无人机解决方案': 'Forest fire monitoring drone with thermal imaging, fire detection quadcopter, forest environment, professional equipment, realistic, 4K'
};

// AI图片生成服务配置
interface ImageGenConfig {
  provider: 'openai' | 'stability' | 'replicate';
  apiKey?: string;
}

async function generateImageWithAI(
  prompt: string,
  config: ImageGenConfig
): Promise<Buffer | null> {
  try {
    if (config.provider === 'openai') {
      return await generateWithOpenAI(prompt, config.apiKey || '');
    } else if (config.provider === 'stability') {
      return await generateWithStability(prompt, config.apiKey || '');
    } else if (config.provider === 'replicate') {
      return await generateWithReplicate(prompt, config.apiKey || '');
    }
    return null;
  } catch (error) {
    console.error('AI图片生成失败:', error);
    return null;
  }
}

async function generateWithOpenAI(prompt: string, apiKey: string): Promise<Buffer | null> {
  if (!apiKey) {
    console.warn('OpenAI API密钥未配置，跳过生成');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API错误: ${error}`);
    }

    const data = await response.json() as { data: Array<{ url: string }> };
    const imageUrl = data.data[0]?.url;

    if (!imageUrl) {
      throw new Error('未获取到图片URL');
    }

    // 下载图片
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('下载图片失败');
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('OpenAI图片生成错误:', error);
    return null;
  }
}

async function generateWithStability(prompt: string, apiKey: string): Promise<Buffer | null> {
  if (!apiKey) {
    console.warn('Stability AI API密钥未配置，跳过生成');
    return null;
  }

  try {
    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'image/*'
      },
      body: JSON.stringify({
        prompt: prompt,
        output_format: 'png',
        aspect_ratio: '16:9',
        model: 'stable-diffusion-xl-1024-v1-0'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stability AI API错误: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Stability AI图片生成错误:', error);
    return null;
  }
}

async function generateWithReplicate(prompt: string, apiKey: string): Promise<Buffer | null> {
  if (!apiKey) {
    console.warn('Replicate API密钥未配置，跳过生成');
    return null;
  }

  // Replicate API 实现
  console.warn('Replicate API暂未实现，请使用OpenAI或Stability AI');
  return null;
}

async function saveImageToLocal(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  const imagesDir = resolve(process.cwd(), 'public', 'images', 'solutions');
  
  // 确保目录存在
  if (!existsSync(imagesDir)) {
    await mkdir(imagesDir, { recursive: true });
  }

  const filepath = resolve(imagesDir, filename);
  await writeFile(filepath, imageBuffer);

  // 返回相对于public目录的路径（用于前端访问）
  return `/images/solutions/${filename}`;
}

async function generateAndUpdateImages() {
  try {
    // 检查AI配置
    const aiProvider = (process.env.AI_IMAGE_PROVIDER || 'openai') as 'openai' | 'stability' | 'replicate';
    const openaiKey = process.env.OPENAI_API_KEY;
    const stabilityKey = process.env.STABILITY_API_KEY;
    const replicateKey = process.env.REPLICATE_API_KEY;

    let aiApiKey: string | undefined;

    if (aiProvider === 'openai' && openaiKey) {
      aiApiKey = openaiKey;
    } else if (aiProvider === 'stability' && stabilityKey) {
      aiApiKey = stabilityKey;
    } else if (aiProvider === 'replicate' && replicateKey) {
      aiApiKey = replicateKey;
    } else {
      // 尝试自动检测可用的API密钥
      if (openaiKey) {
        aiApiKey = openaiKey;
        console.log('使用 OpenAI API');
      } else if (stabilityKey) {
        aiApiKey = stabilityKey;
        console.log('使用 Stability AI API');
      } else if (replicateKey) {
        aiApiKey = replicateKey;
        console.log('使用 Replicate API');
      }
    }

    if (!aiApiKey) {
      console.error('❌ 错误：未配置AI图片生成API密钥');
      console.log('\n请设置以下环境变量之一：');
      console.log('  - OPENAI_API_KEY (用于OpenAI DALL-E)');
      console.log('  - STABILITY_API_KEY (用于Stability AI)');
      console.log('  - REPLICATE_API_KEY (用于Replicate)');
      console.log('\n可选：设置 AI_IMAGE_PROVIDER=openai|stability|replicate');
      console.log('\n示例：在 .env.local 文件中添加：');
      console.log('  OPENAI_API_KEY=sk-...');
      process.exit(1);
    }

    const config: ImageGenConfig = {
      provider: aiProvider,
      apiKey: aiApiKey
    };

    console.log(`\n开始使用 ${aiProvider} 生成无人机图片...\n`);

    let successCount = 0;
    let failCount = 0;

    for (const [title, prompt] of Object.entries(solutionPrompts)) {
      const solution = await prisma.solution.findFirst({
        where: { title }
      });

      if (!solution) {
        console.log(`✗ 未找到方案: ${title}`);
        failCount++;
        continue;
      }

      console.log(`正在生成: ${title}...`);
      console.log(`  提示词: ${prompt.substring(0, 80)}...`);

      // 生成图片
      const imageBuffer = await generateImageWithAI(prompt, config);

      if (!imageBuffer) {
        console.log(`  ⚠️  生成失败，跳过`);
        failCount++;
        continue;
      }

      // 保存到本地
      const filename = `${solution.id}-${Date.now()}.jpg`;
      const imagePath = await saveImageToLocal(imageBuffer, filename);

      // 更新数据库
      await prisma.solution.update({
        where: { id: solution.id },
        data: {
          images: [imagePath, imagePath] // 主图和缩略图使用同一张
        }
      });

      console.log(`  ✓ 已生成并保存: ${imagePath}`);
      successCount++;
      
      // 避免API速率限制，添加延迟
      console.log('  等待2秒...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ 图片生成完成！`);
    console.log(`   成功: ${successCount} 个`);
    console.log(`   失败: ${failCount} 个`);
    console.log('\n请刷新页面查看新生成的图片。');
  } catch (error) {
    console.error('生成图片时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
generateAndUpdateImages();

