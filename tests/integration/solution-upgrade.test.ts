/**
 * 方案升级流程集成测试
 * 测试升级API的完整流程
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
import { POST } from '@/app/api/solutions/[id]/upgrade/route';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth-helpers';
import { logAuditAction } from '@/lib/api-helpers';
import { ensureCreatorProfile } from '@/lib/creator-profile-utils';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    solution: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    solutionFile: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/creator-profile-utils', () => ({
  ensureCreatorProfile: jest.fn(),
}));

// Mock Supabase client to avoid environment variable errors
jest.mock('@/lib/auth/supabase-client', () => ({
  createSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}));

jest.mock('@/lib/api-helpers', () => {
  const actual = jest.requireActual('@/lib/api-helpers');
  return {
    ...actual,
    logAuditAction: jest.fn(),
  };
});

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockEnsureCreatorProfile = ensureCreatorProfile as jest.MockedFunction<typeof ensureCreatorProfile>;
const mockLogAuditAction = logAuditAction as jest.MockedFunction<typeof logAuditAction>;

describe('Solution Upgrade Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogAuditAction.mockResolvedValue(undefined);
  });

  describe('POST /api/solutions/[id]/upgrade', () => {
    it('应该成功升级方案（不复制资产和BOM）', async () => {
      const solutionId = 'solution-1';
      const creatorUser = {
        id: 'user-1',
        email: 'creator@example.com',
        roles: ['CREATOR'],
      };

      const mockSourceSolution = {
        id: solutionId,
        title: 'Original Solution',
        description: 'Original description',
        category: 'AGRICULTURE',
        price: 1000,
        features: ['feature1'],
        images: [],
        tags: ['tag1'],
        locale: 'zh-CN',
        specs: {},
        bom: null,
        status: 'PUBLISHED',
        version: 1,
        creator_id: 'creator-1',
        creator: {
          id: 'creator-1',
          user: {
            id: 'user-1',
          },
        },
        files: [],
      };

      const mockCreatorProfile = {
        id: 'creator-1',
        user_id: 'user-1',
      };

      const mockNewSolution = {
        id: 'solution-2',
        title: 'Upgraded Solution',
        status: 'DRAFT',
        version: 1,
        upgraded_from_id: solutionId,
        upgraded_from_version: 1,
        is_upgrade: true,
      };

      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: creatorUser,
      } as any);

      mockPrisma.solution.findUnique.mockResolvedValue(mockSourceSolution as any);
      mockPrisma.solution.count.mockResolvedValue(0);
      mockEnsureCreatorProfile.mockResolvedValue(mockCreatorProfile as any);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          solution: {
            create: jest.fn().mockResolvedValue(mockNewSolution),
          },
          solutionFile: {
            createMany: jest.fn(),
          },
        });
      });

      const request = new NextRequest('http://localhost/api/solutions/solution-1/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Upgraded Solution',
          upgradeAssets: false,
          upgradeBom: false,
        }),
      });

      const response = await POST(request, { params: { id: solutionId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('solution-2');
      expect(data.data.upgradedFromId).toBe(solutionId);
    });

    it('应该成功升级方案（复制资产和BOM）', async () => {
      const solutionId = 'solution-1';
      const creatorUser = {
        id: 'user-1',
        email: 'creator@example.com',
        roles: ['CREATOR'],
      };

      const mockSourceSolution = {
        id: solutionId,
        title: 'Original Solution',
        description: 'Original description',
        category: 'AGRICULTURE',
        price: 1000,
        features: ['feature1'],
        images: [],
        tags: ['tag1'],
        locale: 'zh-CN',
        specs: {},
        bom: { items: [{ name: 'Item 1' }] },
        status: 'PUBLISHED',
        version: 1,
        creator_id: 'creator-1',
        creator: {
          id: 'creator-1',
          user: {
            id: 'user-1',
          },
        },
        files: [
          {
            id: 'file-1',
            filename: 'file1.pdf',
            original_name: 'file1.pdf',
            file_type: 'PDF',
            mime_type: 'application/pdf',
            size: 1024,
            path: '/files/file1.pdf',
            url: 'https://example.com/files/file1.pdf',
            thumbnail_url: null,
            checksum: 'abc123',
            metadata: null,
            description: null,
            status: 'ACTIVE',
            uploaded_by: 'user-1',
          },
        ],
      };

      const mockCreatorProfile = {
        id: 'creator-1',
        user_id: 'user-1',
      };

      const mockNewSolution = {
        id: 'solution-2',
        title: 'Upgraded Solution',
        status: 'DRAFT',
        version: 1,
        upgraded_from_id: solutionId,
        upgraded_from_version: 1,
        is_upgrade: true,
      };

      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: creatorUser,
      } as any);

      mockPrisma.solution.findUnique.mockResolvedValue(mockSourceSolution as any);
      mockPrisma.solution.count.mockResolvedValue(0);
      mockEnsureCreatorProfile.mockResolvedValue(mockCreatorProfile as any);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          solution: {
            create: jest.fn().mockResolvedValue(mockNewSolution),
          },
          solutionFile: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      const request = new NextRequest('http://localhost/api/solutions/solution-1/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Upgraded Solution',
          upgradeAssets: true,
          upgradeBom: true,
        }),
      });

      const response = await POST(request, { params: { id: solutionId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('应该验证升级频率限制', async () => {
      const solutionId = 'solution-1';
      const creatorUser = {
        id: 'user-1',
        email: 'creator@example.com',
        roles: ['CREATOR'],
      };

      const mockSourceSolution = {
        id: solutionId,
        status: 'PUBLISHED',
        creator_id: 'creator-1',
        creator: {
          id: 'creator-1',
          user: {
            id: 'user-1',
          },
        },
        files: [],
      };

      const mockCreatorProfile = {
        id: 'creator-1',
        user_id: 'user-1',
      };

      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: creatorUser,
      } as any);

      mockPrisma.solution.findUnique.mockResolvedValue(mockSourceSolution as any);
      mockPrisma.solution.count.mockResolvedValue(5); // 已达到限制
      mockEnsureCreatorProfile.mockResolvedValue(mockCreatorProfile as any);

      const request = new NextRequest('http://localhost/api/solutions/solution-1/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Upgraded Solution',
        }),
      });

      const response = await POST(request, { params: { id: solutionId } });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain('最多只能升级 5 个方案');
    });

    it('应该拒绝非创作者升级他人的未发布方案', async () => {
      const solutionId = 'solution-1';
      const creatorUser = {
        id: 'user-2',
        email: 'creator2@example.com',
        roles: ['CREATOR'],
      };

      const mockSourceSolution = {
        id: solutionId,
        status: 'DRAFT',
        creator_id: 'creator-1',
        creator: {
          id: 'creator-1',
          user: {
            id: 'user-1',
          },
        },
        files: [],
      };

      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: creatorUser,
      } as any);

      mockPrisma.solution.findUnique.mockResolvedValue(mockSourceSolution as any);

      const request = new NextRequest('http://localhost/api/solutions/solution-1/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Upgraded Solution',
        }),
      });

      const response = await POST(request, { params: { id: solutionId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('只能升级自己的方案或已发布的方案');
    });
  });
});

