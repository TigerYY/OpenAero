/**
 * API辅助函数单元测试
 * 测试统一响应函数和管理员权限验证
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getRequestIp,
  getRequestUserAgent,
  logAuditAction,
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createPaginatedResponse,
  withErrorHandler,
} from '../api-helpers';
import { AuthService } from '../auth/auth-service';
import { authenticateRequest } from '../auth-helpers';

// Mock依赖
jest.mock('../auth/auth-service', () => ({
  AuthService: {
    logAudit: jest.fn(),
  },
}));

jest.mock('../auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;

describe('API Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRequestIp', () => {
    it('应该从x-forwarded-for头提取IP', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      const ip = getRequestIp(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('应该从x-real-ip头提取IP', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      });

      const ip = getRequestIp(request);
      expect(ip).toBe('192.168.1.2');
    });

    it('应该在没有IP头时返回默认值', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'));

      const ip = getRequestIp(request);
      expect(ip).toBe('0.0.0.0');
    });

    it('应该优先使用x-forwarded-for', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      });

      const ip = getRequestIp(request);
      expect(ip).toBe('192.168.1.1');
    });
  });

  describe('getRequestUserAgent', () => {
    it('应该从user-agent头提取User Agent', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      });

      const ua = getRequestUserAgent(request);
      expect(ua).toBe('Mozilla/5.0');
    });

    it('应该在没有user-agent头时返回Unknown', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'));

      const ua = getRequestUserAgent(request);
      expect(ua).toBe('Unknown');
    });
  });

  describe('createSuccessResponse', () => {
    it('应该创建成功响应', () => {
      const data = { id: '1', name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.status).toBe(200);
      // 注意：NextResponse.json返回的是Response对象，需要await json()才能获取数据
    });

    it('应该包含可选的消息', () => {
      const data = { id: '1' };
      const response = createSuccessResponse(data, '操作成功');

      expect(response.status).toBe(200);
    });

    it('应该支持自定义状态码', () => {
      const data = { id: '1' };
      const response = createSuccessResponse(data, '创建成功', 201);

      expect(response.status).toBe(201);
    });

    it('应该正确设置响应体', async () => {
      const data = { id: '1', name: 'Test' };
      const response = createSuccessResponse(data, '操作成功');
      const json = await response.json();

      expect(json).toEqual({
        success: true,
        data: { id: '1', name: 'Test' },
        message: '操作成功',
      });
    });
  });

  describe('createErrorResponse', () => {
    it('应该从字符串创建错误响应', async () => {
      const response = createErrorResponse('操作失败', 500);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toEqual({
        success: false,
        error: '操作失败',
        data: null,
      });
    });

    it('应该从Error对象创建错误响应', async () => {
      const error = new Error('操作失败');
      const response = createErrorResponse(error, 500);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toEqual({
        success: false,
        error: '操作失败',
        data: null,
      });
    });

    it('应该包含错误详情', async () => {
      const response = createErrorResponse('操作失败', 500, { field: 'email' });
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('操作失败');
      expect((json as ApiResponse<null> & { details: unknown }).details).toEqual({ field: 'email' });
    });

    it('应该使用默认状态码500', async () => {
      const response = createErrorResponse('操作失败');
      expect(response.status).toBe(500);
    });
  });

  describe('createValidationErrorResponse', () => {
    it('应该从Zod错误创建验证错误响应', async () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const result = schema.safeParse({ email: 'invalid', password: '123' });
      if (!result.success) {
        const response = createValidationErrorResponse(result.error);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toBe('验证失败');
        expect(json.details).toBeDefined();
      }
    });

    it('应该从字段错误对象创建验证错误响应', async () => {
      const errors = {
        email: ['邮箱格式无效'],
        password: ['密码长度不足'],
      };

      const response = createValidationErrorResponse(errors);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('验证失败');
      expect(json.details).toEqual(errors);
    });
  });

  describe('createPaginatedResponse', () => {
    it('应该创建分页响应', async () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = createPaginatedResponse(data, 1, 10, 20, '获取成功');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({
        success: true,
        data: [{ id: '1' }, { id: '2' }],
        message: '获取成功',
        pagination: {
          page: 1,
          limit: 10,
          total: 20,
          totalPages: 2,
        },
      });
    });

    it('应该正确计算总页数', async () => {
      const data = [{ id: '1' }];
      const response = createPaginatedResponse(data, 1, 10, 25);
      const json = await response.json();

      expect(json.pagination.totalPages).toBe(3); // Math.ceil(25/10) = 3
    });

    it('应该支持空数据', async () => {
      const response = createPaginatedResponse([], 1, 10, 0);
      const json = await response.json();

      expect(json.data).toEqual([]);
      expect(json.pagination.total).toBe(0);
      expect(json.pagination.totalPages).toBe(0);
    });
  });

  describe('requireAdminAuth', () => {
    it('应该成功验证管理员权限', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/admin/test'), {
        headers: {
          authorization: 'Bearer token',
        },
      });

      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: {
          id: 'user-1',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      });

      const result = await requireAdminAuth(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('user-1');
        expect(result.user.role).toBe('ADMIN');
      }
    });

    it('应该拒绝未认证的请求', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/admin/test'));

      mockAuthenticateRequest.mockResolvedValue({
        success: false,
        error: NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 }),
      });

      const result = await requireAdminAuth(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });

    it('应该拒绝非管理员用户', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/admin/test'), {
        headers: {
          authorization: 'Bearer token',
        },
      });

      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          role: 'USER',
        },
      });

      const result = await requireAdminAuth(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
      }
    });
  });

  describe('logAuditAction', () => {
    it('应该记录审计日志', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
      });

      mockAuthService.logAudit.mockResolvedValue(undefined);

      await logAuditAction(request, {
        userId: 'user-1',
        action: 'TEST_ACTION',
        resource: 'test',
        resourceId: 'resource-1',
        metadata: { key: 'value' },
      });

      expect(mockAuthService.logAudit).toHaveBeenCalledWith({
        user_id: 'user-1',
        action: 'TEST_ACTION',
        resource: 'test',
        resource_id: 'resource-1',
        old_value: undefined,
        new_value: undefined,
        metadata: { key: 'value' },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        success: true,
        error_message: undefined,
      });
    });

    it('应该使用默认值', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'));

      mockAuthService.logAudit.mockResolvedValue(undefined);

      await logAuditAction(request, {
        action: 'TEST_ACTION',
        resource: 'test',
      });

      expect(mockAuthService.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '0.0.0.0',
          user_agent: 'Unknown',
          success: true,
        })
      );
    });
  });

  describe('withErrorHandler', () => {
    it('应该处理成功的情况', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true, data: 'test' })
      );

      const wrappedHandler = withErrorHandler(handler, '处理失败');
      // 使用URL对象而不是字符串来避免Request mock冲突
      const request = new NextRequest(new URL('http://localhost:3000/api/test'));

      const result = await wrappedHandler(request);

      expect(handler).toHaveBeenCalledWith(request);
      expect(result.status).toBe(200);
    });

    it('应该捕获并处理错误', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('处理失败'));

      const wrappedHandler = withErrorHandler(handler, '自定义错误消息');
      const request = new NextRequest(new URL('http://localhost:3000/api/test'));

      const result = await wrappedHandler(request);
      const json = await result.json();

      expect(result.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('自定义错误消息');
    });

    it('应该处理Zod验证错误', async () => {
      const handler = jest.fn().mockRejectedValue(
        new z.ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'number',
            path: ['email'],
            message: 'Expected string',
          },
        ])
      );

      const wrappedHandler = withErrorHandler(handler);
      const request = new NextRequest(new URL('http://localhost:3000/api/test'));

      const result = await wrappedHandler(request);
      const json = await result.json();

      expect(result.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('验证失败');
      expect(json.details).toBeDefined();
    });

    it('应该使用错误消息作为默认消息', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('原始错误消息'));

      const wrappedHandler = withErrorHandler(handler);
      const request = new NextRequest(new URL('http://localhost:3000/api/test'));

      const result = await wrappedHandler(request);
      const json = await result.json();

      expect(json.error).toBe('原始错误消息');
    });
  });
});

