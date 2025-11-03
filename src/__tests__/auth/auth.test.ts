import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hashPassword, verifyPassword } from '@/backend/auth/auth.service';
import { authenticateToken, requireRole } from '@/backend/auth/auth.middleware';
import { NextRequest } from 'next/server';

describe('认证服务测试', () => {
  describe('密码哈希和验证', () => {
    it('应该正确哈希和验证密码', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
      
      const isValid = await verifyPassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it('应该拒绝错误的密码', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hashed = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hashed);
      expect(isValid).toBe(false);
    });

    it('应该处理空密码', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });
  });

  describe('JWT认证中间件', () => {
    let mockRequest: Partial<NextRequest>;

    beforeEach(() => {
      mockRequest = {
        headers: new Headers(),
      };
    });

    it('应该拒绝没有token的请求', async () => {
      const result = await authenticateToken(mockRequest as NextRequest);
      expect(result).toBeDefined();
      expect(result?.status).toBe(401);
    });

    it('应该拒绝无效的token格式', async () => {
      mockRequest.headers?.set('Authorization', 'InvalidToken');
      const result = await authenticateToken(mockRequest as NextRequest);
      expect(result).toBeDefined();
      expect(result?.status).toBe(401);
    });

    it('应该拒绝过期的token', async () => {
      // 模拟一个过期的token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      mockRequest.headers?.set('Authorization', `Bearer ${expiredToken}`);
      
      const result = await authenticateToken(mockRequest as NextRequest);
      expect(result).toBeDefined();
      expect(result?.status).toBe(401);
    });
  });

  describe('权限检查中间件', () => {
    it('应该允许具有足够权限的用户', () => {
      const mockUser = { role: 'ADMIN' };
      const middleware = requireRole(['ADMIN', 'CREATOR']);
      
      expect(() => {
        middleware(mockUser);
      }).not.toThrow();
    });

    it('应该拒绝权限不足的用户', () => {
      const mockUser = { role: 'CUSTOMER' };
      const middleware = requireRole(['ADMIN']);
      
      expect(() => {
        middleware(mockUser);
      }).toThrow('权限不足');
    });

    it('应该处理空用户角色', () => {
      const mockUser = { role: '' };
      const middleware = requireRole(['ADMIN']);
      
      expect(() => {
        middleware(mockUser);
      }).toThrow('权限不足');
    });
  });
});

describe('认证API端点测试', () => {
  describe('用户注册', () => {
    it('应该成功注册新用户', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(userData.email);
    });

    it('应该拒绝重复邮箱注册', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      // 第一次注册
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      // 第二次注册相同邮箱
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('已注册');
    });

    it('应该验证密码强度', async () => {
      const weakPasswordData = {
        email: 'weak@example.com',
        password: '123', // 弱密码
        firstName: 'Weak',
        lastName: 'User'
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weakPasswordData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('密码');
    });
  });

  describe('用户登录', () => {
    beforeEach(async () => {
      // 注册测试用户
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'TestPassword123!',
          firstName: 'Login',
          lastName: 'User'
        }),
      });
    });

    it('应该成功登录', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'TestPassword123!'
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });

    it('应该拒绝错误的密码', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'WrongPassword'
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('密码');
    });

    it('应该拒绝不存在的用户', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('用户');
    });
  });

  describe('会话管理', () => {
    let accessToken: string;

    beforeEach(async () => {
      // 注册并登录用户
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'session@example.com',
          password: 'TestPassword123!',
          firstName: 'Session',
          lastName: 'User'
        }),
      });

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'session@example.com',
          password: 'TestPassword123!'
        }),
      });

      const loginData = await loginResponse.json();
      accessToken = loginData.accessToken;
    });

    it('应该验证有效会话', async () => {
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.email).toBe('session@example.com');
    });

    it('应该拒绝无效会话', async () => {
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': 'Bearer invalid_token',
        },
      });

      expect(response.status).toBe(401);
    });

    it('应该刷新访问令牌', async () => {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.accessToken).toBeDefined();
      expect(data.accessToken).not.toBe(accessToken);
    });
  });
});

describe('管理员功能测试', () => {
  let adminToken: string;

  beforeEach(async () => {
    // 创建管理员用户并登录
    // 注意：这需要预先在数据库中设置管理员用户
    const loginResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@openaero.com',
        password: 'AdminPassword123!'
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      adminToken = loginData.accessToken;
    }
  });

  it('应该获取用户列表', async () => {
    const response = await fetch('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.users).toBeDefined();
    expect(Array.isArray(data.users)).toBe(true);
  });

  it('应该拒绝非管理员访问', async () => {
    // 使用普通用户token尝试访问管理员接口
    const regularUserResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'regular@example.com',
        password: 'TestPassword123!'
      }),
    });

    if (regularUserResponse.ok) {
      const regularData = await regularUserResponse.json();
      const regularToken = regularData.accessToken;

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${regularToken}`,
        },
      });

      expect(response.status).toBe(403);
    }
  });

  it('应该管理用户权限', async () => {
    const userData = {
      email: 'testuser@example.com',
      role: 'CREATOR'
    };

    const response = await fetch('/api/admin/users/some-user-id/role', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(userData),
    });

    // 注意：这个测试需要有效的用户ID
    expect(response.status).toBe(200);
  });
});

describe('安全功能测试', () => {
  describe('速率限制', () => {
    it('应该限制频繁的登录尝试', async () => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'WrongPassword'
      };

      // 连续多次登录尝试
      const promises = Array.from({ length: 10 }, () =>
        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData),
        })
      );

      const responses = await Promise.all(promises);
      
      // 应该有一些请求被限制
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('输入验证', () => {
    it('应该拒绝SQL注入尝试', async () => {
      const maliciousData = {
        email: "test'; DROP TABLE users; --",
        password: 'TestPassword123!'
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      });

      // 应该被输入验证拦截
      expect(response.status).toBe(400);
    });

    it('应该拒绝XSS攻击尝试', async () => {
      const xssData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: '<script>alert("XSS")</script>'
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xssData),
      });

      // 应该被输入验证拦截或安全处理
      expect(response.status).toBe(400);
    });
  });
});