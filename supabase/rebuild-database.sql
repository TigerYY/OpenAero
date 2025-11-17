
-- ============================================
-- OpenAero 数据库重建脚本
-- 生成时间: 2025-11-16T14:01:12.496Z
-- ⚠️ 此脚本会删除所有现有数据！
-- ============================================


    -- 删除所有表（级联删除）
    DROP TABLE IF EXISTS public.notifications CASCADE;
    DROP TABLE IF EXISTS public.product_reviews CASCADE;
    DROP TABLE IF EXISTS public.order_items CASCADE;
    DROP TABLE IF EXISTS public.cart_items CASCADE;
    DROP TABLE IF EXISTS public.carts CASCADE;
    DROP TABLE IF EXISTS public.product_inventory CASCADE;
    DROP TABLE IF EXISTS public.products CASCADE;
    DROP TABLE IF EXISTS public.product_categories CASCADE;
    DROP TABLE IF EXISTS public.sample_orders CASCADE;
    DROP TABLE IF EXISTS public.factories CASCADE;
    DROP TABLE IF EXISTS public.favorites CASCADE;
    DROP TABLE IF EXISTS public.reviews CASCADE;
    DROP TABLE IF EXISTS public.revenue_shares CASCADE;
    DROP TABLE IF EXISTS public.payment_events CASCADE;
    DROP TABLE IF EXISTS public.payment_transactions CASCADE;
    DROP TABLE IF EXISTS public.order_solutions CASCADE;
    DROP TABLE IF EXISTS public.orders CASCADE;
    DROP TABLE IF EXISTS public.solution_reviews CASCADE;
    DROP TABLE IF EXISTS public.solution_files CASCADE;
    DROP TABLE IF EXISTS public.solution_versions CASCADE;
    DROP TABLE IF EXISTS public.solutions CASCADE;
    DROP TABLE IF EXISTS public.creator_profiles CASCADE;
    DROP TABLE IF EXISTS public.user_profiles CASCADE;
    
    -- 删除旧的枚举类型
    DROP TYPE IF EXISTS notification_priority CASCADE;
    DROP TYPE IF EXISTS notification_type CASCADE;
    DROP TYPE IF EXISTS cart_status CASCADE;
    DROP TYPE IF EXISTS inventory_status CASCADE;
    DROP TYPE IF EXISTS product_status CASCADE;
    DROP TYPE IF EXISTS review_decision CASCADE;
    DROP TYPE IF EXISTS review_status CASCADE;
    DROP TYPE IF EXISTS file_status CASCADE;
    DROP TYPE IF EXISTS solution_file_type CASCADE;
    DROP TYPE IF EXISTS sample_order_status CASCADE;
    DROP TYPE IF EXISTS factory_status CASCADE;
    DROP TYPE IF EXISTS revenue_status CASCADE;
    DROP TYPE IF EXISTS payment_event_type CASCADE;
    DROP TYPE IF EXISTS payment_status CASCADE;
    DROP TYPE IF EXISTS payment_method CASCADE;
    DROP TYPE IF EXISTS order_status CASCADE;
    DROP TYPE IF EXISTS solution_status CASCADE;
    DROP TYPE IF EXISTS creator_status CASCADE;
    DROP TYPE IF EXISTS user_status CASCADE;
    DROP TYPE IF EXISTS user_role CASCADE;
    
    COMMIT;
  

-- ============================================
-- 开始执行迁移
-- ============================================


-- ============================================
-- 迁移文件: 001_create_user_tables.sql
-- ============================================

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



-- ============================================
-- 迁移文件: 002_update_creator_profiles.sql
-- ============================================

-- ============================================
-- 更新创作者资料表
-- 使用 user_id 关联到 auth.users
-- ============================================

-- 1. 如果 creator_profiles 表已存在，先备份
-- (可选) CREATE TABLE IF NOT EXISTS public.creator_profiles_backup AS SELECT * FROM public.creator_profiles;

-- 2. 删除旧的外键约束（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'creator_profiles_userId_fkey' 
    AND table_name = 'creator_profiles'
  ) THEN
    ALTER TABLE public.creator_profiles DROP CONSTRAINT creator_profiles_userId_fkey;
  END IF;
END $$;

-- 3. 如果旧的 userId 列存在，重命名或删除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'creator_profiles' 
    AND column_name = 'userId'
  ) THEN
    -- 如果有数据，先尝试迁移
    ALTER TABLE public.creator_profiles RENAME COLUMN "userId" TO user_id;
  END IF;
