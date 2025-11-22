/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient, SolutionStatus } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

// 10个不同场景的无人机解决方案数据
const droneSolutions = [
  {
    title: '农业植保无人机解决方案',
    description: '专业的农业植保无人机解决方案，配备多光谱传感器和精准喷洒系统。可实时监测作物健康状况，根据需要进行精准施药，减少农药浪费30%以上，提高作业效率5倍。适用于水稻、小麦、玉米等大田作物的病虫害防治和营养补充。',
    category: '农业植保',
    price: 45000.00,
    features: ['多光谱监测', '精准喷洒', 'RTK定位', '自主飞行', '智能避障'],
    tags: ['农业', '植保', '多光谱', '精准农业', '自动化'],
    images: [
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80'
    ],
    specs: {
      '飞行时间': '25-30分钟',
      '作业效率': '80-100亩/小时',
      '载重能力': '40L药箱',
      '喷洒精度': '±5cm',
      '工作温度': '-10°C ~ 50°C',
      '防护等级': 'IP54'
    },
    bom: [
      { name: '多旋翼无人机平台', model: 'DJI T40', quantity: 1, unitPrice: 28000, notes: '6轴飞行器，最大载重50kg' },
      { name: '多光谱相机', model: 'DJI P4 Multispectral', quantity: 1, unitPrice: 8500, notes: '6通道多光谱成像' },
      { name: '农药喷洒系统', model: 'T40 Spraying System', quantity: 1, unitPrice: 4500, notes: '双离心雾化喷头' },
      { name: 'RTK定位模块', model: 'DJI D-RTK 2', quantity: 1, unitPrice: 3200, notes: '厘米级定位精度' },
      { name: '地面控制站', model: 'DJI Smart Controller', quantity: 1, unitPrice: 1800, notes: '7英寸高亮屏' }
    ]
  },
  {
    title: '电力巡检无人机解决方案',
    description: '专业的电力线路巡检无人机系统，配备高清可见光相机和红外热成像仪。可自动识别线路故障、绝缘子破损、鸟巢等隐患，减少人工巡检风险，提高巡检效率10倍。支持自动航线规划、缺陷智能识别和报告自动生成。',
    category: '安防巡检',
    price: 68000.00,
    features: ['红外热成像', '高清可见光', '激光测距', '自动巡检', '缺陷识别'],
    tags: ['电力', '巡检', '红外', '安全', '自动化'],
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80'
    ],
    specs: {
      '飞行时间': '45分钟',
      '巡检速度': '15-20km/h',
      '可见光分辨率': '4K',
      '热成像分辨率': '640×512',
      '测距范围': '1200m',
      '防护等级': 'IP55'
    },
    bom: [
      { name: '多旋翼无人机平台', model: 'DJI M30T', quantity: 1, unitPrice: 42000, notes: '工业级飞行平台' },
      { name: '高清可见光相机', model: 'DJI Zenmuse H20T', quantity: 1, unitPrice: 15000, notes: '4K视频录制' },
      { name: '红外热成像仪', model: 'DJI Zenmuse H20T Thermal', quantity: 1, unitPrice: 8500, notes: '640×512分辨率' },
      { name: '激光测距仪', model: 'DJI Zenmuse H20T Laser', quantity: 1, unitPrice: 2500, notes: '1200m测距范围' },
      { name: '地面控制站', model: 'DJI RC Plus', quantity: 1, unitPrice: 1000, notes: '7英寸高亮屏' }
    ]
  },
  {
    title: '测绘与地理信息无人机解决方案',
    description: '高精度测绘无人机系统，配备激光雷达和高分辨率相机。可快速获取大面积区域的三维地形数据，生成高精度数字高程模型(DEM)和正射影像图。适用于地形测绘、城市规划、矿山监测、工程建设等领域。',
    category: '测绘航拍',
    price: 125000.00,
    features: ['激光雷达', '高精度定位', '三维建模', '正射影像', '自动航线'],
    tags: ['测绘', 'LiDAR', '三维建模', '地理信息', 'RTK'],
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800'
    ],
    specs: {
      '飞行时间': '55分钟',
      '作业面积': '15-20km²/架次',
      '点云密度': '100-200点/m²',
      '定位精度': '±2cm',
      '相机分辨率': '2000万像素',
      '扫描范围': '450m'
    },
    bom: [
      { name: '固定翼无人机平台', model: 'DJI M350 RTK', quantity: 1, unitPrice: 65000, notes: 'RTK定位系统' },
      { name: '高分辨率相机', model: 'DJI P1', quantity: 1, unitPrice: 28000, notes: '全画幅相机，3500万像素' },
      { name: '激光雷达', model: 'DJI L1', quantity: 1, unitPrice: 28000, notes: 'Livox激光雷达' },
      { name: 'RTK/PPK定位系统', model: 'DJI D-RTK 2', quantity: 1, unitPrice: 3200, notes: '厘米级定位' },
      { name: '地面控制站', model: 'DJI Smart Controller Enterprise', quantity: 1, unitPrice: 2800, notes: '专业级控制器' }
    ]
  },
  {
    title: '影视航拍无人机解决方案',
    description: '专业影视级航拍无人机系统，配备全画幅相机和三轴云台。支持4K/6K视频录制，多种拍摄模式，满足电影、广告、纪录片等专业制作需求。具备出色的稳定性和画质表现，是专业影视团队的理想选择。',
    category: '航拍摄影',
    price: 85000.00,
    features: ['全画幅相机', '三轴云台', '4K/6K录制', '专业色彩', '长续航'],
    tags: ['影视', '航拍', '专业摄影', '电影制作', '广告'],
    images: [
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'
    ],
    specs: {
      '飞行时间': '28分钟',
      '视频分辨率': '6K/4K',
      '相机传感器': '全画幅',
      '云台稳定精度': '±0.01°',
      '最大飞行速度': '94km/h',
      '图传距离': '15km'
    },
    bom: [
      { name: '多旋翼无人机平台', model: 'DJI Inspire 3', quantity: 1, unitPrice: 58000, notes: '专业级飞行平台' },
      { name: '全画幅相机', model: 'DJI Zenmuse X9', quantity: 1, unitPrice: 18000, notes: '6K视频录制' },
      { name: '三轴云台', model: 'DJI Zenmuse X9 Gimbal', quantity: 1, unitPrice: 5500, notes: '360°旋转' },
      { name: '远程控制器', model: 'DJI RC Pro', quantity: 1, unitPrice: 2500, notes: '专业级控制器' },
      { name: '图传系统', model: 'DJI O3 Enterprise', quantity: 1, unitPrice: 1000, notes: '15km图传距离' }
    ]
  },
  {
    title: '应急救援无人机解决方案',
    description: '专业的应急救援无人机系统，配备红外热成像仪、扬声器和投放装置。可在自然灾害、火灾、地震等紧急情况下，快速进行搜索、救援和物资投送。支持夜间作业，提高救援效率，降低救援人员风险。',
    category: '应急救援',
    price: 55000.00,
    features: ['热成像搜索', '物资投送', '扬声器', '夜间作业', '快速响应'],
    tags: ['应急救援', '搜索救援', '热成像', '安全', '公共安全'],
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80'
    ],
    specs: {
      '飞行时间': '42分钟',
      '载重能力': '5kg',
      '热成像分辨率': '640×512',
      '扬声器功率': '100W',
      '投放精度': '±2m',
      '工作温度': '-20°C ~ 50°C'
    },
    bom: [
      { name: '多旋翼无人机平台', model: 'DJI M30T', quantity: 1, unitPrice: 42000, notes: '工业级飞行平台' },
      { name: '红外热成像仪', model: 'DJI Zenmuse H20T Thermal', quantity: 1, unitPrice: 8500, notes: '640×512分辨率' },
      { name: '扬声器', model: 'DJI Speaker', quantity: 1, unitPrice: 2500, notes: '100W功率' },
      { name: '投放装置', model: 'DJI Payload Drop', quantity: 1, unitPrice: 1500, notes: '5kg载重' },
      { name: '地面控制站', model: 'DJI RC Plus', quantity: 1, unitPrice: 500, notes: '便携式控制器' }
    ]
  },
  {
    title: '环境监测无人机解决方案',
    description: '专业的环境监测无人机系统，配备多种传感器，可实时监测空气质量、水质和土壤状况。支持多点采样、实时数据传输和数据分析，为环境保护和治理提供科学依据。适用于环保部门、科研院所和企业环境监测。',
    category: '环境监测',
    price: 48000.00,
    features: ['多传感器', '实时监测', '数据采集', '自动采样', '数据分析'],
    tags: ['环境监测', '空气质量', '水质监测', '环保', '数据采集'],
    images: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
    ],
    specs: {
      '飞行时间': '38分钟',
      '监测参数': 'PM2.5/PM10/NO2/SO2/O3',
      '采样频率': '1次/秒',
      '数据传输': '实时4G/5G',
      '传感器数量': '8个',
      '防护等级': 'IP54'
    },
    bom: [
      { name: '多旋翼无人机平台', model: 'DJI M300 RTK', quantity: 1, unitPrice: 35000, notes: '工业级飞行平台' },
      { name: '空气质量传感器', model: 'Environmental Sensor Suite', quantity: 1, unitPrice: 8500, notes: 'PM2.5/PM10/NO2/SO2/O3' },
      { name: '水质采样器', model: 'Water Sampling System', quantity: 1, unitPrice: 3500, notes: '自动采样装置' },
      { name: '土壤湿度传感器', model: 'Soil Moisture Sensor', quantity: 1, unitPrice: 1800, notes: '多点监测' },
      { name: '地面控制站', model: 'DJI Smart Controller', quantity: 1, unitPrice: 400, notes: '数据监控平台' }
    ]
  },
  {
    title: '交通监控无人机解决方案',
    description: '智能交通监控无人机系统，配备高清摄像头和自动跟踪系统。可实时监控城市交通流量、事故和违章行为，为交通管理和规划提供数据支持。支持自动巡航、智能识别和实时报警，提高交通管理效率。',
    category: '交通监控',
    price: 52000.00,
    features: ['高清监控', '自动跟踪', '智能识别', '实时图传', '自动巡航'],
    tags: ['交通监控', '智能识别', '城市管理', '安全', '自动化'],
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
    ],
    specs: {
      '飞行时间': '40分钟',
      '监控范围': '5km半径',
      '视频分辨率': '4K',
      '跟踪精度': '±1m',
      '识别距离': '500m',
      '图传距离': '10km'
    },
    bom: [
      { name: '多旋翼无人机平台', model: 'DJI Mavic 3 Enterprise', quantity: 1, unitPrice: 32000, notes: '企业级飞行平台' },
      { name: '高清摄像头', model: 'DJI Zenmuse H20N', quantity: 1, unitPrice: 12000, notes: '4K视频录制' },
      { name: '自动跟踪系统', model: 'DJI ActiveTrack 5.0', quantity: 1, unitPrice: 5000, notes: '智能跟踪算法' },
      { name: '图传系统', model: 'DJI O3 Enterprise', quantity: 1, unitPrice: 2000, notes: '10km图传距离' },
      { name: '地面控制站', model: 'DJI RC Pro Enterprise', quantity: 1, unitPrice: 1000, notes: '专业控制器' }
    ]
  },
  {
    title: '边境巡逻无人机解决方案',
    description: '专业的边境巡逻无人机系统，配备高清摄像头、红外热成像仪和长距离通信系统。可对边境地区进行24小时不间断巡逻，监测非法入境、走私等活动。支持自动航线规划、异常行为识别和实时报警，增强边境安全。',
    category: '安防巡检',
    price: 95000.00,
    features: ['长距离巡逻', '热成像监测', '异常识别', '实时通信', '自动巡航'],
    tags: ['边境巡逻', '安防', '热成像', '公共安全', '自动化'],
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800'
    ],
    specs: {
      '飞行时间': '55分钟',
      '巡逻范围': '50km',
      '可见光分辨率': '4K',
      '热成像分辨率': '640×512',
      '通信距离': '30km',
      '工作温度': '-30°C ~ 60°C'
    },
    bom: [
      { name: '固定翼无人机平台', model: 'DJI M350 RTK', quantity: 1, unitPrice: 65000, notes: '长航时飞行平台' },
      { name: '高清摄像头', model: 'DJI Zenmuse H20T', quantity: 1, unitPrice: 15000, notes: '4K视频录制' },
      { name: '红外热成像仪', model: 'DJI Zenmuse H20T Thermal', quantity: 1, unitPrice: 8500, notes: '640×512分辨率' },
      { name: '长距离通信系统', model: 'Long Range Communication Module', quantity: 1, unitPrice: 4000, notes: '30km通信距离' },
      { name: '地面控制站', model: 'DJI Smart Controller Enterprise', quantity: 1, unitPrice: 2500, notes: '专业级控制器' }
    ]
  },
  {
    title: '物流配送无人机解决方案',
    description: '智能物流配送无人机系统，配备货物投放装置和自动避障系统。可进行小型包裹的快速配送，特别适用于偏远地区或紧急物资的运输。支持自动航线规划、精准投放和实时追踪，提高配送效率，降低配送成本。',
    category: '物流配送',
    price: 38000.00,
    features: ['精准投放', '自动避障', 'GPS导航', '实时追踪', '快速配送'],
    tags: ['物流配送', '快递', '自动化', '智能运输', '电商'],
    images: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
    ],
    specs: {
      '飞行时间': '35分钟',
      '载重能力': '10kg',
      '配送距离': '15km',
      '投放精度': '±1m',
      '避障距离': '30m',
      '最大速度': '72km/h'
    },
    bom: [
      { name: '多旋翼无人机平台', model: 'DJI Mavic 3 Enterprise', quantity: 1, unitPrice: 28000, notes: '企业级飞行平台' },
      { name: '货物投放装置', model: 'DJI Payload Release', quantity: 1, unitPrice: 4500, notes: '10kg载重' },
      { name: 'GPS导航系统', model: 'DJI RTK Module', quantity: 1, unitPrice: 3200, notes: '厘米级定位' },
      { name: '自动避障系统', model: 'DJI APAS 5.0', quantity: 1, unitPrice: 2000, notes: '全方位避障' },
      { name: '地面控制站', model: 'DJI RC Pro', quantity: 1, unitPrice: 500, notes: '配送管理平台' }
    ]
  },
  {
    title: '森林防火无人机解决方案',
    description: '专业的森林防火监测无人机系统，配备红外热成像仪和高清摄像头。可对森林进行24小时不间断巡逻，监测火灾隐患，及时发现和报告火情。支持自动巡航、火点识别和实时报警，协助消防部门快速响应，减少火灾损失。',
    category: '环境监测',
    price: 62000.00,
    features: ['火点识别', '热成像监测', '自动巡航', '实时报警', '夜间作业'],
    tags: ['森林防火', '环境监测', '热成像', '公共安全', '自动化'],
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800'
    ],
    specs: {
      '飞行时间': '45分钟',
      '监测范围': '10km半径',
      '热成像分辨率': '640×512',
      '可见光分辨率': '4K',
      '识别距离': '3km',
      '图传距离': '15km'
    },
    bom: [
      { name: '多旋翼无人机平台', model: 'DJI M30T', quantity: 1, unitPrice: 42000, notes: '工业级飞行平台' },
      { name: '红外热成像仪', model: 'DJI Zenmuse H20T Thermal', quantity: 1, unitPrice: 8500, notes: '640×512分辨率' },
      { name: '高清摄像头', model: 'DJI Zenmuse H20T', quantity: 1, unitPrice: 8500, notes: '4K视频录制' },
      { name: '实时图传系统', model: 'DJI O3 Enterprise', quantity: 1, unitPrice: 2000, notes: '15km图传距离' },
      { name: '地面控制站', model: 'DJI RC Plus', quantity: 1, unitPrice: 1000, notes: '监控指挥平台' }
    ]
  }
];

