#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 用于创建数据库、运行迁移和填充初始数据
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始初始化数据库...');

  try {
    // 1. 创建分类数据
    console.log('📁 创建分类数据...');
    const categories = [
      { name: 'FPV验证机', slug: 'fpv-verification', description: '专为FPV飞行爱好者设计的高性能验证机套件' },
      { name: '安防巡检', slug: 'security-patrol', description: '适用于安防巡检的专业无人机套件' },
      { name: '农业植保', slug: 'agricultural-spraying', description: '专为农业植保设计的智能无人机套件' },
      { name: '航拍摄影', slug: 'aerial-photography', description: '专业级航拍摄影无人机套件' },
      { name: '物流配送', slug: 'logistics-delivery', description: '用于物流配送的无人机套件' },
      { name: '测绘航拍', slug: 'mapping-survey', description: '用于测绘和航拍的无人机套件' },
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      });
    }

    // 2. 创建标签数据
    console.log('🏷️ 创建标签数据...');
    const tags = [
      { name: '高性能', slug: 'high-performance' },
      { name: '长续航', slug: 'long-endurance' },
      { name: '防水', slug: 'waterproof' },
      { name: '夜视', slug: 'night-vision' },
      { name: '智能避障', slug: 'obstacle-avoidance' },
      { name: '精准定位', slug: 'precise-positioning' },
      { name: '4K录制', slug: '4k-recording' },
      { name: '实时图传', slug: 'real-time-transmission' },
    ];

    for (const tag of tags) {
      await prisma.tag.upsert({
        where: { slug: tag.slug },
        update: {},
        create: tag,
      });
    }

    // 3. 创建示例用户
    console.log('👤 创建示例用户...');
    const users = [
      {
        email: 'admin@openaero.cn',
        name: '系统管理员',
        role: 'ADMIN',
      },
      {
        email: 'creator1@openaero.cn',
        name: '张三',
        role: 'CREATOR',
      },
      {
        email: 'creator2@openaero.cn',
        name: '李四',
        role: 'CREATOR',
      },
      {
        email: 'customer1@openaero.cn',
        name: '王五',
        role: 'CUSTOMER',
      },
    ];

    for (const user of users) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      });
    }

    // 4. 创建创作者档案
    console.log('🎨 创建创作者档案...');
    const creator1 = await prisma.user.findUnique({ where: { email: 'creator1@openaero.cn' } });
    const creator2 = await prisma.user.findUnique({ where: { email: 'creator2@openaero.cn' } });

    if (creator1) {
      await prisma.creatorProfile.upsert({
        where: { userId: creator1.id },
        update: {},
        create: {
          userId: creator1.id,
          bio: '专业的FPV无人机设计师，拥有5年行业经验，专注于高性能验证机设计。',
          website: 'https://creator1.example.com',
          experience: '在FPV无人机领域有丰富的设计经验，曾参与多个商业项目，熟悉各种飞行控制系统和传感器技术。',
          specialties: ['FPV飞行', '航拍摄影', '智能避障'],
          status: 'APPROVED',
        },
      });
    }

    if (creator2) {
      await prisma.creatorProfile.upsert({
        where: { userId: creator2.id },
        update: {},
        create: {
          userId: creator2.id,
          bio: '农业无人机专家，专注于植保和巡检应用，拥有多项专利技术。',
          website: 'https://creator2.example.com',
          experience: '在农业无人机领域有8年经验，熟悉精准农业技术和智能喷洒系统。',
          specialties: ['农业植保', '安防巡检', '环境监测'],
          status: 'APPROVED',
        },
      });
    }

    // 5. 创建示例解决方案
    console.log('🚁 创建示例解决方案...');
    const fpvCategory = await prisma.category.findUnique({ where: { slug: 'fpv-verification' } });
    const securityCategory = await prisma.category.findUnique({ where: { slug: 'security-patrol' } });
    const agricultureCategory = await prisma.category.findUnique({ where: { slug: 'agricultural-spraying' } });
    const photographyCategory = await prisma.category.findUnique({ where: { slug: 'aerial-photography' } });

    const highPerformanceTag = await prisma.tag.findUnique({ where: { slug: 'high-performance' } });
    const longEnduranceTag = await prisma.tag.findUnique({ where: { slug: 'long-endurance' } });
    const waterproofTag = await prisma.tag.findUnique({ where: { slug: 'waterproof' } });
    const nightVisionTag = await prisma.tag.findUnique({ where: { slug: 'night-vision' } });

    const solutions = [
      {
        title: 'FPV验证机套件',
        slug: 'fpv-verification-kit',
        description: '专为FPV飞行爱好者设计的高性能验证机套件',
        longDescription: '支持4K视频录制和实时图传的专业FPV套件，具备智能避障和精准定位功能。',
        price: 2999,
        categoryId: fpvCategory?.id,
        creatorId: creator1?.id,
        status: 'APPROVED',
        specs: {
          weight: '1.2kg',
          flightTime: '25min',
          range: '5km',
          maxSpeed: '120km/h',
          camera: '4K 60fps',
        },
        bom: {
          frame: 'Carbon Fiber',
          motors: '4x 2207 2400KV',
          esc: '4x 30A BLHeli_S',
          flightController: 'F7 FC',
          camera: '4K Action Camera',
        },
        images: ['/images/fpv-kit-1.jpg', '/images/fpv-kit-2.jpg'],
        tagIds: [highPerformanceTag?.id, longEnduranceTag?.id].filter(Boolean),
      },
      {
        title: '安防巡检套件',
        slug: 'security-patrol-kit',
        description: '适用于安防巡检的专业无人机套件',
        longDescription: '具备夜视功能和智能避障系统的安防专用套件，支持长时间巡逻和实时监控。',
        price: 4599,
        categoryId: securityCategory?.id,
        creatorId: creator2?.id,
        status: 'APPROVED',
        specs: {
          weight: '2.1kg',
          flightTime: '35min',
          range: '8km',
          nightVision: 'Yes',
          obstacleAvoidance: 'Yes',
        },
        bom: {
          frame: 'Aluminum Alloy',
          motors: '4x 2814 1000KV',
          esc: '4x 40A BLHeli_S',
          nightVisionCamera: 'Thermal Camera',
          gimbal: '3-Axis Gimbal',
        },
        images: ['/images/security-kit-1.jpg', '/images/security-kit-2.jpg'],
        tagIds: [nightVisionTag?.id, waterproofTag?.id].filter(Boolean),
      },
      {
        title: '农业植保套件',
        slug: 'agricultural-spraying-kit',
        description: '专为农业植保设计的智能无人机套件',
        longDescription: '具备精准喷洒和智能路径规划功能的农业专用套件，支持大面积农田作业。',
        price: 8999,
        categoryId: agricultureCategory?.id,
        creatorId: creator2?.id,
        status: 'APPROVED',
        specs: {
          weight: '5.2kg',
          flightTime: '45min',
          range: '12km',
          sprayCapacity: '10L',
          precision: '±1cm',
        },
        bom: {
          frame: 'Carbon Fiber + Aluminum',
          motors: '4x 4014 400KV',
          esc: '4x 60A BLHeli_S',
          spraySystem: 'Precision Spray System',
          gps: 'RTK GPS',
        },
        images: ['/images/agricultural-kit-1.jpg', '/images/agricultural-kit-2.jpg'],
        tagIds: [longEnduranceTag?.id, highPerformanceTag?.id].filter(Boolean),
      },
      {
        title: '航拍摄影套件',
        slug: 'aerial-photography-kit',
        description: '专业级航拍摄影无人机套件',
        longDescription: '支持8K视频录制和专业摄影功能的航拍套件，配备专业级云台和相机系统。',
        price: 12999,
        categoryId: photographyCategory?.id,
        creatorId: creator1?.id,
        status: 'APPROVED',
        specs: {
          weight: '3.8kg',
          flightTime: '30min',
          range: '15km',
          camera: '8K 30fps',
          gimbal: '3-Axis Professional',
        },
        bom: {
          frame: 'Carbon Fiber',
          motors: '4x 3508 700KV',
          esc: '4x 50A BLHeli_S',
          camera: '8K Professional Camera',
          gimbal: '3-Axis Professional Gimbal',
        },
        images: ['/images/photography-kit-1.jpg', '/images/photography-kit-2.jpg'],
        tagIds: [highPerformanceTag?.id, longEnduranceTag?.id].filter(Boolean),
      },
    ];

    for (const solution of solutions) {
      await prisma.solution.upsert({
        where: { slug: solution.slug },
        update: {},
        create: solution,
      });
    }

    // 6. 创建示例评价
    console.log('⭐ 创建示例评价...');
    const customer = await prisma.user.findUnique({ where: { email: 'customer1@openaero.cn' } });
    const fpvSolution = await prisma.solution.findUnique({ where: { slug: 'fpv-verification-kit' } });

    if (customer && fpvSolution) {
      await prisma.review.create({
        data: {
          solutionId: fpvSolution.id,
          userId: customer.id,
          rating: 5,
          comment: '非常棒的FPV套件！性能出色，飞行稳定，4K画质清晰。强烈推荐！',
        },
      });
    }

    console.log('✅ 数据库初始化完成！');
    console.log('📊 创建的数据：');
    console.log(`   - ${categories.length} 个分类`);
    console.log(`   - ${tags.length} 个标签`);
    console.log(`   - ${users.length} 个用户`);
    console.log(`   - 2 个创作者档案`);
    console.log(`   - ${solutions.length} 个解决方案`);
    console.log('   - 1 个评价');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