END $$;

-- 4. 确保 user_id 列存在且正确配置
ALTER TABLE public.creator_profiles 
  ALTER COLUMN user_id SET NOT NULL;

-- 5. 添加外键约束到 user_profiles.user_id
ALTER TABLE public.creator_profiles
  DROP CONSTRAINT IF EXISTS creator_profiles_user_id_fkey;

ALTER TABLE public.creator_profiles
  ADD CONSTRAINT creator_profiles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.user_profiles(user_id) 
  ON DELETE CASCADE;

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON public.creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_verification_status ON public.creator_profiles(verification_status);

-- 7. 添加 updated_at 触发器
DROP TRIGGER IF EXISTS set_creator_profiles_updated_at ON public.creator_profiles;
CREATE TRIGGER set_creator_profiles_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. 启用 RLS
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

-- 9. RLS 策略：公开查看已认证的创作者资料
DROP POLICY IF EXISTS "Verified creator profiles are viewable" ON public.creator_profiles;
CREATE POLICY "Verified creator profiles are viewable"
  ON public.creator_profiles FOR SELECT
  USING (verification_status = 'APPROVED');

-- 10. RLS 策略：创作者可以查看和更新自己的资料
DROP POLICY IF EXISTS "Creators can manage own profile" ON public.creator_profiles;
CREATE POLICY "Creators can manage own profile"
  ON public.creator_profiles
  USING (auth.uid() = user_id);

-- 11. RLS 策略：管理员可以管理所有创作者资料
DROP POLICY IF EXISTS "Admins can manage all creator profiles" ON public.creator_profiles;
CREATE POLICY "Admins can manage all creator profiles"
  ON public.creator_profiles
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN', 'REVIEWER')
    )
  );

-- 12. 添加注释
COMMENT ON TABLE public.creator_profiles IS '创作者资料表';
COMMENT ON COLUMN public.creator_profiles.user_id IS '关联 user_profiles.user_id (同时也是 auth.users.id)';



-- ============================================
-- 迁移文件: 003_update_other_tables.sql
-- ============================================

-- ============================================
-- 更新其他表以使用 user_id 关联
-- 注意：只更新存在的表，跳过不存在的表
-- ============================================

