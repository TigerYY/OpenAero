import { NextResponse } from 'next/server';

import { PaginatedResponse, Solution } from '@/types';
import { withErrorHandling, ValidationError } from '@/lib/error-handler';

// 模拟数据，避免动态服务器使用
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
    status: 'PENDING_REVIEW',
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
    averageRating: 0,
    reviewCount: 0
  }
];

export const GET = withErrorHandling(async () => {
  const response: PaginatedResponse<Solution> = {
    success: true,
    data: mockSolutions,
    pagination: {
      total: mockSolutions.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  };

  return NextResponse.json(response);
});

export const POST = withErrorHandling(async () => {
  throw new ValidationError('POST method not implemented yet');
});