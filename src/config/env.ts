/**
 * 集中化环境配置管理
 * 提供类型安全的环境变量访问和验证
 */

import { z } from 'zod';

/**
 * 客户端环境变量模式（只包含 NEXT_PUBLIC_* 变量）
 */
const clientEnvSchema = z.object({
  // 基础配置
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('OpenAero'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),

  // 国际化配置
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default('zh-CN'),
  NEXT_PUBLIC_SUPPORTED_LOCALES: z.string().default('zh-CN,en-US'),
  NEXT_PUBLIC_FALLBACK_LOCALE: z.string().default('zh-CN'),

  // Supabase 配置（客户端必需）
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_ACCESS_TOKEN: z.string().optional(),
});

/**
 * 服务器端环境变量模式（包含所有变量）
 */
const serverEnvSchema = clientEnvSchema.extend({
  // Supabase 服务器端配置（服务器端必需）
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // 数据库配置（服务器端必需）
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),

  // Redis 配置（可选）
  REDIS_URL: z.string().url().optional(),

  // API 配置
  NEXT_PUBLIC_API_URL: z.string().default('/api'),
  API_TIMEOUT: z.string().transform(Number).pipe(z.number().int().positive()).default('10000'),

  // 监控配置（可选）
  SENTRY_DSN: z
    .string()
    .optional()
    .refine(val => !val || z.string().url().safeParse(val).success, {
      message: 'SENTRY_DSN must be a valid URL if provided',
    }),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // 第三方服务（可选）
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  GOOGLE_SITE_VERIFICATION: z.string().optional(),
  YANDEX_VERIFICATION: z.string().optional(),

  // 支付网关配置（可选）
  ALIPAY_PUBLIC_KEY: z.string().optional(),
  ALIPAY_APP_ID: z.string().optional(),
  ALIPAY_PRIVATE_KEY: z.string().optional(),
  WECHAT_PAY_KEY: z.string().optional(),
  WECHAT_APP_ID: z.string().optional(),
  WECHAT_MCH_ID: z.string().optional(),

  // 定时任务配置（可选）
  CRON_SECRET: z.string().optional(),

  // 功能开关
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .transform(val => val === 'true')
    .default('true'),
  NEXT_PUBLIC_ENABLE_MONITORING: z
    .string()
    .transform(val => val === 'true')
    .default('true'),
  NEXT_PUBLIC_ENABLE_DARK_MODE: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
  NEXT_PUBLIC_DEBUG_ENV: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: z
    .string()
    .transform(val => val === 'true')
    .default('true'),
  NEXT_PUBLIC_ENABLE_ERROR_REPORTING: z
    .string()
    .transform(val => val === 'true')
    .default('true'),
  NEXT_PUBLIC_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Next.js 配置
  NEXT_TELEMETRY_DISABLED: z.string().optional(),

  // 安全配置（可选）
  JWT_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
});

/**
 * 完整环境变量模式（用于类型定义）
 */
const envSchema = serverEnvSchema;

/**
 * 环境变量类型
 */
export type Env = z.infer<typeof envSchema>;

/**
 * 检查是否在客户端环境
 */
function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * 验证环境变量
 * @param strict 是否严格模式（生产环境必须）
 */
export function validateEnv(strict: boolean = false): Env {
  const env = process.env;
  const isClientEnv = isClient();

  // 客户端：只验证 NEXT_PUBLIC_* 变量
  if (isClientEnv) {
    const schema = strict ? clientEnvSchema : clientEnvSchema.partial();
    const result = schema.safeParse(env);

    if (!result.success) {
      if (strict) {
        const errors = result.error.format();
        const errorMessages = Object.entries(errors)
          .filter(([_, value]) => value && typeof value === 'object' && '_errors' in value)
          .map(([key, value]: [string, { _errors?: string[] }]) => {
            const errors = value._errors || [];
            return `${key}: ${errors.join(', ')}`;
          });

        throw new Error(
          `❌ 环境变量验证失败:\n${errorMessages.join('\n')}\n\n` +
            `请检查 .env.local 文件或环境变量配置。`
        );
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️  环境变量验证警告:', result.error.format());
        }
        return schema.parse({}) as Env;
      }
    }

    // 客户端返回时，服务器端变量设为可选默认值
    return {
      ...result.data,
      SUPABASE_SERVICE_ROLE_KEY: '',
      DATABASE_URL: '',
    } as Env;
  }

  // 服务器端：验证所有变量
  const schema = strict ? serverEnvSchema : serverEnvSchema.partial();
  const result = schema.safeParse(env);

  if (!result.success) {
    if (strict) {
      const errors = result.error.format();
      const errorMessages = Object.entries(errors)
        .filter(([_, value]) => value && typeof value === 'object' && '_errors' in value)
        .map(([key, value]: [string, { _errors?: string[] }]) => {
          const errors = value._errors || [];
          return `${key}: ${errors.join(', ')}`;
        });

      throw new Error(
        `❌ 环境变量验证失败:\n${errorMessages.join('\n')}\n\n` +
          `请检查 .env.local 文件或环境变量配置。`
      );
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  环境变量验证警告:', result.error.format());
      }
      return schema.parse({}) as Env;
    }
  }

  return result.data as Env;
}

/**
 * 获取验证后的环境变量
 * 在运行时使用，会进行严格验证
 */
export function getEnv(): Env {
  const isProduction = process.env.NODE_ENV === 'production';
  return validateEnv(isProduction);
}

/**
 * 获取环境变量（安全模式，允许缺失）
 * 用于构建时或开发环境
 */
export function getEnvSafe(): Partial<Env> {
  return validateEnv(false);
}

/**
 * 环境配置对象
 * 提供类型安全的环境变量访问
 * 客户端只验证 NEXT_PUBLIC_* 变量，服务器端验证所有变量
 */
export const env = (() => {
  try {
    const isClientEnv = typeof window !== 'undefined';
    // 客户端使用非严格模式，服务器端根据环境决定
    const strict = !isClientEnv && process.env.NODE_ENV === 'production';
    return validateEnv(strict);
  } catch (error) {
    // 构建时或开发环境允许部分缺失
    if (process.env.NODE_ENV !== 'production') {
      return getEnvSafe() as Env;
    }
    throw error;
  }
})();

/**
 * 检查必需的环境变量是否已设置
 */
export function checkRequiredEnvVars(): { missing: string[]; present: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
  ];

  const missing: string[] = [];
  const present: string[] = [];

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    } else {
      present.push(key);
    }
  });

  return { missing, present };
}

/**
 * 获取环境信息摘要（用于调试，不包含敏感信息）
 */
export function getEnvSummary(): Record<string, string | boolean> {
  const env = getEnvSafe();

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    APP_NAME: env.NEXT_PUBLIC_APP_NAME || 'OpenAero',
    APP_VERSION: env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    DEFAULT_LOCALE: env.NEXT_PUBLIC_DEFAULT_LOCALE || 'zh-CN',
    HAS_SUPABASE_URL: !!env.NEXT_PUBLIC_SUPABASE_URL,
    HAS_DATABASE_URL: !!env.DATABASE_URL,
    HAS_REDIS: !!env.REDIS_URL,
    HAS_SENTRY: !!env.SENTRY_DSN,
    ENABLE_ANALYTICS: env.NEXT_PUBLIC_ENABLE_ANALYTICS || false,
    ENABLE_MONITORING: env.NEXT_PUBLIC_ENABLE_MONITORING || false,
    DEBUG_MODE: env.NEXT_PUBLIC_DEBUG_ENV || false,
    LOG_LEVEL: env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  };
}
