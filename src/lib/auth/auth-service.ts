/**
 * Supabase Auth 认证服务
 * 基于 Supabase Auth 的完整用户认证系统
 */

import { supabaseBrowser, supabaseAdmin, createSupabaseServer, type UserProfile, type ExtendedUser } from './supabase-client';
import type { AuthError, User, Session } from '@supabase/supabase-js';

// ============================================
// 认证服务类
// ============================================

export class AuthService {
  /**
   * 用户注册 (仅使用邮箱和密码)
   */
  static async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  }): Promise<{ user: User | null; error: AuthError | null }> {
    const { email, password, firstName, lastName, displayName } = data;

    // 使用 Supabase Auth 注册
    const { data: authData, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName,
          display_name: displayName || `${firstName || ''} ${lastName || ''}`.trim(),
        },
      },
    });

    if (error) {
      return { user: null, error };
    }

    // 注册成功后，user_profiles 会通过数据库触发器自动创建
    // 如果需要更新额外信息，可以在这里调用 updateProfile

    return { user: authData.user, error: null };
  }

  /**
   * 用户登录
   */
  static async login(data: {
    email: string;
    password: string;
  }): Promise<{ session: Session | null; error: AuthError | null }> {
    const { email, password } = data;

    const { data: authData, error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { session: null, error };
    }

    // 更新最后登录时间
    if (authData.user) {
      await this.updateLastLogin(authData.user.id);
    }

    return { session: authData.session, error: null };
  }

  /**
   * 用户登出
   */
  static async logout(): Promise<{ error: AuthError | null }> {
    const { error } = await supabaseBrowser.auth.signOut();
    return { error };
  }

  /**
   * 发送邮箱验证邮件
   */
  static async sendEmailVerification(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabaseBrowser.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    return { error };
  }

  /**
   * 发送密码重置邮件
   */
  static async sendPasswordResetEmail(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    return { error };
  }

  /**
   * 重置密码
   */
  static async resetPassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabaseBrowser.auth.updateUser({
      password: newPassword,
    });

    return { error };
  }

  /**
   * 更新用户密码
   */
  static async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabaseBrowser.auth.updateUser({
      password: newPassword,
    });

    return { error };
  }

  /**
   * 获取当前用户
   */
  static async getCurrentUser(): Promise<{ user: User | null; error: AuthError | null }> {
    const { data, error } = await supabaseBrowser.auth.getUser();
    return { user: data.user, error };
  }

  /**
   * 获取当前会话
   */
  static async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabaseBrowser.auth.getSession();
    return { session: data.session, error };
  }

  /**
   * 获取扩展用户信息 (包含 profile)
   */
  static async getExtendedUser(userId: string): Promise<ExtendedUser | null> {
    try {
      // 获取 auth.users 信息
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userError || !userData.user) {
        return null;
      }

      // 获取 user_profiles 信息
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Failed to fetch user profile:', profileError);
      }

      // 如果是创作者，获取创作者资料
      let creatorProfile = undefined;
      if (profileData?.role === 'CREATOR') {
        const { data: creatorData } = await supabaseAdmin
          .from('creator_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        creatorProfile = creatorData || undefined;
      }

      return {
        id: userData.user.id,
        email: userData.user.email || '',
        phone: userData.user.phone,
        email_confirmed_at: userData.user.email_confirmed_at,
        phone_confirmed_at: userData.user.phone_confirmed_at,
        profile: profileData || undefined,
        creator_profile: creatorProfile,
      };
    } catch (error) {
      console.error('Failed to get extended user:', error);
      return null;
    }
  }

  /**
   * 更新用户资料
   */
  static async updateProfile(userId: string, data: Partial<UserProfile>): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .update(data)
        .eq('user_id', userId);

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * 更新最后登录时间
   */
  private static async updateLastLogin(userId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }

  /**
   * 检查用户权限
   */
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('permissions, role')
        .eq('user_id', userId)
        .single();

      if (!data) return false;

      // 超级管理员拥有所有权限
      if (data.role === 'SUPER_ADMIN') return true;

      // 检查自定义权限
      return data.permissions?.includes(permission) || false;
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  /**
   * 检查用户角色
   */
  static async hasRole(userId: string, roles: string[]): Promise<boolean> {
    try {
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!data) return false;

      return roles.includes(data.role);
    } catch (error) {
      console.error('Failed to check role:', error);
      return false;
    }
  }

  /**
   * 更新用户角色 (仅管理员)
   */
  static async updateUserRole(userId: string, role: string, updatedBy: string): Promise<{ error: Error | null }> {
    try {
      // 检查操作者权限
      const hasAdminRole = await this.hasRole(updatedBy, ['ADMIN', 'SUPER_ADMIN']);
      if (!hasAdminRole) {
        return { error: new Error('Unauthorized: Only admins can update user roles') };
      }

      const { error } = await supabaseAdmin
        .from('user_profiles')
        .update({ role })
        .eq('user_id', userId);

      // 记录审计日志
      await this.logAudit({
        user_id: updatedBy,
        action: 'UPDATE_USER_ROLE',
        resource: 'user_profiles',
        resource_id: userId,
        new_value: { role },
        ip_address: '0.0.0.0', // 应从请求中获取
        user_agent: 'System',
        success: !error,
        error_message: error?.message,
      });

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * 创建审计日志
   */
  static async logAudit(data: {
    user_id?: string;
    action: string;
    resource: string;
    resource_id?: string;
    old_value?: any;
    new_value?: any;
    metadata?: any;
    ip_address: string;
    user_agent: string;
    success?: boolean;
    error_message?: string;
  }): Promise<void> {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        user_id: data.user_id || null,
        action: data.action,
        resource: data.resource,
        resource_id: data.resource_id,
        old_value: data.old_value,
        new_value: data.new_value,
        metadata: data.metadata,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        success: data.success ?? true,
        error_message: data.error_message,
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 服务器端获取当前用户
 */
export async function getServerUser(): Promise<User | null> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * 服务器端获取当前会话
 */
export async function getServerSession(): Promise<Session | null> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * 服务器端获取扩展用户信息
 */
export async function getServerExtendedUser(): Promise<ExtendedUser | null> {
  const user = await getServerUser();
  if (!user) return null;
  
  return AuthService.getExtendedUser(user.id);
}