-- 1. 更新 user_addresses 表（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_addresses'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_addresses' 
      AND column_name = 'userId'
    ) THEN
      ALTER TABLE public.user_addresses RENAME COLUMN "userId" TO user_id;
    END IF;
    
    ALTER TABLE public.user_addresses
      DROP CONSTRAINT IF EXISTS user_addresses_user_id_fkey;

    ALTER TABLE public.user_addresses
      ADD CONSTRAINT user_addresses_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.user_profiles(user_id) 
      ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
    
    ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage own addresses" ON public.user_addresses;
    CREATE POLICY "Users can manage own addresses"
      ON public.user_addresses
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2. 更新 carts 表（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'carts'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'carts' 
      AND column_name = 'userId'
    ) THEN
      ALTER TABLE public.carts RENAME COLUMN "userId" TO user_id;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'carts' 
      AND column_name = 'sessionId'
    ) THEN
      ALTER TABLE public.carts RENAME COLUMN "sessionId" TO session_id;
    END IF;

    ALTER TABLE public.carts
      DROP CONSTRAINT IF EXISTS carts_user_id_fkey;

    ALTER TABLE public.carts
      ADD CONSTRAINT carts_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.user_profiles(user_id) 
      ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
    
    ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage own cart" ON public.carts;
    CREATE POLICY "Users can manage own cart"
      ON public.carts
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. 更新 notifications 表（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name = 'userId'
    ) THEN
      ALTER TABLE public.notifications RENAME COLUMN "userId" TO user_id;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name = 'actionUrl'
    ) THEN
      ALTER TABLE public.notifications RENAME COLUMN "actionUrl" TO action_url;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name = 'scheduledAt'
    ) THEN
      ALTER TABLE public.notifications RENAME COLUMN "scheduledAt" TO scheduled_at;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name = 'expiresAt'
    ) THEN
      ALTER TABLE public.notifications RENAME COLUMN "expiresAt" TO expires_at;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name = 'readAt'
    ) THEN
      ALTER TABLE public.notifications RENAME COLUMN "readAt" TO read_at;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name = 'deliveryStatus'
    ) THEN
      ALTER TABLE public.notifications RENAME COLUMN "deliveryStatus" TO delivery_status;
    END IF;

    ALTER TABLE public.notifications
      DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.user_profiles(user_id) 
      ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
    
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
    CREATE POLICY "Users can view own notifications"
      ON public.notifications FOR SELECT
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
    CREATE POLICY "Users can update own notifications"
      ON public.notifications FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. 更新 notification_preferences 表（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notification_preferences'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notification_preferences' 
      AND column_name = 'userId'
    ) THEN
      ALTER TABLE public.notification_preferences RENAME COLUMN "userId" TO user_id;
    END IF;
    
    -- 重命名所有 camelCase 列
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'emailEnabled') THEN
      ALTER TABLE public.notification_preferences RENAME COLUMN "emailEnabled" TO email_enabled;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'pushEnabled') THEN
      ALTER TABLE public.notification_preferences RENAME COLUMN "pushEnabled" TO push_enabled;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'websocketEnabled') THEN
      ALTER TABLE public.notification_preferences RENAME COLUMN "websocketEnabled" TO websocket_enabled;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'reviewNotifications') THEN
      ALTER TABLE public.notification_preferences RENAME COLUMN "reviewNotifications" TO review_notifications;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'systemNotifications') THEN
      ALTER TABLE public.notification_preferences RENAME COLUMN "systemNotifications" TO system_notifications;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'marketingNotifications') THEN
      ALTER TABLE public.notification_preferences RENAME COLUMN "marketingNotifications" TO marketing_notifications;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'quietHoursStart') THEN
      ALTER TABLE public.notification_preferences RENAME COLUMN "quietHoursStart" TO quiet_hours_start;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'quietHoursEnd') THEN
      ALTER TABLE public.notification_preferences RENAME COLUMN "quietHoursEnd" TO quiet_hours_end;
    END IF;

    ALTER TABLE public.notification_preferences
      DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;

    ALTER TABLE public.notification_preferences
      ADD CONSTRAINT notification_preferences_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.user_profiles(user_id) 
      ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
    
    ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage own preferences" ON public.notification_preferences;
    CREATE POLICY "Users can manage own preferences"
      ON public.notification_preferences
      USING (auth.uid() = user_id);
  END IF;
END $$;



-- ============================================
-- 迁移文件: 004_fix_user_profiles_rls_recursion.sql
-- ============================================

-- ============================================
-- 修复 user_profiles 表的 RLS 无限递归问题
-- ============================================

-- 问题: "Admins can manage all profiles" 策略在检查管理员权限时
-- 又查询了 user_profiles 表，导致无限递归

-- 解决方案: 创建一个 SECURITY DEFINER 函数来检查用户角色
-- 这样函数执行时会绕过 RLS，避免递归

-- 1. 创建检查用户角色的函数（绕过 RLS）
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = user_uuid
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. 删除有问题的策略
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "管理员可以查看所有用户资料" ON public.user_profiles;

-- 3. 重新创建管理员策略（使用函数避免递归）
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id  -- 用户可以查看自己的
    OR public.is_admin_user(auth.uid())  -- 或管理员可以查看所有
  );

CREATE POLICY "Admins can update all profiles" ON public.user_profiles
  FOR UPDATE
  USING (
    auth.uid() = user_id  -- 用户可以更新自己的
    OR public.is_admin_user(auth.uid())  -- 或管理员可以更新所有
  );

CREATE POLICY "Admins can insert profiles" ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id  -- 用户可以插入自己的
    OR public.is_admin_user(auth.uid())  -- 或管理员可以插入任何
  );

CREATE POLICY "Admins can delete profiles" ON public.user_profiles
  FOR DELETE
  USING (
    public.is_admin_user(auth.uid())  -- 只有管理员可以删除
  );

-- 4. 确保用户自己的策略存在（如果不存在）
DO $$
BEGIN
  -- 检查并创建用户查看自己资料的策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Public profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Public profiles are viewable by everyone"
      ON public.user_profiles FOR SELECT
      USING (true);
  END IF;

  -- 检查并创建用户更新自己资料的策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.user_profiles FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  -- 检查并创建用户插入自己资料的策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON public.user_profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. 添加注释
COMMENT ON FUNCTION public.is_admin_user(UUID) IS '检查用户是否是管理员（绕过 RLS，避免递归）';




