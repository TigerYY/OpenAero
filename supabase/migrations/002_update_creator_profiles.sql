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
