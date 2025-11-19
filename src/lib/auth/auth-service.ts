/**
 * Supabase Auth 认证服务
 * 基于 Supabase Auth 的完整用户认证系统
 */

import { supabaseBrowser, createSupabaseAdmin, createSupabaseServer, type UserProfile, type ExtendedUser } from './supabase-client';
import type { AuthError, User, Session } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { convertSnakeToCamel } from '../field-mapper';

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
      const supabaseAdmin = createSupabaseAdmin();
      
      console.log('[getExtendedUser] 开始获取用户信息:', userId);
      
      // 获取 auth.users 信息
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userError || !userData.user) {
        console.error('[getExtendedUser] 获取 auth.users 失败:', userError);
        return null;
      }
      
      console.log('[getExtendedUser] 成功获取 auth.users');

      // 获取 user_profiles 信息
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('[getExtendedUser] 获取 user_profiles 失败:', {
          error: profileError,
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
        });
      } else {
        console.log('[getExtendedUser] 成功获取 user_profiles:', profileData ? 'exists' : 'null');
      }

      // 如果是创作者，获取创作者资料（支持多角色）
      let creatorProfile = undefined;
      const userRoles = Array.isArray(profileData?.roles) 
        ? profileData.roles 
        : (profileData?.role ? [profileData.role] : []);
      if (userRoles.includes('CREATOR')) {
        const { data: creatorData } = await supabaseAdmin
          .from('creator_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        creatorProfile = creatorData || undefined;
      }

      // 转换字段名为 camelCase
      const convertedProfile = profileData ? convertSnakeToCamel(profileData) : undefined;
      const convertedCreatorProfile = creatorProfile ? convertSnakeToCamel(creatorProfile) : undefined;

      return {
        id: userData.user.id,
        email: userData.user.email || '',
        phone: userData.user.phone,
        emailConfirmedAt: userData.user.email_confirmed_at,
        phoneConfirmedAt: userData.user.phone_confirmed_at,
        profile: convertedProfile,
        creatorProfile: convertedCreatorProfile,
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
      const supabaseAdmin = createSupabaseAdmin();
      
      // 添加 updated_at 字段
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };
      
      console.log('[AuthService.updateProfile] 更新数据:', { userId, updateData });
      
      const { data: result, error } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();
      
      console.log('[AuthService.updateProfile] 更新结果:', { result, error });

      return { error };
    } catch (error) {
      console.error('[AuthService.updateProfile] 异常:', error);
      return { error: error as Error };
    }
  }

  /**
   * 创建用户资料（如果不存在）
   */
  static async createProfileIfNotExists(userId: string, data: Partial<UserProfile> = {}): Promise<{ error: Error | null }> {
    try {
      const supabaseAdmin = createSupabaseAdmin();
      
      // 先检查是否存在
      const { data: existing } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // 已存在，直接返回成功
        return { error: null };
      }

      // 不存在，创建新记录
      const { error } = await supabaseAdmin
        .from('user_profiles')
          .insert([
            {
              user_id: userId,
              roles: data.roles || ['USER'],
              status: 'ACTIVE',
              ...data,
            },
          ]);

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * 更新用户手机号码（存储在 auth.users 中）
   */
  static async updateUserPhone(userId: string, phone: string | null): Promise<{ error: AuthError | null }> {
    try {
      const supabaseAdmin = createSupabaseAdmin();
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        phone: phone || undefined,
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * 更新最后登录时间
   */
  private static async updateLastLogin(userId: string): Promise<void> {
    try {
      const supabaseAdmin = createSupabaseAdmin();
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
      const supabaseAdmin = createSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('permissions, role')
        .eq('user_id', userId)
        .single();

      if (!data) return false;

      // 支持多角色数组或单一角色（向后兼容）
      const userRoles = Array.isArray(data.roles) 
        ? data.roles 
        : (data.role ? [data.role] : []);

      // 超级管理员和管理员拥有所有权限
      if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN')) return true;

      // 检查自定义权限
      if (data.permissions?.includes(permission)) return true;

      // TODO: 检查角色默认权限（需要导入权限函数）
      return false;
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
      const supabaseAdmin = createSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('roles, role') // 同时查询 roles 和 role（向后兼容）
        .eq('user_id', userId)
        .single();

      if (!data) return false;

      // 支持多角色数组或单一角色（向后兼容）
      const userRoles = Array.isArray(data.roles) 
        ? data.roles 
        : (data.role ? [data.role] : []);

      return roles.some(role => userRoles.includes(role));
    } catch (error) {
      console.error('Failed to check role:', error);
      return false;
    }
  }

  /**
   * 更新用户角色 (仅管理员) - 支持多角色
   */
  static async updateUserRole(userId: string, roles: string | string[], updatedBy: string): Promise<{ error: Error | null }> {
    try {
      // 检查操作者权限
      const hasAdminRole = await this.hasRole(updatedBy, ['ADMIN', 'SUPER_ADMIN']);
      if (!hasAdminRole) {
        return { error: new Error('Unauthorized: Only admins can update user roles') };
      }

      // 确保 roles 是数组
      const rolesArray = Array.isArray(roles) ? roles : [roles];

      const supabaseAdmin = createSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .update({ roles: rolesArray })
        .eq('user_id', userId);

      // 记录审计日志
      await this.logAudit({
        user_id: updatedBy,
        action: 'UPDATE_USER_ROLE',
        resource: 'user_profiles',
        resource_id: userId,
        new_value: { roles: rolesArray },
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
      const supabaseAdmin = createSupabaseAdmin();
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
 * 用于服务器组件
 */
export async function getServerUser(): Promise<User | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * 从 API 请求中获取当前用户
 * 用于 API 路由
 */
export async function getServerUserFromRequest(request: NextRequest): Promise<User | null> {
  try {
    const { createSupabaseServerFromRequest } = await import('./supabase-client');
    const supabase = createSupabaseServerFromRequest(request);
    
    // 调试：检查 cookies
    const cookies = request.cookies.getAll();
    console.log('[getServerUserFromRequest] 所有 cookies:', cookies.map(c => ({ name: c.name, hasValue: !!c.value })));
    
    // 首先尝试获取 session（从 cookies 中读取）
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[getServerUserFromRequest] 获取 session 失败:', sessionError.message);
    } else if (sessionData?.session?.user) {
      console.log('[getServerUserFromRequest] 通过 session 成功获取用户:', sessionData.session.user.id);
      return sessionData.session.user;
    }
    
    // 如果 session 不存在，尝试使用 getUser（需要 access token）
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('[getServerUserFromRequest] 获取用户失败:', error.message);
      return null;
    }
    
    if (!data.user) {
      console.warn('[getServerUserFromRequest] 用户数据为空');
      return null;
    }
    
    console.log('[getServerUserFromRequest] 成功获取用户:', data.user.id);
    return data.user;
  } catch (error) {
    console.error('[getServerUserFromRequest] 异常:', error);
    return null;
  }
}

/**
 * 服务器端获取当前会话
 */
export async function getServerSession(): Promise<Session | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * 服务器端获取扩展用户信息
 * 用于服务器组件
 */
export async function getServerExtendedUser(): Promise<ExtendedUser | null> {
  const user = await getServerUser();
  if (!user) return null;
  
  return AuthService.getExtendedUser(user.id);
}

/**
 * 从 API 请求中获取扩展用户信息
 * 用于 API 路由
 */
export async function getServerExtendedUserFromRequest(request: NextRequest): Promise<ExtendedUser | null> {
  const user = await getServerUserFromRequest(request);
  if (!user) return null;
  
  return AuthService.getExtendedUser(user.id);
}