-- ============================================
-- 迁移文件: 005_create_avatars_storage_policies.sql
-- ============================================

-- ============================================
-- 创建 avatars Storage Bucket 的 RLS 策略
-- ============================================

-- ⚠️ 重要提示：
-- Storage 的 RLS 策略不能通过普通 SQL 迁移设置！
-- storage.objects 表是 Supabase 管理的系统表，需要 service_role 权限。
-- 
-- 此迁移文件为空，仅作为占位符。
-- Storage 策略需要通过以下方式设置：
-- 1. Supabase Dashboard UI > Storage > avatars > Policies
-- 2. 使用 Supabase Management API
-- 3. 使用 supabase CLI
--
-- 详细设置步骤请参考: DOCS/supabase-storage-policies-setup.md

-- 此迁移文件不执行任何操作，仅保留编号顺序
SELECT 'Storage policies must be configured through Supabase Dashboard or CLI' AS notice;

-- ============================================
-- 参考策略配置（请通过 Dashboard UI 或 CLI 设置）
-- ============================================

-- 策略 1: 允许用户上传自己的头像 (INSERT)
-- Policy name: "Users can upload own avatar"
-- Allowed operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
--   bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]

-- 策略 2: 允许用户更新自己的头像 (UPDATE)
-- Policy name: "Users can update own avatar"
-- Allowed operation: UPDATE
-- Target roles: authenticated
-- USING expression:
--   bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]

-- 策略 3: 允许用户删除自己的头像 (DELETE)
-- Policy name: "Users can delete own avatar"
-- Allowed operation: DELETE
-- Target roles: authenticated
-- USING expression:
--   bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[2]

-- 策略 4: 允许所有人查看头像（公开访问）(SELECT)
-- Policy name: "Anyone can view avatars"
-- Allowed operation: SELECT
-- Target roles: anon, authenticated
-- USING expression:
--   bucket_id = 'avatars'



-- ============================================
-- 迁移文件: 006_create_solution_status_enum.sql
-- ============================================

-- ============================================
-- 创建缺失的枚举类型
-- 修复 Prisma schema 中定义的枚举类型在数据库中不存在的问题
-- ============================================

-- 创建 SolutionStatus 枚举类型
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SolutionStatus') THEN
        CREATE TYPE "SolutionStatus" AS ENUM (
            'DRAFT',
            'PENDING_REVIEW',
            'APPROVED',
            'REJECTED',
            'PUBLISHED',
            'ARCHIVED'
        );
    END IF;
END $$;

-- 确保枚举类型在 public schema 中
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SolutionStatus' AND typnamespace != (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TYPE "SolutionStatus" SET SCHEMA public;
    END IF;
END $$;

