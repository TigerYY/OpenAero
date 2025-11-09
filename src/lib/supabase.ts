/**
 * Supabase客户端配置
 * 替换原有的Prisma数据库连接
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase-types';

// Supabase客户端实例
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

/**
 * 获取Supabase客户端实例
 */
export function getSupabaseClient() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('缺少Supabase环境变量');
    }

    // 根据环境选择不同的密钥
    const key = process.env.NODE_ENV === 'server' ? supabaseServiceKey : supabaseAnonKey;

    supabaseInstance = createClient<Database>(supabaseUrl, key || supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return supabaseInstance;
}

/**
 * 服务端Supabase客户端（使用Service Role Key）
 */
export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('缺少Supabase服务端环境变量');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 导出 createClient 以便其他文件使用
export { createClient } from '@supabase/supabase-js';

// 导出默认客户端
export const supabase = getSupabaseClient();

// 导出类型
export type { Database };

// 导出onAuthStateChange
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};