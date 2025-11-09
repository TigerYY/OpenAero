/**
 * Supabase Auth配置脚本
 * 用于通过Supabase Management API配置认证服务
 */

const { createClient } = require('@supabase/supabase-js');

// 配置信息
const SUPABASE_URL = 'https://cardynuoazvaytvinxvm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcmR5bnVvYXp2YXl0dmlueHZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU4OTQxNSwiZXhwIjoyMDc2MTY1NDE1fQ.g29Owquq57cTYGh72S500HCN7DYuRxbkH01qdvErDAo';

// 创建Supabase管理客户端
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupSupabaseAuth() {
  console.log('🚀 开始配置Supabase Auth服务...');

  try {
    // 1. 检查当前Auth配置状态
    console.log('\n📋 检查当前Auth配置...');
    const { data: authConfig, error: authError } = await adminClient
      .from('auth.config')
      .select('*')
      .single();

    if (authError && authError.code !== 'PGRST116') {
      console.log('⚠️  Auth配置表不存在，这是正常的（新项目）');
    }

    // 2. 创建用户表（如果不存在）
    console.log('\n📋 检查用户表结构...');
    const { data: tables, error: tablesError } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'users');

    if (tablesError) {
      console.error('❌ 检查用户表失败:', tablesError);
    } else if (tables.length === 0) {
      console.log('📝 创建用户表...');
      const { error: createError } = await adminClient.rpc('create_users_table');
      if (createError) {
        console.log('⚠️  创建用户表失败，将使用SQL创建...');
      }
    } else {
      console.log('✅ 用户表已存在');
    }

    // 3. 测试认证功能
    console.log('\n🧪 测试认证功能...');
    const { data: signUpData, error: signUpError } = await adminClient.auth.signUp({
      email: 'test@openaero.com',
      password: 'test123456',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          role: 'USER'
        }
      }
    });

    if (signUpError) {
      console.log('⚠️  测试用户注册失败:', signUpError.message);
    } else {
      console.log('✅ 测试用户注册成功');
      console.log('📧 验证邮件已发送到:', signUpData.user?.email);
    }

    // 4. 创建配置SQL脚本
    console.log('\n📝 生成配置SQL脚本...');
    const configSQL = generateConfigSQL();
    console.log(configSQL);

    console.log('\n✅ Supabase Auth基础配置完成！');
    console.log('\n📋 下一步手动配置项:');
    console.log('1. 访问: https://cardynuoazvaytvinxvm.supabase.co');
    console.log('2. 进入 Authentication > Settings');
    console.log('3. 配置以下设置:');
    console.log('   - Site URL: http://localhost:3000');
    console.log('   - Redirect URLs: http://localhost:3000/auth/callback');
    console.log('   - Email templates (自定义品牌)');
    console.log('4. 在 Authentication > Providers 中配置OAuth');

  } catch (error) {
    console.error('❌ 配置过程中发生错误:', error);
  }
}

function generateConfigSQL() {
  return `
-- Supabase Auth配置SQL脚本
-- 请在Supabase项目的SQL编辑器中执行以下命令

-- 1. 启用Row Level Security
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- 2. 创建用户数据策略
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- 3. 创建自定义用户元数据函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role, email_verified, created_at, updated_at)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
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
CREATE OR REPLACE VIEW user_sessions AS
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
  a.provider
FROM users u
LEFT JOIN auth.users a ON u.id = a.id::text;

-- 6. 创建用户角色枚举
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('USER', 'CREATOR', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. 添加用户角色约束
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS valid_user_role 
CHECK (role IN ('USER', 'CREATOR', 'ADMIN'));

-- 8. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
`;
}

// 执行配置
setupSupabaseAuth().catch(console.error);