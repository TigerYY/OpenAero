/**
 * OpenAero 应用配置
 * 集中管理应用级别的配置常量
 * 使用集中化的环境配置管理系统
 */

import { env } from './env';

export const APP_CONFIG = {
  // 应用基本信息
  name: env.NEXT_PUBLIC_APP_NAME || 'OpenAero',
  version: env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  description: '开元空御 - 社区驱动的开放式无人机解决方案平台',

  // 支持的语言
  supportedLocales: (env.NEXT_PUBLIC_SUPPORTED_LOCALES || 'zh-CN,en-US').split(',') as [
    'zh-CN',
    'en-US',
  ],
  defaultLocale: (env.NEXT_PUBLIC_DEFAULT_LOCALE || 'zh-CN') as 'zh-CN',

  // 开发环境配置
  development: {
    port: 3000,
    host: 'localhost',
    enableHotReload: true,
    enableSourceMaps: true,
  },

  // 生产环境配置
  production: {
    enableAnalytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    enableErrorTracking: env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING,
    enablePerformanceMonitoring: env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
  },

  // API 配置
  api: {
    baseUrl: env.NEXT_PUBLIC_API_URL || '/api',
    timeout: env.API_TIMEOUT || 10000,
    retryAttempts: 3,
  },

  // 数据库配置（仅服务器端）
  database: {
    url: (typeof window === 'undefined' ? env.DATABASE_URL : '') || '',
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
    jwtSecret: env.JWT_SECRET || '',
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
    enableMetrics: env.NEXT_PUBLIC_ENABLE_MONITORING && env.NODE_ENV === 'production',
    metricsInterval: 60000, // 1分钟
    healthCheckInterval: 30000, // 30秒
  },
};

export type AppConfig = typeof APP_CONFIG;
export type SupportedLocale = (typeof APP_CONFIG.supportedLocales)[number];
