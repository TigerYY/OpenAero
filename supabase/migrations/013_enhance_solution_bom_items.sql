-- 增强 SolutionBomItem 模型字段（方案 B - 完整增强）
-- 迁移: enhance_solution_bom_items

-- 1. 添加 unit 字段（数量单位）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_bom_items' 
    AND column_name = 'unit'
  ) THEN
    ALTER TABLE public.solution_bom_items 
    ADD COLUMN unit TEXT DEFAULT '个';
    
    COMMENT ON COLUMN public.solution_bom_items.unit IS '数量单位（个、套、米、克等）';
  END IF;
END $$;

-- 2. 添加 unitPrice 字段（单价）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_bom_items' 
    AND column_name = 'unitPrice'
  ) THEN
    ALTER TABLE public.solution_bom_items 
    ADD COLUMN "unitPrice" DECIMAL(10, 2);
    
    COMMENT ON COLUMN public.solution_bom_items."unitPrice" IS '单价';
  END IF;
END $$;

-- 3. 添加 supplier 字段（供应商名称）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_bom_items' 
    AND column_name = 'supplier'
  ) THEN
    ALTER TABLE public.solution_bom_items 
    ADD COLUMN supplier TEXT;
    
    COMMENT ON COLUMN public.solution_bom_items.supplier IS '供应商名称';
  END IF;
END $$;

-- 4. 添加 partNumber 字段（零件号/SKU）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_bom_items' 
    AND column_name = 'partNumber'
  ) THEN
    ALTER TABLE public.solution_bom_items 
    ADD COLUMN "partNumber" TEXT;
    
    COMMENT ON COLUMN public.solution_bom_items."partNumber" IS '零件号/SKU';
  END IF;
END $$;

-- 5. 添加 manufacturer 字段（制造商）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_bom_items' 
    AND column_name = 'manufacturer'
  ) THEN
    ALTER TABLE public.solution_bom_items 
    ADD COLUMN manufacturer TEXT;
    
    COMMENT ON COLUMN public.solution_bom_items.manufacturer IS '制造商';
  END IF;
END $$;

-- 6. 添加 category 字段（物料类别）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_bom_items' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.solution_bom_items 
    ADD COLUMN category TEXT;
    
    COMMENT ON COLUMN public.solution_bom_items.category IS '物料类别（FRAME, MOTOR, ESC, PROPELLER, FLIGHT_CONTROLLER, BATTERY, CAMERA, GIMBAL, RECEIVER, TRANSMITTER, OTHER）';
  END IF;
END $$;

-- 7. 添加 position 字段（安装位置）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_bom_items' 
    AND column_name = 'position'
  ) THEN
    ALTER TABLE public.solution_bom_items 
    ADD COLUMN position TEXT;
    
    COMMENT ON COLUMN public.solution_bom_items.position IS '安装位置（机头、机尾、左臂、右臂等）';
  END IF;
END $$;

-- 8. 添加 weight 字段（重量）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_bom_items' 
    AND column_name = 'weight'
  ) THEN
    ALTER TABLE public.solution_bom_items 
    ADD COLUMN weight DECIMAL(10, 3);
    
    COMMENT ON COLUMN public.solution_bom_items.weight IS '重量（克）';
  END IF;
END $$;

-- 9. 添加 specifications 字段（技术规格）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_bom_items' 
    AND column_name = 'specifications'
  ) THEN
    ALTER TABLE public.solution_bom_items 
    ADD COLUMN specifications JSONB;
    
    COMMENT ON COLUMN public.solution_bom_items.specifications IS '详细规格参数（JSON格式，可存储电压、电流、功率等）';
  END IF;
END $$;

-- 10. 创建索引（提升查询性能）
DO $$ 
BEGIN
  -- category 索引
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'solution_bom_items' 
    AND indexname = 'solution_bom_items_category_idx'
  ) THEN
    CREATE INDEX solution_bom_items_category_idx ON public.solution_bom_items(category);
  END IF;

  -- partNumber 索引（零件号查询）
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'solution_bom_items' 
    AND indexname = 'solution_bom_items_partNumber_idx'
  ) THEN
    CREATE INDEX solution_bom_items_partNumber_idx ON public.solution_bom_items("partNumber");
  END IF;

  -- manufacturer 索引
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'solution_bom_items' 
    AND indexname = 'solution_bom_items_manufacturer_idx'
  ) THEN
    CREATE INDEX solution_bom_items_manufacturer_idx ON public.solution_bom_items(manufacturer);
  END IF;
END $$;

-- 11. 验证迁移
DO $$ 
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'solution_bom_items' 
  AND column_name IN (
    'unit', 'unitPrice', 'supplier', 'partNumber', 
    'manufacturer', 'category', 'position', 'weight', 'specifications'
  );
  
  IF column_count >= 9 THEN
    RAISE NOTICE '✅ 所有字段已成功添加 (共 % 个)', column_count;
    RAISE NOTICE '   - unit: 数量单位';
    RAISE NOTICE '   - unitPrice: 单价';
    RAISE NOTICE '   - supplier: 供应商';
    RAISE NOTICE '   - partNumber: 零件号';
    RAISE NOTICE '   - manufacturer: 制造商';
    RAISE NOTICE '   - category: 物料类别';
    RAISE NOTICE '   - position: 安装位置';
    RAISE NOTICE '   - weight: 重量';
    RAISE NOTICE '   - specifications: 技术规格';
  ELSE
    RAISE WARNING '⚠️  部分字段可能未添加 (期望 9 个，实际 % 个)', column_count;
  END IF;
END $$;

