/**
 * 方案优化流程集成测试
 * 测试优化API的完整流程
 */

// Set environment variables BEFORE any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock Supabase client BEFORE importing modules that use it
jest.mock('@/lib/auth/supabase-client', () => ({
  createSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}));

// Mock NextResponse.json - must be done before any imports
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  const NextResponseClass = actual.NextResponse;
  
  // Create a mock that extends the actual NextResponse
  class MockNextResponse extends NextResponseClass {
    static json(body: any, init?: { status?: number; headers?: HeadersInit }) {
      const response = new NextResponseClass(JSON.stringify(body), {
        status: init?.status || 200,
        headers: {
          'content-type': 'application/json',
          ...init?.headers,
        },
      });
      // Add json method to response instance
      (response as any).json = async () => body;
      return response;
    }
  }
  
  return {
    ...actual,
    NextResponse: MockNextResponse,
  };
});

import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/admin/solutions/[id]/optimize/route';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/api-helpers';
import { logAuditAction } from '@/lib/api-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    solution: {
      findUnique: jest.fn(),
    },
    solutionPublishing: {
      upsert: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/api-helpers', () => {
  const actual = jest.requireActual('@/lib/api-helpers');
  return {
    ...actual,
    requireAdminAuth: jest.fn(),
    logAuditAction: jest.fn(),
  };
});

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAdminAuth = requireAdminAuth as jest.MockedFunction<typeof requireAdminAuth>;
const mockLogAuditAction = logAuditAction as jest.MockedFunction<typeof logAuditAction>;

describe('Solution Optimize Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogAuditAction.mockResolvedValue(undefined);
  });

  describe('PUT /api/admin/solutions/[id]/optimize', () => {
    it('应该成功优化方案并创建 SolutionPublishing 记录', async () => {
      const solutionId = 'solution-1';
      const adminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        roles: ['ADMIN'],
      };

      const mockSolution = {
        id: solutionId,
        status: 'APPROVED',
        title: 'Test Solution',
        creator: {
          id: 'creator-1',
        },
        publishing: null,
      };

      const mockPublishing = {
        id: 'publishing-1',
        solution_id: solutionId,
        publish_description: 'Optimized description',
        optimized_at: new Date(),
        optimized_by: adminUser.id,
      };

      const mockUpdatedSolution = {
        ...mockSolution,
        status: 'READY_TO_PUBLISH',
      };

      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: adminUser,
      } as any);

      mockPrisma.solution.findUnique.mockResolvedValue(mockSolution as any);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          solution: {
            update: jest.fn().mockResolvedValue(mockUpdatedSolution),
          },
          solutionPublishing: {
            upsert: jest.fn().mockResolvedValue(mockPublishing),
          },
        });
      });

      const request = new NextRequest('http://localhost/api/admin/solutions/solution-1/optimize', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publishDescription: 'Optimized description',
          isFeatured: true,
        }),
      });

      const response = await PUT(request, { params: { id: solutionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('READY_TO_PUBLISH');
      expect(mockPrisma.solution.findUnique).toHaveBeenCalledWith({
        where: { id: solutionId },
        include: {
          creator: true,
          publishing: true,
        },
      });
    });

    it('应该验证方案状态为 APPROVED', async () => {
      const solutionId = 'solution-1';
      const adminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        roles: ['ADMIN'],
      };

      const mockSolution = {
        id: solutionId,
        status: 'DRAFT',
        title: 'Test Solution',
      };

      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: adminUser,
      } as any);

      mockPrisma.solution.findUnique.mockResolvedValue(mockSolution as any);

      const request = new NextRequest('http://localhost/api/admin/solutions/solution-1/optimize', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publishDescription: 'Test description',
        }),
      });

      const response = await PUT(request, { params: { id: solutionId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('已审核通过');
    });

    it('应该验证商品链接存在性', async () => {
      const solutionId = 'solution-1';
      const adminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        roles: ['ADMIN'],
      };

      const mockSolution = {
        id: solutionId,
        status: 'APPROVED',
        title: 'Test Solution',
        creator: {
          id: 'creator-1',
        },
        publishing: null,
      };

      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: adminUser,
      } as any);

      mockPrisma.solution.findUnique.mockResolvedValue(mockSolution as any);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1' },
      ]);

      const request = new NextRequest('http://localhost/api/admin/solutions/solution-1/optimize', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productLinks: [
            {
              productId: 'product-2',
              productName: 'Product 2',
              productSku: 'SKU-2',
              productUrl: 'https://example.com/product-2',
              relationType: 'REQUIRED',
            },
          ],
        }),
      });

      const response = await PUT(request, { params: { id: solutionId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('商品不存在');
    });

    it('应该更新已存在的 SolutionPublishing 记录', async () => {
      const solutionId = 'solution-1';
      const adminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        roles: ['ADMIN'],
      };

      const mockSolution = {
        id: solutionId,
        status: 'APPROVED',
        title: 'Test Solution',
        creator: {
          id: 'creator-1',
        },
        publishing: {
          id: 'publishing-1',
          solution_id: solutionId,
        },
      };

      const mockUpdatedPublishing = {
        ...mockSolution.publishing,
        publish_description: 'Updated description',
        optimized_at: new Date(),
      };

      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: adminUser,
      } as any);

      mockPrisma.solution.findUnique.mockResolvedValue(mockSolution as any);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          solution: {
            update: jest.fn().mockResolvedValue({
              ...mockSolution,
              status: 'READY_TO_PUBLISH',
            }),
          },
          solutionPublishing: {
            upsert: jest.fn().mockResolvedValue(mockUpdatedPublishing),
          },
        });
      });

      const request = new NextRequest('http://localhost/api/admin/solutions/solution-1/optimize', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publishDescription: 'Updated description',
        }),
      });

      const response = await PUT(request, { params: { id: solutionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

