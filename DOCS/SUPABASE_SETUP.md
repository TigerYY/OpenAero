# Supabase 数据库配置文档

## 概述

本文档记录了 OpenAero 项目中 Supabase 数据库的配置步骤和重要注意事项。

## 核心问题与解决方案

### 问题：Service Role 权限不足

**症状**：
- API 能获取 `auth.users` 数据
- 但无法查询 `user_profiles` 表
- 错误：`permission denied for schema public`

**原因**：
Supabase 默认配置下，`service_role` 没有访问 `public` schema 的完整权限。

**解决方案**：

在 Supabase SQL Editor 执行以下 SQL（已保存在 `FIX_PERMISSIONS.sql`）：

```sql
-- 授予 service_role 访问 public schema 的权限
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO service_role;

-- 授予 service_role 访问所有表的权限
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 设置未来表的默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT ALL ON TABLES TO service_role;

-- 授予 authenticated 角色基本权限
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
```

## 数据库架构

### 用户系统

#### 1. auth.users (Supabase Auth 内置表)
- 存储认证信息（邮箱、密码等）
- 由 Supabase Auth 自动管理

#### 2. user_profiles (自定义扩展表)
- 存储用户业务数据（姓名、角色、状态等）
- 通过触发器自动创建

#### 3. 触发器配置

```sql
-- 自动创建 user_profile 的触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    user_id,
    first_name,
    last_name,
    display_name,
    roles,
    permissions,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'User')
    ),
    ARRAY['USER']::"UserRole"[],
    ARRAY[]::text[],
    'ACTIVE'::"UserStatus",
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## RLS (Row Level Security) 配置

**当前策略**：RLS 已禁用

```sql
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
```

**原因**：
- 简化开发流程
- 权限控制在应用层实现
- 避免复杂的 RLS 策略配置

**未来**：
如需启用 RLS，需要配置：
1. Service Role 绕过策略
2. 用户查看/更新自己数据的策略
3. 管理员相关策略

## 用户注册流程

1. 用户在前端填写注册表单
2. 调用 `AuthService.register()` 
3. Supabase 创建 `auth.users` 记录
4. **触发器自动创建** `user_profiles` 记录
5. 发送验证邮件
6. 用户点击邮件链接验证
7. 登录成功

## API 端点

### GET /api/users/me
- 获取当前用户完整信息
- 包含 `auth.users` 和 `user_profiles` 数据
- 如果 profile 不存在，自动创建

### PATCH /api/users/me
- 更新用户资料
- 支持更新：姓名、简介、头像、电话等

## 常见问题

### Q: 为什么禁用了 RLS？
A: 简化开发，权限由应用层（API 路由）控制。生产环境可考虑启用。

### Q: 如何添加新用户字段？
A: 
1. 更新 Prisma schema
2. 运行 `npx prisma db push`
3. 更新触发器函数（如需要）
4. 更新 TypeScript 类型定义

### Q: Service Role Key 在哪里配置？
A: 
- 环境变量：`SUPABASE_SERVICE_ROLE_KEY`
- 从 Supabase Dashboard → Settings → API 获取

## 部署检查清单

- [ ] 执行 `FIX_PERMISSIONS.sql`
- [ ] 创建 `handle_new_user` 触发器
- [ ] 验证 Service Role Key 配置正确
- [ ] 测试用户注册流程
- [ ] 测试 `/api/users/me` 端点
- [ ] 验证 profile 页面正常显示

## 参考文件

- `FIX_PERMISSIONS.sql` - 权限配置脚本
- `src/lib/auth/auth-service.ts` - 认证服务
- `src/app/api/users/me/route.ts` - 用户信息 API
- `prisma/schema.prisma` - 数据库 Schema

---

**最后更新**：2025-11-17
**维护者**：OpenAero Team
