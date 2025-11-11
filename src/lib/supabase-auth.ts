import { getSupabaseServerClient } from '@/lib/supabase';

/**
 * 用户注册
 */
export async function signUp(options: {
  email: string;
  password: string;
  options?: {
    data?: Record<string, any>;
  };
}) {
  const supabase = getSupabaseServerClient();
  
  const { data, error } = await supabase.auth.signUp({
    email: options.email,
    password: options.password,
    options: options.options,
  });
  
  return { user: data.user, error };
}

/**
 * 用户登录
 */
export async function signIn(email: string, password: string) {
  const supabase = getSupabaseServerClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { user: data.user, session: data.session, error };
}

/**
 * 退出登录
 */
export async function signOut() {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * 重置密码邮件
 */
export async function resetPasswordForEmail(email: string) {
  const supabase = getSupabaseServerClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });
  
  return { error };
}

/**
 * 更新密码
 */
export async function updatePassword(newPassword: string) {
  const supabase = getSupabaseServerClient();
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  return { error };
}

/**
 * 获取当前会话
 */
export async function getSession() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

/**
 * 获取当前用户
 */
export async function getCurrentUser() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

/**
 * 创建客户端
 */
export function createClient() {
  return getSupabaseServerClient();
}
