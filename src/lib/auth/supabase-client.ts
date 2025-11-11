/**
 * Supabase 客户端配置
 * 用于浏览器端和服务器端的认证
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * 浏览器端 Supabase 客户端
 * 用于客户端组件中的认证操作
 */
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'openaero-auth',
  },
});

/**
 * 服务器端 Supabase 客户端
 * 用于服务器组件和 API 路由
 */
export function createSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // 在服务器组件中可能无法设置 cookie
          console.warn('Failed to set cookie:', error);
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          console.warn('Failed to remove cookie:', error);
        }
      },
    },
  });
}

/**
 * Admin 客户端 (使用 Service Role Key)
 * 仅在服务器端使用，具有完整权限
 * 警告: 不要在客户端暴露此客户端
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * 用户角色类型
 */
export type UserRole = 
  | 'USER'
  | 'CREATOR'
  | 'REVIEWER'
  | 'FACTORY_MANAGER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

/**
 * 用户状态类型
 */
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';

/**
 * 用户资料接口
 */
export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  permissions: string[];
  status: UserStatus;
  is_blocked: boolean;
  blocked_reason?: string;
  blocked_at?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

/**
 * 创作者资料接口
 */
export interface CreatorProfile {
  id: string;
  user_id: string;
  company_name?: string;
  business_license?: string;
  id_card?: string;
  tax_number?: string;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  verified_at?: string;
  rejection_reason?: string;
  total_solutions: number;
  total_revenue: number;
  rating?: number;
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 扩展的用户类型 (包含 auth.users 和 user_profiles)
 */
export interface ExtendedUser {
  id: string;
  email: string;
  phone?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  profile?: UserProfile;
  creator_profile?: CreatorProfile;
}
