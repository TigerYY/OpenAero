/**
 * 管理员仪表板API测试
 */
import { NextRequest } from 'next/server';
import { GET as getStats } from '@/app/api/admin/dashboard/stats/route';
import { GET as getCharts } from '@/app/api/admin/dashboard/charts/route';
import { GET as getActivities } from '@/app/api/admin/dashboard/activities/route';
import { GET as getAlerts } from '@/app/api/admin/dashboard/alerts/route';

// Mock认证
jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn().mockResolvedValue({
    success: true,
    user: {
      id: 'test-admin-id',
      roles: ['ADMIN'],
    },
  }),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    solution: {
      count: jest.fn().mockResolvedValue(100),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    userProfile: {
      count: jest.fn().mockResolvedValue(50),
      findMany: jest.fn().mockResolvedValue([]),
    },
    order: {
      count: jest.fn().mockResolvedValue(200),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { total_amount: 10000 } }),
    },
    solutionReview: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock缓存
jest.mock('@/lib/admin/dashboard-cache', () => ({
  dashboardCache: {
    getStats: jest.fn().mockResolvedValue(null),
    setStats: jest.fn(),
    getCharts: jest.fn().mockResolvedValue(null),
    setCharts: jest.fn(),
    getActivities: jest.fn().mockResolvedValue(null),
    setActivities: jest.fn(),
    getAlerts: jest.fn().mockResolvedValue(null),
    setAlerts: jest.fn(),
  },
}));

describe('Admin Dashboard API', () => {
  const createMockRequest = (searchParams: Record<string, string> = {}) => {
    const url = new URL('http://localhost:3000/api/admin/dashboard/stats');
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return {
      nextUrl: url,
    } as unknown as NextRequest;
  };

  describe('GET /api/admin/dashboard/stats', () => {
    it('应该返回统计数据', async () => {
      const request = createMockRequest({ days: '30' });
      const response = await getStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('应该包含缓存头', async () => {
      const request = createMockRequest();
      const response = await getStats(request);

      expect(response.headers.get('X-Cache')).toBeDefined();
    });
  });

  describe('GET /api/admin/dashboard/charts', () => {
    it('应该返回图表数据', async () => {
      const request = createMockRequest({ days: '30' });
      const response = await getCharts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });
  });

  describe('GET /api/admin/dashboard/activities', () => {
    it('应该返回活动流数据', async () => {
      const request = createMockRequest({ page: '1', limit: '20' });
      const response = await getActivities(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.activities).toBeDefined();
      expect(data.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/admin/dashboard/alerts', () => {
    it('应该返回预警数据', async () => {
      const request = createMockRequest({ timeRange: '30' });
      const response = await getAlerts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.alerts).toBeDefined();
      expect(data.data.summary).toBeDefined();
    });
  });
});