-- 创建其他可能缺失的枚举类型
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM (
            'PENDING',
            'CONFIRMED',
            'PROCESSING',
            'SHIPPED',
            'DELIVERED',
            'CANCELLED',
            'REFUNDED'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
        CREATE TYPE "PaymentMethod" AS ENUM (
            'CREDIT_CARD',
            'PAYPAL',
            'BANK_TRANSFER',
            'ALIPAY',
            'WECHAT_PAY'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM (
            'PENDING',
            'PROCESSING',
            'COMPLETED',
            'FAILED',
            'CANCELLED',
            'REFUNDED'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
        CREATE TYPE "ProductStatus" AS ENUM (
            'DRAFT',
            'PENDING',
            'APPROVED',
            'PUBLISHED',
            'ARCHIVED',
            'DISCONTINUED'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewStatus') THEN
        CREATE TYPE "ReviewStatus" AS ENUM (
            'PENDING',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewDecision') THEN
        CREATE TYPE "ReviewDecision" AS ENUM (
            'APPROVED',
            'REJECTED',
            'NEEDS_REVISION',
            'PENDING'
        );
    END IF;
END $$;

-- 注释：其他枚举类型（如 UserRole, UserStatus 等）应该在之前的迁移中已创建



-- ============================================
-- 迁移文件: 007_convert_solution_status_column.sql
-- ============================================

-- ============================================
-- 将 solutions.status 列转换为 SolutionStatus 枚举
-- 注意：只在 solutions 表存在时执行
-- ============================================

DO $$
BEGIN
  -- 检查 solutions 表是否存在
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'solutions'
  ) THEN
    -- 1. 确保枚举已经存在
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SolutionStatus') THEN
        CREATE TYPE "SolutionStatus" AS ENUM (
            'DRAFT',
            'PENDING_REVIEW',
            'APPROVED',
            'REJECTED',
            'PUBLISHED',
            'ARCHIVED'
        );
    END IF;

    -- 2. 删除旧的检查约束（如果存在）
    ALTER TABLE public.solutions DROP CONSTRAINT IF EXISTS solutions_status_check;

    -- 3. 将旧值映射到新枚举值
    UPDATE public.solutions
    SET status = 'PENDING_REVIEW'
    WHERE status = 'PENDING';

    -- 4. 将列类型修改为枚举
    ALTER TABLE public.solutions
        ALTER COLUMN status DROP DEFAULT,
        ALTER COLUMN status TYPE "SolutionStatus" USING status::"SolutionStatus",
        ALTER COLUMN status SET DEFAULT 'DRAFT';
  ELSE
    -- solutions 表不存在，跳过此迁移
    RAISE NOTICE 'solutions 表不存在，跳过迁移 007';
  END IF;
END $$;



-- ============================================
-- 迁移文件: 008_fix_applications_fk.sql
-- ============================================

-- ============================================
-- 修复 applications 表的外键约束
-- 删除引用 auth.users 的外键，避免 Prisma 跨 schema 错误
-- ============================================

-- 检查并删除 applications 表中引用 auth.users 的外键约束
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- 查找引用 auth schema 的外键约束
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
        AND tc.table_name = 'applications'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'auth'
    LIMIT 1;
    
    -- 如果找到约束，删除它
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE '已删除外键约束: %', constraint_name;
    ELSE
        RAISE NOTICE '未找到需要删除的外键约束';
    END IF;
END $$;

-- 如果 applications 表存在但不在 Prisma schema 中，可以选择删除它
-- 注意：只有在确认不需要此表时才取消注释
-- DROP TABLE IF EXISTS public.applications CASCADE;




-- ============================================
-- 迁移文件: 009_add_solution_creator_relation.sql
-- ============================================

-- 添加 Solution 表的 creatorId 字段和关联关系
-- 迁移: add_solution_creator_relation
-- 注意：只在 solutions 表存在时执行

DO $$ 
BEGIN
  -- 检查 solutions 表是否存在
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'solutions'
  ) THEN
    -- 1. 添加或修改 creatorId 字段
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'solutions' 
      AND column_name = 'creatorId'
    ) THEN
      ALTER TABLE public.solutions 
      ADD COLUMN "creatorId" UUID;
      
      COMMENT ON COLUMN public.solutions."creatorId" IS '创作者ID（关联到 creator_profiles.id）';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'solutions' 
      AND column_name = 'creatorId'
      AND data_type != 'uuid'
    ) THEN
      ALTER TABLE public.solutions DROP CONSTRAINT IF EXISTS solutions_creatorId_fkey;
      ALTER TABLE public.solutions DROP COLUMN IF EXISTS "creatorId";
      ALTER TABLE public.solutions ADD COLUMN "creatorId" UUID;
      COMMENT ON COLUMN public.solutions."creatorId" IS '创作者ID（关联到 creator_profiles.id）';
    END IF;

    -- 2. 添加外键约束
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'solutions' 
      AND constraint_name = 'solutions_creatorId_fkey'
    ) THEN
      ALTER TABLE public.solutions 
      ADD CONSTRAINT solutions_creatorId_fkey 
      FOREIGN KEY ("creatorId") 
      REFERENCES public.creator_profiles(id) 
      ON DELETE SET NULL;
    END IF;

    -- 3. 创建索引
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'solutions' 
      AND indexname = 'solutions_creatorId_idx'
    ) THEN
      CREATE INDEX solutions_creatorId_idx ON public.solutions("creatorId");
    END IF;

    RAISE NOTICE '✅ solutions.creatorId 字段迁移完成';
  ELSE
    RAISE NOTICE 'solutions 表不存在，跳过迁移 009';
  END IF;
END $$;



-- ============================================
-- 迁移文件: 010_add_solution_additional_fields.sql
-- ============================================

-- 添加 Solution 表的额外字段
-- 迁移: add_solution_additional_fields
-- 注意：只在 solutions 表存在时执行

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'solutions'
  ) THEN
    RAISE NOTICE 'solutions 表不存在，跳过迁移 010';
    RETURN;
  END IF;
END $$;

