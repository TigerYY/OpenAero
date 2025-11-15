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

