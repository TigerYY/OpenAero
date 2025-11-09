-- Supabase Auth配置
-- 用于设置认证服务和用户管理

-- 1. 启用Row Level Security
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- 2. 创建用户数据策略
CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY IF NOT EXISTS "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- 3. 创建自定义用户元数据函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role, email_verified, created_at, updated_at)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'USER'),
    NEW.email_confirmed_at IS NOT NULL,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建触发器，在用户注册时自动创建用户记录
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. 创建用户会话视图（便于查询）
CREATE OR REPLACE VIEW public.user_sessions AS
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.email_verified,
  u.created_at,
  u.updated_at,
  a.last_sign_in_at,
  a.provider,
  a.created_at as auth_created_at
FROM users u
LEFT JOIN auth.users a ON u.id = a.id::text;

-- 6. 创建用户角色枚举
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('USER', 'CREATOR', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. 添加用户角色约束
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS valid_user_role;
ALTER TABLE users 
ADD CONSTRAINT valid_user_role 
CHECK (role IN ('USER', 'CREATOR', 'ADMIN'));

-- 8. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(id) WHERE id ~ '^[0-9a-f]{8}-';

-- 9. 创建用户统计函数
CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS TABLE(
  total_users BIGINT,
  verified_users BIGINT,
  admin_count BIGINT,
  creator_count BIGINT,
  user_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE email_verified = true) as verified_users,
    COUNT(*) FILTER (WHERE role = 'ADMIN') as admin_count,
    COUNT(*) FILTER (WHERE role = 'CREATOR') as creator_count,
    COUNT(*) FILTER (WHERE role = 'USER') as user_count
  FROM users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 创建用户角色更新函数
CREATE OR REPLACE FUNCTION public.update_user_role(
  user_id TEXT,
  new_role public.user_role
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 只有管理员可以更新用户角色
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE users 
  SET role = new_role, updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. 创建软删除支持
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 12. 更新策略以支持软删除
CREATE POLICY IF NOT EXISTS "Exclude deleted users" ON users
  FOR ALL USING (deleted_at IS NULL);

-- 13. 创建软删除函数
CREATE OR REPLACE FUNCTION public.soft_delete_user(user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = user_id AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. 创建恢复用户函数
CREATE OR REPLACE FUNCTION public.restore_user(user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET deleted_at = NULL, updated_at = NOW()
  WHERE id = user_id AND deleted_at IS NOT NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. 创建审计日志表
CREATE TABLE IF NOT EXISTS public.user_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 16. 创建审计日志触发器
CREATE OR REPLACE FUNCTION public.log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.user_audit_log (user_id, action, old_values, new_values, created_by)
    VALUES (
      NEW.id,
      'UPDATE',
      row_to_json(OLD),
      row_to_json(NEW),
      auth.uid()::text
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.user_audit_log (user_id, action, old_values, created_by)
    VALUES (OLD.id, 'DELETE', row_to_json(OLD), auth.uid()::text);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. 应用审计日志触发器
DROP TRIGGER IF EXISTS user_audit_trigger ON users;
CREATE TRIGGER user_audit_trigger
  AFTER UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION public.log_user_changes();

-- 18. 授权
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.user_sessions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(TEXT, public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_user(TEXT) TO authenticated;

-- 完成配置
SELECT 'Supabase Auth configuration completed successfully' as status;