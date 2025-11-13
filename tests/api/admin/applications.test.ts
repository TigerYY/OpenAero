/**
 * 管理员申请API路由测试
 * 测试重构后使用统一响应函数的API路由
 */

import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/admin/applications/route';
import { requireAdminAuth } from '@/lib/api-helpers';

// Mock api-helpers
jest.mock('@/lib/api-helpers', () => {
  const actual = jest.requireActual('@/lib/api-helpers');
  return {
    ...actual,
    requireAdminAuth: jest.fn(),
  };
});

const mockRequireAdminAuth = requireAdminAuth as jest.MockedFunction<typeof requireAdminAuth>;

describe('/api/admin/applications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return paginated applications using unified response format', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications?page=1&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.total).toBeGreaterThanOrEqual(0);
      expect(data.pagination.totalPages).toBeGreaterThanOrEqual(0);
    });

    it('should filter by status', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications?status=pending');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // 所有返回的申请状态应该是pending
      if (data.data && data.data.length > 0) {
        data.data.forEach((app: { status: string }) => {
          expect(app.status).toBe('pending');
        });
      }
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: false,
        response: new Response(JSON.stringify({ success: false, error: '未授权访问' }), { status: 401 }),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: false,
        response: new Response(JSON.stringify({ success: false, error: '权限不足，需要管理员权限' }), { status: 403 }),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT', () => {
    it('should approve application using unified success response', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: '1',
          action: 'approve',
          notes: 'Approved',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.application).toBeDefined();
      expect(data.data.application.status).toBe('approved');
      expect(data.message).toContain('批准');
    });

    it('should reject application using unified success response', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: '1',
          action: 'reject',
          notes: 'Rejected',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.application.status).toBe('rejected');
      expect(data.message).toContain('拒绝');
    });

    it('should return 400 for invalid parameters using unified error response', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: '1',
          action: 'invalid',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return 404 for non-existent application', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: 'non-existent',
          action: 'approve',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE', () => {
    it('should delete application using unified success response', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications?id=1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.deletedApplication).toBeDefined();
      expect(data.message).toBe('申请已删除');
    });

    it('should return 400 for missing application ID', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return 404 for non-existent application', async () => {
      mockRequireAdminAuth.mockResolvedValue({
        success: true,
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/applications?id=non-existent', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});

