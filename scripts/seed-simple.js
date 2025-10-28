const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('开始添加种子数据...');

  // 创建测试用户
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: 'hashedpassword123',
      firstName: '测试',
      lastName: '用户',
      role: 'CREATOR',
      emailVerified: true,
    },
  });

  console.log('创建测试用户:', testUser);

  // 创建创作者档案
  const creatorProfile = await prisma.creatorProfile.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      bio: '专业的无人机解决方案创作者',
      website: 'https://example.com',
      experience: '5年无人机开发经验',
      specialties: JSON.stringify(['FPV', '航拍', '测绘']),
      status: 'APPROVED',
      revenue: 0,
    },
  });

  console.log('创建创作者档案:', creatorProfile);

  // 创建测试解决方案
  const solutions = [
    {
      title: 'FPV竞速无人机套件',
      description: '专为FPV竞速设计的高性能无人机套件，包含碳纤维机架、高速电机和专业飞控系统。',
      category: '竞速',
      price: 2999.0,
      status: 'PUBLISHED',
      images: JSON.stringify(['/images/solutions/fpv-racing.jpg']),
      features: JSON.stringify(['碳纤维机架', '高速电机', '专业飞控', '5.8G图传']),
      specs: JSON.stringify({
        wheelbase: '220mm',
        weight: '350g',
        maxSpeed: '120km/h',
        flightTime: '8-10分钟'
      }),
      bom: JSON.stringify([
        { name: '碳纤维机架', quantity: 1, price: 299 },
        { name: '2306电机', quantity: 4, price: 89 },
        { name: 'F4飞控', quantity: 1, price: 199 }
      ]),
    },
    {
      title: '航拍无人机解决方案',
      description: '专业航拍无人机套件，配备4K云台相机，适合影视制作和商业摄影。',
      category: '航拍',
      price: 8999.0,
      status: 'PUBLISHED',
      images: JSON.stringify(['/images/solutions/aerial-photography.jpg']),
      features: JSON.stringify(['4K云台相机', '三轴增稳', 'GPS定位', '智能跟随']),
      specs: JSON.stringify({
        maxFlightTime: '30分钟',
        maxRange: '8km',
        cameraResolution: '4K@60fps',
        gimbalStabilization: '3轴机械增稳'
      }),
      bom: JSON.stringify([
        { name: '机身套件', quantity: 1, price: 3999 },
        { name: '4K云台相机', quantity: 1, price: 2999 },
        { name: '智能电池', quantity: 2, price: 599 }
      ]),
    },
    {
      title: '农业植保无人机',
      description: '大载重农业植保无人机，支持精准喷洒，提高农业作业效率。',
      category: '农业',
      price: 15999.0,
      status: 'PUBLISHED',
      images: JSON.stringify(['/images/solutions/agriculture-drone.jpg']),
      features: JSON.stringify(['大载重设计', '精准喷洒', 'RTK定位', '自动作业']),
      specs: JSON.stringify({
        payload: '10L',
        sprayWidth: '4m',
        flightTime: '15分钟',
        workingEfficiency: '8-10亩/小时'
      }),
      bom: JSON.stringify([
        { name: '六旋翼机架', quantity: 1, price: 4999 },
        { name: '喷洒系统', quantity: 1, price: 3999 },
        { name: 'RTK模块', quantity: 1, price: 2999 }
      ]),
    }
  ];

  for (const solutionData of solutions) {
    const solution = await prisma.solution.create({
      data: {
        ...solutionData,
        creatorId: creatorProfile.id,
        userId: testUser.id,
      },
    });
    console.log('创建解决方案:', solution.title);
  }

  console.log('种子数据添加完成!');
}

main()
  .catch((e) => {
    console.error('种子数据添加失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });