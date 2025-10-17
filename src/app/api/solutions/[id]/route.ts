import { NextResponse } from 'next/server';

import { ApiResponse, Solution } from '@/types';
import { withErrorHandling, NotFoundError, ValidationError } from '@/lib/error-handler';

// 模拟数据
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

export const GET = withErrorHandling(async (
  request: Request,
  { params }: { params: { id: string } }
) => {
  const { id } = params;
  
  if (!id || typeof id !== 'string') {
    throw new ValidationError('Invalid solution ID');
  }

  const solution = mockSolutions.find(s => s.id === id);
  
  if (!solution) {
    throw new NotFoundError('Solution');
  }

  return NextResponse.json({
    success: true,
    data: solution,
  } as ApiResponse<Solution>);
});

export const PUT = withErrorHandling(async (
  request: Request,
  { params }: { params: { id: string } }
) => {
  const { id } = params;
  
  if (!id || typeof id !== 'string') {
    throw new ValidationError('Invalid solution ID');
  }

  const solution = mockSolutions.find(s => s.id === id);
  
  if (!solution) {
    throw new NotFoundError('Solution');
  }

  // TODO: Implement update logic
  throw new ValidationError('PUT method not implemented yet');
});

export const DELETE = withErrorHandling(async (
  request: Request,
  { params }: { params: { id: string } }
) => {
  const { id } = params;
  
  if (!id || typeof id !== 'string') {
    throw new ValidationError('Invalid solution ID');
  }

  const solution = mockSolutions.find(s => s.id === id);
  
  if (!solution) {
    throw new NotFoundError('Solution');
  }

  // TODO: Implement delete logic
  throw new ValidationError('DELETE method not implemented yet');
});