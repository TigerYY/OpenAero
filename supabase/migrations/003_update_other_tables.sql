-- ============================================
-- 更新其他表以使用 user_id 关联
-- ============================================

-- 1. 更新 user_addresses 表
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_addresses' 
    AND column_name = 'userId'
  ) THEN
    ALTER TABLE public.user_addresses RENAME COLUMN "userId" TO user_id;
  END IF;
END $$;

ALTER TABLE public.user_addresses
  DROP CONSTRAINT IF EXISTS user_addresses_user_id_fkey;

ALTER TABLE public.user_addresses
  ADD CONSTRAINT user_addresses_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.user_profiles(user_id) 
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);

-- 2. 更新 carts 表
DO $$
BEGIN
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
END $$;

ALTER TABLE public.carts
  DROP CONSTRAINT IF EXISTS carts_user_id_fkey;

ALTER TABLE public.carts
  ADD CONSTRAINT carts_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.user_profiles(user_id) 
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);

-- 3. 更新 notifications 表
DO $$
BEGIN
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
END $$;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.user_profiles(user_id) 
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 4. 更新 notification_preferences 表
DO $$
BEGIN
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
END $$;

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.user_profiles(user_id) 
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- 5. 添加 RLS 策略到相关表
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.user_addresses;
CREATE POLICY "Users can manage own addresses"
  ON public.user_addresses
  USING (auth.uid() = user_id);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own cart" ON public.carts;
CREATE POLICY "Users can manage own cart"
  ON public.carts
  USING (auth.uid() = user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage own preferences"
  ON public.notification_preferences
  USING (auth.uid() = user_id);
