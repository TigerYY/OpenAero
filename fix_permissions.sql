-- 修复数据库权限问题
-- 为 anon 和 authenticated 用户设置正确的权限

-- 启用 RLS (Row Level Security)
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS solutions ENABLE ROW LEVEL SECURITY;

-- 删除现有策略
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- 为 user_profiles 创建 RLS 策略
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 为 solutions 创建公开读取策略
DROP POLICY IF EXISTS "Solutions are publicly viewable" ON solutions;
CREATE POLICY "Solutions are publicly viewable" ON solutions
    FOR SELECT USING (true);

-- 授予基本权限
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 确保表存在
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        CREATE TABLE user_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            display_name TEXT,
            avatar TEXT,
            bio TEXT,
            roles TEXT[] DEFAULT '{USER}',
            permissions TEXT[],
            status TEXT DEFAULT 'ACTIVE',
            is_blocked BOOLEAN DEFAULT false,
            blocked_reason TEXT,
            blocked_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            last_login_at TIMESTAMP
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solutions') THEN
        CREATE TABLE solutions (
            id TEXT PRIMARY KEY DEFAULT '',
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            status TEXT DEFAULT 'DRAFT',
            images TEXT[],
            features TEXT[],
            specs JSONB,
            bom JSONB,
            creatorId TEXT NOT NULL,
            userId TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            submittedAt TIMESTAMP,
            reviewedAt TIMESTAMP,
            reviewNotes TEXT,
            createdAt TIMESTAMP DEFAULT NOW(),
            updatedAt TIMESTAMP DEFAULT NOW()
        );
    END IF;
END $$;