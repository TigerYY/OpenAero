import { PrismaClient, UserRole, CreatorStatus, SolutionStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建种子数据...');

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 管理员用户
  await prisma.user.upsert({
    where: { email: 'admin@openaero.com' },
    update: {},
    create: {
      email: 'admin@openaero.com',
      password: hashedPassword,
      firstName: '系统',
      lastName: '管理员',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  console.log('创建了管理员用户: admin@openaero.com');

  // 创作者用户
  const creatorUser = await prisma.user.upsert({
    where: { email: 'creator@openaero.com' },
    update: {},
    create: {
      email: 'creator@openaero.com',
      password: hashedPassword,
      firstName: '测试',
      lastName: '创作者',
      role: UserRole.CREATOR,
      emailVerified: true,
      creatorProfile: {
        create: {
          bio: '专业无人机解决方案设计师，拥有5年行业经验',
          website: 'https://creator.example.com',
          experience: '5年无人机设计经验，专注于农业和监控应用',
          specialties: ['农业无人机', '监控系统', '航拍设备'],
          status: CreatorStatus.APPROVED,
          revenue: 0,
        },
      },
    },
    include: {
      creatorProfile: true,
    },
  });

  // 普通用户
  await prisma.user.upsert({
    where: { email: 'customer@openaero.com' },
    update: {},
    create: {
      email: 'customer@openaero.com',
      password: hashedPassword,
      firstName: '测试',
      lastName: '用户',
      role: UserRole.USER,
      emailVerified: true,
    },
  });

  console.log('创建了普通用户: customer@openaero.com');

  // 创建测试方案
  if (creatorUser.creatorProfile) {
    const solution = await prisma.solution.upsert({
      where: { id: 'test-solution-1' },
      update: {},
      create: {
        id: 'test-solution-1',
        title: '农业植保无人机解决方案',
        description: '专为农业植保设计的高效无人机系统，包含完整的硬件设计图纸、软件代码和使用说明。',
        category: '农业',
        price: 299.99,
        status: SolutionStatus.PUBLISHED,
        images: [
          '/images/solutions/agriculture-drone-1.jpg',
          '/images/solutions/agriculture-drone-2.jpg',
        ],
        features: [
          '10L大容量药箱',
          '精准GPS导航',
          '自动避障系统',
          '实时监控功能',
          '一键返航',
        ],
        specs: {
          wingspan: '1.5m',
          weight: '8kg',
          payload: '10L',
          flightTime: '25min',
          range: '2km',
        },
        bom: {
          frame: '碳纤维机架',
          motor: '无刷电机 x4',
          propeller: '碳纤维螺旋桨 x4',
          battery: '22000mAh锂电池',
          controller: '飞控系统',
          gps: 'RTK-GPS模块',
          camera: '4K摄像头',
          tank: '10L药箱',
        },
        creatorId: creatorUser.creatorProfile!.id,
        userId: creatorUser.id,
      },
    });

    console.log('创建了测试方案:', solution.title);
  }

  console.log('种子数据创建完成!');
  console.log('测试账户:');
  console.log('- 管理员: admin@openaero.com');
  console.log('- 创作者: creator@openaero.com');
  console.log('- 用户: customer@openaero.com');
  console.log('- 密码: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });