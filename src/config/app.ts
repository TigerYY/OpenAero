/**
 * OpenAero 应用配置
 * 集中管理应用级别的配置常量
 */

export const APP_CONFIG = {
  // 应用基本信息
  name: 'OpenAero',
  version: '1.0.0',
  description: '开元空御 - 社区驱动的开放式无人机解决方案平台',
  
  // 支持的语言
  supportedLocales: ['zh-CN', 'en-US'] as const,
  defaultLocale: 'zh-CN' as const,
  
  // 开发环境配置
  development: {
    port: 3000,
    host: 'localhost',
    enableHotReload: true,
    enableSourceMaps: true,
  },
  
  // 生产环境配置
  production: {
    enableAnalytics: true,
    enableErrorTracking: true,
    enablePerformanceMonitoring: true,
  },
  
  // API 配置
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: 10000,
    retryAttempts: 3,
  },
  
  // 数据库配置
  database: {
    url: process.env.DATABASE_URL || '',
    maxConnections: 10,
    connectionTimeout: 30000,
  },
  
  // 缓存配置
  cache: {
    ttl: 300, // 5分钟
    maxSize: 1000,
  },
  
  // 安全配置
  security: {
    jwtSecret: process.env.JWT_SECRET || '',
    sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15分钟
  },
  
  // 文件上传配置
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    uploadPath: '/uploads',
  },
  
  // 分页配置
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  
  // 监控配置
  monitoring: {
    enableMetrics: process.env.NODE_ENV === 'production',
    metricsInterval: 60000, // 1分钟
    healthCheckInterval: 30000, // 30秒
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
export type SupportedLocale = typeof APP_CONFIG.supportedLocales[number];