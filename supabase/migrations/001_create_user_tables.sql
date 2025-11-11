-- ============================================
-- OpenAero 用户系统数据表
-- 使用 Supabase Auth 作为主认证系统
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 用户角色枚举
-- ============================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'USER',           -- 普通用户
    'CREATOR',        -- 创作者
    'REVIEWER',       -- 审核员
    'FACTORY_MANAGER',-- 工厂管理员
    'ADMIN',          -- 管理员
    'SUPER_ADMIN'     -- 超级管理员
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM (
    'ACTIVE',         -- 活跃
    'INACTIVE',       -- 未激活
    'SUSPENDED',      -- 暂停
    'DELETED'         -- 已删除
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM (
    'PENDING',        -- 待审核
    'APPROVED',       -- 已通过
    'REJECTED',       -- 已拒绝
    'EXPIRED'         -- 已过期
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE address_type AS ENUM (
    'SHIPPING',       -- 收货地址
    'BILLING',        -- 账单地址
    'BOTH'            -- 两者都是
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 用户扩展资料表 (public.user_profiles)
-- 与 auth.users 通过 user_id 关联
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- 个人资料
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(200),
  avatar TEXT,
  bio TEXT,
  
  -- 角色与权限
  role user_role NOT NULL DEFAULT 'USER',
  permissions TEXT[] DEFAULT '{}',
  
  -- 状态管理
  status user_status NOT NULL DEFAULT 'ACTIVE',
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT user_profiles_user_id_key UNIQUE(user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);

-- ============================================
-- 创作者资料表 (public.creator_profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- 创作者信息
  company_name VARCHAR(200),
  business_license TEXT,
  id_card TEXT,
  tax_number VARCHAR(100),
  
  -- 认证状态
  verification_status verification_status DEFAULT 'PENDING',
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- 统计信息
  total_solutions INTEGER DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  rating DECIMAL(3, 2),
  
  -- 银行账户信息
  bank_name VARCHAR(200),
  bank_account VARCHAR(100),
  bank_account_name VARCHAR(200),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT creator_profiles_user_id_key UNIQUE(user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON public.creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_status ON public.creator_profiles(verification_status);

-- ============================================
-- 用户地址表 (public.user_addresses)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 地址信息
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  province VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  postal_code VARCHAR(20),
  
  -- 地址类型
  is_default BOOLEAN DEFAULT FALSE,
  type address_type DEFAULT 'SHIPPING',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON public.user_addresses(is_default);

-- ============================================
-- 用户会话日志表 (public.user_sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 会话信息
  session_token TEXT UNIQUE NOT NULL,
  device TEXT,
  browser TEXT,
  os TEXT,
  ip_address INET NOT NULL,
  location TEXT,
  
  -- 时间信息
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- 会话状态
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);

-- ============================================
-- 审计日志表 (public.audit_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 操作信息
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id TEXT,
  
  -- 操作详情
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  
  -- 请求信息
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  
  -- 结果
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================
-- RLS (Row Level Security) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- user_profiles 策略
DROP POLICY IF EXISTS "用户可以查看自己的资料" ON public.user_profiles;
CREATE POLICY "用户可以查看自己的资料" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以更新自己的资料" ON public.user_profiles;
CREATE POLICY "用户可以更新自己的资料" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "管理员可以查看所有用户资料" ON public.user_profiles;
CREATE POLICY "管理员可以查看所有用户资料" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- creator_profiles 策略
DROP POLICY IF EXISTS "创作者可以查看自己的资料" ON public.creator_profiles;
CREATE POLICY "创作者可以查看自己的资料" ON public.creator_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "创作者可以更新自己的资料" ON public.creator_profiles;
CREATE POLICY "创作者可以更新自己的资料" ON public.creator_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- user_addresses 策略
DROP POLICY IF EXISTS "用户可以管理自己的地址" ON public.user_addresses;
CREATE POLICY "用户可以管理自己的地址" ON public.user_addresses
  FOR ALL USING (auth.uid() = user_id);

-- user_sessions 策略
DROP POLICY IF EXISTS "用户可以查看自己的会话" ON public.user_sessions;
CREATE POLICY "用户可以查看自己的会话" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- audit_logs 策略 (仅管理员可查看)
DROP POLICY IF EXISTS "管理员可以查看审计日志" ON public.audit_logs;
CREATE POLICY "管理员可以查看审计日志" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- 触发器函数
-- ============================================

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表添加 updated_at 触发器
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_creator_profiles_updated_at ON public.creator_profiles;
CREATE TRIGGER update_creator_profiles_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER update_user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON public.user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 自动创建用户资料
-- 当新用户在 auth.users 中注册时，自动在 user_profiles 中创建记录
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role, status)
  VALUES (NEW.id, 'USER', 'ACTIVE');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器 (如果不存在)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 注释
-- ============================================
COMMENT ON TABLE public.user_profiles IS '用户扩展资料表，存储 Supabase Auth 之外的用户信息';
COMMENT ON TABLE public.creator_profiles IS '创作者认证资料表';
COMMENT ON TABLE public.user_addresses IS '用户地址管理表';
COMMENT ON TABLE public.user_sessions IS '用户会话日志表';
COMMENT ON TABLE public.audit_logs IS '系统审计日志表';