-- 以下操作仅在 solutions 表存在时执行

-- 1. 添加 summary 字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'summary'
  ) THEN
    ALTER TABLE public.solutions ADD COLUMN summary TEXT;
    COMMENT ON COLUMN public.solutions.summary IS '方案摘要';
  END IF;
END $$;

-- 2. 添加 tags 字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.solutions ADD COLUMN tags TEXT[] DEFAULT '{}';
    COMMENT ON COLUMN public.solutions.tags IS '标签数组';
  END IF;
END $$;

-- 3. 添加 locale 字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'locale'
  ) THEN
    ALTER TABLE public.solutions ADD COLUMN locale TEXT DEFAULT 'zh-CN';
    COMMENT ON COLUMN public.solutions.locale IS '语言代码';
  END IF;
END $$;

-- 4-9. 添加其他字段（简化版）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solutions' AND column_name = 'downloadCount') THEN
    ALTER TABLE public.solutions ADD COLUMN "downloadCount" INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solutions' AND column_name = 'price') THEN
    ALTER TABLE public.solutions ADD COLUMN price DECIMAL(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solutions' AND column_name = 'featured') THEN
    ALTER TABLE public.solutions ADD COLUMN featured BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solutions' AND column_name = 'publishedAt') THEN
    ALTER TABLE public.solutions ADD COLUMN "publishedAt" TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solutions' AND column_name = 'archivedAt') THEN
    ALTER TABLE public.solutions ADD COLUMN "archivedAt" TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;



-- ============================================
-- 迁移文件: 011_add_solution_asset_bom_models.sql
-- ============================================

-- 添加 SolutionAsset 和 SolutionBomItem 模型
-- 迁移: add_solution_asset_bom_models
-- 注意：只在 solutions 表存在时执行

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'solutions'
  ) THEN
    RAISE NOTICE 'solutions 表不存在，跳过迁移 011';
  END IF;
  
  -- 迁移 011 涉及创建新表（solution_assets, solution_bom_items）
  -- 这些表依赖 solutions 表，因此也跳过
END $$;



-- ============================================
-- 迁移文件: 012_create_solution_reviews_and_fix_bom_fk.sql
-- ============================================

-- 创建 solution_reviews 表并修复 solution_bom_items 外键约束
-- 迁移: create_solution_reviews_and_fix_bom_fk
-- 注意：只在 solutions 表存在时执行

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'solutions'
  ) THEN
    RAISE NOTICE 'solutions 表不存在，跳过迁移 012';
  END IF;
END $$;



-- ============================================
-- 迁移文件: 013_enhance_solution_bom_items.sql
-- ============================================

-- 增强 SolutionBomItem 模型字段
-- 迁移: enhance_solution_bom_items
-- 注意：只在 solution_bom_items 表存在时执行

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'solution_bom_items'
  ) THEN
    RAISE NOTICE 'solution_bom_items 表不存在，跳过迁移 013';
  END IF;
END $$;



-- ============================================
-- 迁移文件: 014_fix_verification_status_enum.sql
-- ============================================

-- ============================================
-- 修复 VerificationStatus 枚举类型名称
-- 将 verification_status 枚举类型转换为 VerificationStatus 以匹配 Prisma schema
-- ============================================

-- 1. 创建 VerificationStatus 枚举类型（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationStatus') THEN
    CREATE TYPE "VerificationStatus" AS ENUM (
      'PENDING',
      'APPROVED',
      'REJECTED',
      'EXPIRED'
    );
  END IF;
END $$;

-- 2. 将 creator_profiles.verification_status 列从 verification_status 转换为 VerificationStatus
-- 2.1 删除默认值
ALTER TABLE public.creator_profiles
  ALTER COLUMN verification_status DROP DEFAULT;

-- 2.2 转换为 text（中间步骤）
ALTER TABLE public.creator_profiles
  ALTER COLUMN verification_status TYPE text;

-- 2.3 转换为 VerificationStatus 枚举类型
ALTER TABLE public.creator_profiles
  ALTER COLUMN verification_status TYPE "VerificationStatus" 
  USING verification_status::"VerificationStatus";

-- 2.4 恢复默认值
ALTER TABLE public.creator_profiles
  ALTER COLUMN verification_status SET DEFAULT 'PENDING'::"VerificationStatus";

-- 3. 添加注释
COMMENT ON TYPE "VerificationStatus" IS '创作者认证状态枚举：PENDING(待审核), APPROVED(已通过), REJECTED(已拒绝), EXPIRED(已过期)';

