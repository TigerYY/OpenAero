-- OpenAero 数据库初始化脚本

-- 设置数据库编码
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建用户和权限（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'openaero') THEN
        CREATE ROLE openaero WITH LOGIN PASSWORD 'your_secure_password';
    END IF;
END
$$;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE openaero TO openaero;
GRANT ALL ON SCHEMA public TO openaero;

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO openaero;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO openaero;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO openaero;

-- 创建基础表结构（如果使用Prisma，这部分可能不需要）
-- 这里可以添加一些基础配置表或初始数据

-- 插入初始配置数据
-- INSERT INTO config (key, value) VALUES ('app_version', '1.0.0');

-- 创建索引优化
-- CREATE INDEX IF NOT EXISTS idx_created_at ON your_table(created_at);

-- 设置时区
SET timezone = 'UTC';

-- 完成初始化
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING;