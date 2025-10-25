import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { ValidationError, withErrorHandling } from '@/lib/error-handler';
import { searchSchema } from '@/lib/validations';
import { PaginatedResponse, Solution } from '@/types';

// 模拟数据作为备用
const mockSolutions: Solution[] = [
  {
    id: '1',
    title: 'FPV验证机套件',
    slug: 'fpv-verification-kit',
    description: '专为FPV飞行爱好者设计的高性能验证机套件',
    longDescription: '支持4K视频录制和实时图传的专业FPV套件',
    images: ['/images/fpv-kit-1.jpg', '/images/fpv-kit-2.jpg'],
    price: 2999,
    categoryId: 'cat1',
    creatorId: 'creator1',
    status: 'APPROVED',
    specs: {
      weight: '1.2kg',
      flightTime: '25min',
      range: '5km'
    },
    bom: {
      frame: 'Carbon Fiber',
      motors: '4x 2207 2400KV',
      esc: '4x 30A BLHeli_S'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    averageRating: 4.8,
    reviewCount: 24
  },
  {
    id: '2',
    title: '安防巡检套件',
    slug: 'security-patrol-kit',
    description: '适用于安防巡检的专业无人机套件',
    longDescription: '具备夜视功能和智能避障系统的安防专用套件',
    images: ['/images/security-kit-1.jpg', '/images/security-kit-2.jpg'],
    price: 4599,
    categoryId: 'cat2',
    creatorId: 'creator2',
    status: 'APPROVED',
    specs: {
      weight: '2.1kg',
      flightTime: '35min',
      range: '8km'
    },
    bom: {
      frame: 'Aluminum Alloy',
      motors: '4x 2814 1000KV',
      esc: '4x 40A BLHeli_S'
    },
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    averageRating: 4.5,
    reviewCount: 12
  },
  {
    id: '3',
    title: '农业植保套件',
    slug: 'agricultural-spraying-kit',
    description: '专为农业植保设计的智能无人机套件',
    longDescription: '具备精准喷洒和智能路径规划功能的农业专用套件',
    images: ['/images/agricultural-kit-1.jpg', '/images/agricultural-kit-2.jpg'],
    price: 8999,
    categoryId: 'cat3',
    creatorId: 'creator3',
    status: 'APPROVED',
    specs: {
      weight: '5.2kg',
      flightTime: '45min',
      range: '12km'
    },
    bom: {
      frame: 'Carbon Fiber + Aluminum',
      motors: '4x 4014 400KV',
      esc: '4x 60A BLHeli_S'
    },
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
    averageRating: 4.9,
    reviewCount: 8
  },
  {
    id: '4',
    title: '航拍摄影套件',
    slug: 'aerial-photography-kit',
    description: '专业级航拍摄影无人机套件',
    longDescription: '支持8K视频录制和专业摄影功能的航拍套件',
    images: ['/images/photography-kit-1.jpg', '/images/photography-kit-2.jpg'],
    price: 12999,
    categoryId: 'cat4',
    creatorId: 'creator4',
    status: 'APPROVED',
    specs: {
      weight: '3.8kg',
      flightTime: '30min',
      range: '15km'
    },
    bom: {
      frame: 'Carbon Fiber',
      motors: '4x 3508 700KV',
      esc: '4x 50A BLHeli_S'
    },
    createdAt: new Date('2024-01-30'),
    updatedAt: new Date('2024-01-30'),
    averageRating: 4.7,
    reviewCount: 15
  }
];

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  // 解析查询参数
  const query = {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: searchParams.get('page') || '1',
    limit: searchParams.get('limit') || '20',
  };

  // 验证查询参数
  const validatedQuery = searchSchema.parse(query);

  try {
    // 构建数据库查询条件
    const where: any = {
      status: 'APPROVED',
    };

    // 搜索关键词
    if (validatedQuery.q) {
      where.OR = [
        { title: { contains: validatedQuery.q, mode: 'insensitive' } },
        { description: { contains: validatedQuery.q, mode: 'insensitive' } },
      ];
    }

    // 分类筛选
    if (validatedQuery.category) {
      where.category = { slug: validatedQuery.category };
    }

    // 价格筛选
    if (validatedQuery.minPrice || validatedQuery.maxPrice) {
      where.price = {};
      if (validatedQuery.minPrice) {
        where.price.gte = parseFloat(validatedQuery.minPrice);
      }
      if (validatedQuery.maxPrice) {
        where.price.lte = parseFloat(validatedQuery.maxPrice);
      }
    }

    // 排序
    const orderBy: any = {};
    switch (validatedQuery.sortBy) {
      case 'price':
        orderBy.price = validatedQuery.sortOrder;
        break;
      case 'name':
        orderBy.name = validatedQuery.sortOrder;
        break;
      case 'createdAt':
      default:
        orderBy.createdAt = validatedQuery.sortOrder;
        break;
    }

    // 分页
    const page = parseInt(validatedQuery.page || '1');
    const limit = parseInt(validatedQuery.limit || '20');
    const skip = (page - 1) * limit;

    // 查询数据库
    const [solutions, total] = await Promise.all([
      db.solution.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: {
            include: {
              user: true,
            },
          },
        },
      }),
      db.solution.count({ where }),
    ]);

    // 计算平均评分（暂时设为0，因为reviews关系未包含）
    const solutionsWithRating = solutions.map(solution => ({
      ...solution,
      price: Number(solution.price), // 转换Decimal为number
      status: solution.status as 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED', // 转换状态类型
      slug: solution.title.toLowerCase().replace(/\s+/g, '-'), // 生成slug
      categoryId: 'default', // 暂时设为默认分类
      specs: solution.specs as Record<string, any> || {}, // 转换JsonValue为Record
      bom: solution.bom as Record<string, any> || {}, // 转换JsonValue为Record
      creator: {
        ...solution.creator,
        bio: solution.creator.bio || '', // 转换null为空字符串
        website: solution.creator.website || '', // 转换null为空字符串
        experience: solution.creator.experience || '', // 转换null为空字符串
        revenue: Number(solution.creator.revenue), // 转换Decimal为number
        user: {
          ...solution.creator.user,
          name: solution.creator.user.name || '', // 转换null为空字符串
          avatar: solution.creator.user.avatar || '', // 转换null为空字符串
        },
      },
      averageRating: 0, // 暂时设为0，等待reviews关系实现
      reviewCount: 0,   // 暂时设为0，等待reviews关系实现
    }));

    // 如果按评分排序，需要重新排序
    if (validatedQuery.sortBy === 'rating') {
      solutionsWithRating.sort((a, b) => {
        const order = validatedQuery.sortOrder === 'asc' ? 1 : -1;
        return (a.averageRating - b.averageRating) * order;
      });
    }

    const response: PaginatedResponse<Solution> = {
      success: true,
      data: solutionsWithRating,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Database query error:', error);
    
    // 如果数据库查询失败，回退到模拟数据
    console.log('Falling back to mock data...');
    
    // 使用原来的模拟数据逻辑
    let filteredSolutions = mockSolutions.filter(solution => {
      if (solution.status !== 'APPROVED') return false;

      if (validatedQuery.q) {
        const searchTerm = validatedQuery.q.toLowerCase();
        const matchesTitle = solution.title.toLowerCase().includes(searchTerm);
        const matchesDescription = solution.description.toLowerCase().includes(searchTerm);
        if (!matchesTitle && !matchesDescription) return false;
      }

      if (validatedQuery.category && solution.categoryId !== validatedQuery.category) {
        return false;
      }

      if (validatedQuery.minPrice) {
        const minPrice = parseFloat(validatedQuery.minPrice);
        if (solution.price < minPrice) return false;
      }
      if (validatedQuery.maxPrice) {
        const maxPrice = parseFloat(validatedQuery.maxPrice);
        if (solution.price > maxPrice) return false;
      }

      return true;
    });

    filteredSolutions.sort((a, b) => {
      const order = validatedQuery.sortOrder === 'asc' ? 1 : -1;
      
      switch (validatedQuery.sortBy) {
        case 'price':
          return (a.price - b.price) * order;
        case 'rating':
          return ((a.averageRating || 0) - (b.averageRating || 0)) * order;
        case 'name':
          return a.title.localeCompare(b.title) * order;
        case 'createdAt':
        default:
          return (a.createdAt.getTime() - b.createdAt.getTime()) * order;
      }
    });

    const page = parseInt(validatedQuery.page || '1');
    const limit = parseInt(validatedQuery.limit || '20');
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSolutions = filteredSolutions.slice(startIndex, endIndex);

    const response: PaginatedResponse<Solution> = {
      success: true,
      data: paginatedSolutions,
      pagination: {
        total: filteredSolutions.length,
        page,
        limit,
        totalPages: Math.ceil(filteredSolutions.length / limit),
      },
    };

    return NextResponse.json(response);
  }
});

export const POST = withErrorHandling(async () => {
  throw new ValidationError('POST method not implemented yet');
});