-- 提示信息
DO $$ BEGIN RAISE NOTICE '✅ VerificationStatus 枚举类型已修复'; END $$;




-- ============================================
-- 迁移文件: 015_migrate_to_multi_roles.sql
-- ============================================

-- ============================================
-- 迁移到多角色支持系统
-- 将 user_profiles.role 改为 user_profiles.roles (数组)
-- ============================================

-- 1. 添加新列 roles (数组类型)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'roles'
  ) THEN
    -- 添加 roles 列，类型为 user_role 数组
    ALTER TABLE public.user_profiles
    ADD COLUMN roles user_role[] DEFAULT ARRAY['USER']::user_role[];
    
    COMMENT ON COLUMN public.user_profiles.roles IS '用户角色数组（支持多角色）';
  END IF;
END $$;

-- 2. 迁移现有数据：将 role 列的值迁移到 roles 数组
DO $$
BEGIN
  -- 检查是否还有数据需要迁移（roles 为空或 NULL）
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE roles IS NULL OR array_length(roles, 1) IS NULL
  ) THEN
    -- 将单个 role 值转换为数组
    UPDATE public.user_profiles
    SET roles = ARRAY[role]::user_role[]
    WHERE roles IS NULL OR array_length(roles, 1) IS NULL;
    
    RAISE NOTICE '已迁移现有角色数据到 roles 数组';
  END IF;
END $$;

-- 3. 设置 NOT NULL 约束（确保所有记录都有角色）
DO $$
BEGIN
  -- 先确保所有记录都有默认值
  UPDATE public.user_profiles
  SET roles = ARRAY['USER']::user_role[]
  WHERE roles IS NULL OR array_length(roles, 1) IS NULL;
  
  -- 然后设置 NOT NULL
  ALTER TABLE public.user_profiles
  ALTER COLUMN roles SET NOT NULL;
  
  -- 设置默认值
  ALTER TABLE public.user_profiles
  ALTER COLUMN roles SET DEFAULT ARRAY['USER']::user_role[];
END $$;

-- 4. 创建 GIN 索引（用于高效的数组查询和包含检查）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND indexname = 'idx_user_profiles_roles'
  ) THEN
    CREATE INDEX idx_user_profiles_roles ON public.user_profiles USING GIN(roles);
    RAISE NOTICE '已创建 roles 数组索引';
  END IF;
END $$;

-- 5. 创建辅助函数：检查用户是否有指定角色（用于查询）
CREATE OR REPLACE FUNCTION public.user_has_role(
  user_id_param UUID,
  required_role user_role
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = user_id_param
    AND required_role = ANY(user_profiles.roles)
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.user_has_role IS '检查用户是否拥有指定角色（支持多角色）';

-- 6. 创建辅助函数：检查用户是否有任意指定角色
CREATE OR REPLACE FUNCTION public.user_has_any_role(
  user_id_param UUID,
  required_roles user_role[]
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = user_id_param
    AND user_profiles.roles && required_roles  -- 数组重叠操作符
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.user_has_any_role IS '检查用户是否拥有任意指定角色（支持多角色）';

-- 7. 创建辅助函数：检查用户是否有所有指定角色
CREATE OR REPLACE FUNCTION public.user_has_all_roles(
  user_id_param UUID,
  required_roles user_role[]
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT required_roles <@ user_profiles.roles  -- 数组包含操作符
    FROM public.user_profiles
    WHERE user_profiles.user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.user_has_all_roles IS '检查用户是否拥有所有指定角色（支持多角色）';

-- 8. 添加注释说明
COMMENT ON COLUMN public.user_profiles.roles IS '用户角色数组，支持用户同时拥有多个角色。例如：["USER", "CREATOR"] 表示用户既是普通用户也是创作者。';

-- 提示信息
DO $$ BEGIN 
  RAISE NOTICE '✅ 多角色支持迁移完成';
  RAISE NOTICE '   - 已添加 roles 数组列';
  RAISE NOTICE '   - 已迁移现有数据';
  RAISE NOTICE '   - 已创建 GIN 索引';
  RAISE NOTICE '   - 已创建辅助查询函数';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  注意：role 列仍然保留以保持向后兼容';
  RAISE NOTICE '   建议在确认所有代码更新后，再删除 role 列';
END $$;



