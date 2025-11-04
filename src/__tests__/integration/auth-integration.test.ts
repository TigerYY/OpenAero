import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { prisma } from '@/lib/prisma';

// 集成测试：认证系统端到端测试
describe('认证系统集成测试', () => {
  beforeEach(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test.integration',
        },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        userEmail: {
          contains: 'test.integration',
        },
      },
    });
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test.integration',
        },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        userEmail: {
          contains: 'test.integration',
        },
      },
    });
  });

  describe('完整用户注册流程', () => {
    it('应该完成完整的用户注册、验证、登录流程', async () => {
      const testUser = {
        email: 'test.integration@example.com',
        password: 'IntegrationTest123!',
        firstName: 'Integration',
        lastName: 'Test'
      };

      // 1. 用户注册
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      expect(registerResponse.status).toBe(201);
      const registerData = await registerResponse.json();
      expect(registerData.success).toBe(true);
      expect(registerData.user.email).toBe(testUser.email);
      expect(registerData.user.emailVerified).toBe(false);

      // 2. 验证邮箱验证码已发送（通过审计日志验证）
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userEmail: testUser.email,
          action: 'SEND_VERIFICATION_EMAIL',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);

      // 3. 模拟邮箱验证
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user).toBeDefined();
      expect(user?.emailVerified).toBe(false);

      // 获取验证码（在真实环境中从邮件中获取）
      const verificationCode = await prisma.emailVerification.findFirst({
        where: { userId: user?.id },
      });

      expect(verificationCode).toBeDefined();

      // 4. 验证邮箱
      const verifyResponse = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          code: verificationCode?.code,
        }),
      });

      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      expect(verifyData.success).toBe(true);

      // 5. 验证用户状态已更新
      const verifiedUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(verifiedUser?.emailVerified).toBe(true);

      // 6. 用户登录
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      expect(loginResponse.status).toBe(200);
      const loginData = await loginResponse.json();
      expect(loginData.success).toBe(true);
      expect(loginData.accessToken).toBeDefined();
      expect(loginData.refreshToken).toBeDefined();

      // 7. 验证会话
      const sessionResponse = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${loginData.accessToken}`,
        },
      });

      expect(sessionResponse.status).toBe(200);
      const sessionData = await sessionResponse.json();
      expect(sessionData.user.email).toBe(testUser.email);
    });
  });

  describe('密码重置流程', () => {
    it('应该完成密码重置流程', async () => {
      const testUser = {
        email: 'reset.integration@example.com',
        password: 'OriginalPassword123!',
        firstName: 'Reset',
        lastName: 'Test'
      };

      // 1. 注册用户
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      // 2. 请求密码重置
      const forgotResponse = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
        }),
      });

      expect(forgotResponse.status).toBe(200);

      // 3. 验证重置邮件已发送
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userEmail: testUser.email,
          action: 'SEND_PASSWORD_RESET_EMAIL',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);

      // 4. 获取重置令牌（在真实环境中从邮件中获取）
      const resetToken = await prisma.passwordReset.findFirst({
        where: { email: testUser.email },
      });

      expect(resetToken).toBeDefined();

      // 5. 重置密码
      const newPassword = 'NewPassword456!';
      const resetResponse = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken?.token,
          password: newPassword,
        }),
      });

      expect(resetResponse.status).toBe(200);

      // 6. 使用新密码登录
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: newPassword,
        }),
      });

      expect(loginResponse.status).toBe(200);

      // 7. 验证旧密码不再有效
      const oldPasswordLogin = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      expect(oldPasswordLogin.status).toBe(401);
    });
  });

  describe('管理员功能集成测试', () => {
    let adminToken: string;
    let testUser: any;

    beforeEach(async () => {
      // 创建测试用户
      testUser = {
        email: 'admin.integration@example.com',
        password: 'AdminIntegration123!',
        firstName: 'Admin',
        lastName: 'Integration'
      };

      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      // 获取管理员token（需要预先设置管理员账户）
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@openaero.com',
          password: 'AdminPassword123!',
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        adminToken = loginData.accessToken;
      }
    });

    it('应该完成用户管理操作', async () => {
      // 1. 获取用户列表
      const usersResponse = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(usersResponse.status).toBe(200);
      const usersData = await usersResponse.json();
      expect(Array.isArray(usersData.users)).toBe(true);

      // 2. 查找测试用户
      const targetUser = usersData.users.find((u: any) => u.email === testUser.email);
      expect(targetUser).toBeDefined();

      // 3. 更新用户信息
      const updateResponse = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          firstName: 'Updated',
          lastName: 'User',
          role: 'CREATOR',
        }),
      });

      expect(updateResponse.status).toBe(200);

      // 4. 验证用户信息已更新
      const updatedUserResponse = await fetch(`/api/admin/users/${targetUser.id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(updatedUserResponse.status).toBe(200);
      const updatedUser = await updatedUserResponse.json();
      expect(updatedUser.user.firstName).toBe('Updated');
      expect(updatedUser.user.role).toBe('CREATOR');

      // 5. 验证审计日志记录
      const adminLogs = await prisma.auditLog.findMany({
        where: {
          userEmail: 'admin@openaero.com',
          resourceType: 'user',
          resourceId: targetUser.id,
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
      });

      expect(adminLogs.length).toBeGreaterThan(0);
      expect(adminLogs.some(log => log.action === 'UPDATE_USER')).toBe(true);
    });

    it('应该完成权限管理操作', async () => {
      // 1. 获取权限列表
      const permissionsResponse = await fetch('/api/admin/permissions', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(permissionsResponse.status).toBe(200);
      const permissionsData = await permissionsResponse.json();
      expect(Array.isArray(permissionsData.permissions)).toBe(true);

      // 2. 创建新权限
      const newPermission = {
        name: '测试权限',
        description: '集成测试创建的权限',
        resource: 'test',
        action: 'create',
        level: 50,
      };

      const createPermissionResponse = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(newPermission),
      });

      expect(createPermissionResponse.status).toBe(200);

      // 3. 验证权限已创建
      const createdPermission = await createPermissionResponse.json();
      expect(createdPermission.permission.name).toBe(newPermission.name);

      // 4. 删除权限
      const deleteResponse = await fetch(`/api/admin/permissions/${createdPermission.permission.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('安全功能集成测试', () => {
    it('应该验证速率限制功能', async () => {
      const loginAttempts = Array.from({ length: 15 }, (_, i) => ({
        email: `ratelimit${i}@example.com`,
        password: 'WrongPassword',
      }));

      const responses = await Promise.all(
        loginAttempts.map(attempt =>
          fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attempt),
          })
        )
      );

      // 检查是否有请求被限制
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // 验证审计日志记录了速率限制事件
      const rateLimitLogs = await prisma.auditLog.findMany({
        where: {
          action: 'RATE_LIMIT_EXCEEDED',
        },
        take: 5,
      });

      expect(rateLimitLogs.length).toBeGreaterThan(0);
    });

    it('应该验证输入验证功能', async () => {
      // 测试SQL注入防护
      const sqlInjectionAttempt = {
        email: "test' OR '1'='1",
        password: 'password',
      };

      const sqlResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sqlInjectionAttempt),
      });

      // 应该被输入验证拦截
      expect(sqlResponse.status).toBe(400);

      // 测试XSS防护
      const xssAttempt = {
        email: 'test@example.com',
        password: 'password',
        firstName: '<script>alert("XSS")</script>',
      };

      const xssResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xssAttempt),
      });

      // 应该被输入验证拦截
      expect(xssResponse.status).toBe(400);
    });

    it('应该验证会话安全', async () => {
      // 创建测试用户
      const testUser = {
        email: 'session.security@example.com',
        password: 'SessionSecurity123!',
        firstName: 'Session',
        lastName: 'Security'
      };

      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      // 登录获取token
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const loginData = await loginResponse.json();
      const accessToken = loginData.accessToken;

      // 验证token有效性
      const sessionResponse = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(sessionResponse.status).toBe(200);

      // 模拟token过期（通过修改token）
      const expiredToken = accessToken + 'invalid';
      const expiredResponse = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      expect(expiredResponse.status).toBe(401);

      // 验证刷新token功能
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(refreshResponse.status).toBe(200);
      const refreshData = await refreshResponse.json();
      expect(refreshData.accessToken).toBeDefined();

      // 使用新token验证会话
      const newSessionResponse = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${refreshData.accessToken}`,
        },
      });

      expect(newSessionResponse.status).toBe(200);
    });
  });

  describe('审计日志集成测试', () => {
    it('应该记录所有关键操作', async () => {
      const testUser = {
        email: 'audit.integration@example.com',
        password: 'AuditIntegration123!',
        firstName: 'Audit',
        lastName: 'Integration'
      };

      // 执行一系列操作
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      // 验证审计日志记录
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userEmail: testUser.email,
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      });

      expect(auditLogs.length).toBeGreaterThan(0);

      // 检查关键操作是否被记录
      const recordedActions = auditLogs.map(log => log.action);
      expect(recordedActions).toContain('USER_REGISTER');
      expect(recordedActions).toContain('USER_LOGIN');

      // 验证日志包含必要信息
      const registerLog = auditLogs.find(log => log.action === 'USER_REGISTER');
      expect(registerLog).toBeDefined();
      expect(registerLog?.userEmail).toBe(testUser.email);
      expect(registerLog?.ipAddress).toBeDefined();
      expect(registerLog?.userAgent).toBeDefined();
    });
  });
});