async function seedSolutions() {
  try {
    console.log('开始创建无人机解决方案...');

    // 通过 Supabase Admin 查找用户
    const { createSupabaseAdmin } = await import('../src/lib/auth/supabase-client');
    const supabaseAdmin = createSupabaseAdmin();
    
    // 查找用户邮箱
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      throw new Error(`查找用户失败: ${authError.message}`);
    }
    
    const authUser = authUsers.users.find(u => u.email === 'tigeryy@me.com');
    if (!authUser) {
      throw new Error('未找到用户 tigeryy@me.com');
    }
    
    console.log(`找到用户: ${authUser.email} (ID: ${authUser.id})`);
    
    // 查找用户资料和创作者档案
    const userProfile = await prisma.userProfile.findUnique({
      where: { user_id: authUser.id },
      include: {
        creatorProfile: true
      }
    });

    if (!userProfile) {
      throw new Error('未找到用户资料 tigeryy@me.com');
    }

    if (!userProfile.creatorProfile) {
      throw new Error('用户 tigeryy@me.com 没有创作者档案');
    }

    const creatorId = userProfile.creatorProfile.id;
    console.log(`找到创作者ID: ${creatorId}`);

    // 创建解决方案
    for (const solutionData of droneSolutions) {
      const solution = await prisma.solution.create({
        data: {
          title: solutionData.title,
          description: solutionData.description,
          category: solutionData.category,
          price: solutionData.price,
          status: SolutionStatus.PUBLISHED,
          images: solutionData.images,
          features: solutionData.features,
          tags: solutionData.tags,
          specs: solutionData.specs,
          bom: solutionData.bom,
          creator_id: creatorId,
          published_at: new Date(),
          submitted_at: new Date(),
          reviewed_at: new Date(),
          review_notes: '自动创建并发布'
        }
      });

      console.log(`✓ 创建方案: ${solution.title} (ID: ${solution.id})`);

      // 创建上架优化数据
      await prisma.solutionPublishing.create({
        data: {
          solution_id: solution.id,
          publish_description: `${solutionData.title} - 专业的${solutionData.category}解决方案，适用于${solutionData.tags.join('、')}等应用场景。`,
          meta_title: solutionData.title,
          meta_description: solutionData.description.substring(0, 160),
          meta_keywords: solutionData.tags,
          featured_tags: solutionData.tags.slice(0, 3),
          optimized_at: new Date(),
          optimized_by: userProfile.id
        }
      });

      console.log(`  ✓ 创建上架优化数据`);
    }

    console.log(`\n成功创建 ${droneSolutions.length} 个无人机解决方案！`);
  } catch (error) {
    console.error('创建解决方案时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSolutions();

