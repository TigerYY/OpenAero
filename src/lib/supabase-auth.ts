/**
 * Supabase认证系统
 * 替换NextAuth.js，使用Supabase Auth
 */

import { 
  AuthError, 
  AuthResponse, 
  Session, 
  User, 
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
  Provider
} from '@supabase/supabase-js';
import { supabase, getSupabaseClient } from './supabase';
import { UserRole } from '@/shared/types';

// 扩展用户元数据类型
interface UserMetadata {
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  avatar_url?: string;
}

/**
 * Supabase认证管理器
 */
export class SupabaseAuthManager {
  private client = getSupabaseClient();

  /**
   * 用户注册
   */
  async signUp(credentials: SignUpWithPasswordCredentials<'email'> & {
    options?: {
      data?: UserMetadata;
    };
  }): Promise<AuthResponse> {
    try {
      const emailRedirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`;

      const response = await this.client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          ...credentials.options,
          emailRedirectTo,
        },
      });

      // 如果注册成功且用户已创建，发送自定义验证邮件
      if (response.user && !response.error) {
        await this.sendCustomVerificationEmail(response.user.email);
      }

      return response;
    } catch (error) {
      console.error('注册失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 发送自定义验证邮件
   */
  private async sendCustomVerificationEmail(email: string): Promise<void> {
    try {
      const { emailService } = await import('./email-service');
      
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?email=${encodeURIComponent(email)}`;
      
      const result = await emailService.sendVerificationEmail(email, verificationUrl);
      
      if (result.success) {
        console.log('验证邮件发送成功:', email);
      } else {
        console.error('验证邮件发送失败:', result.error);
      }
    } catch (error) {
      console.error('发送验证邮件时发生错误:', error);
    }
  }

  /**
   * 用户登录
   */
  async signIn(credentials: SignInWithPasswordCredentials<'email'>): Promise<AuthResponse> {
    try {
      const response = await this.client.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      return response;
    } catch (error) {
      console.error('登录失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * OAuth功能已禁用 - 仅支持邮箱登录
   * 如需启用OAuth，请参考项目文档配置相关提供商
   */
  async signInWithOAuth(provider: Provider): Promise<void> {
    throw new Error('OAuth登录功能已禁用，请使用邮箱登录');
  }

  /**
   * 用户登出
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      return await this.client.auth.signOut();
    } catch (error) {
      console.error('登出失败:', error);
      return { error: this.handleError(error) };
    }
  }

  /**
   * 获取当前用户
   */
  async getUser(): Promise<{ data: { user: User | null }, error: AuthError | null }> {
    try {
      return await this.client.auth.getUser();
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return { data: { user: null }, error: this.handleError(error) };
    }
  }

  /**
   * 获取当前会话
   */
  async getSession(): Promise<{ data: { session: Session | null }, error: AuthError | null }> {
    try {
      return await this.client.auth.getSession();
    } catch (error) {
      console.error('获取会话失败:', error);
      return { data: { session: null }, error: this.handleError(error) };
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(updates: {
    email?: string;
    password?: string;
    data?: UserMetadata;
  }): Promise<AuthResponse> {
    try {
      const response = await this.client.auth.updateUser({
        email: updates.email,
        password: updates.password,
        data: updates.data,
      });

      return response;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      return await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      });
    } catch (error) {
      console.error('密码重置失败:', error);
      return { error: this.handleError(error) };
    }
  }

  /**
   * 验证邮箱
   */
  async verifyOtp(params: {
    email?: string;
    token: string;
    type: 'signup' | 'recovery' | 'email_change';
  }): Promise<AuthResponse> {
    try {
      return await this.client.auth.verifyOtp(params);
    } catch (error) {
      console.error('OTP验证失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 监听认证状态变化
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }

  /**
   * 检查用户角色
   */
  async getUserRole(): Promise<UserRole | null> {
    const { data: { user } } = await this.getUser();
    return user?.user_metadata?.role || UserRole.USER;
  }

  /**
   * 检查是否为管理员
   */
  async isAdmin(): Promise<boolean> {
    const role = await this.getUserRole();
    return role === UserRole.ADMIN;
  }

  /**
   * 检查是否为创作者
   */
  async isCreator(): Promise<boolean> {
    const role = await this.getUserRole();
    return role === UserRole.CREATOR;
  }

  /**
   * 错误处理
   */
  private handleError(error: unknown): AuthError {
    if (error instanceof Error) {
      return {
        name: 'AuthError',
        message: error.message,
        status: 500,
      };
    }

    return {
      name: 'AuthError',
      message: '未知认证错误',
      status: 500,
    };
  }
}

// 导出单例实例
export const authManager = new SupabaseAuthManager();

// 导出便捷函数
export const signUp = (credentials: SignUpWithPasswordCredentials<'email'> & {
  options?: {
    data?: UserMetadata;
  };
}) => authManager.signUp(credentials);

export const signIn = (credentials: SignInWithPasswordCredentials<'email'>) => 
  authManager.signIn(credentials);

// OAuth功能已禁用
// export const signInWithOAuth = (provider: Provider) => 
//   authManager.signInWithOAuth(provider);

export const signOut = () => authManager.signOut();

export const getCurrentUser = () => authManager.getUser();

export const getCurrentSession = () => authManager.getSession();

export const updateUser = (updates: {
  email?: string;
  password?: string;
  data?: UserMetadata;
}) => authManager.updateUser(updates);

export const resetPassword = (email: string) => authManager.resetPassword(email);

export const verifyOtp = (params: {
  email?: string;
  token: string;
  type: 'signup' | 'recovery' | 'email_change';
}) => authManager.verifyOtp(params);

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => 
  authManager.onAuthStateChange(callback);

export const getUserRole = () => authManager.getUserRole();

export const isAdmin = () => authManager.isAdmin();

export const isCreator = () => authManager.isCreator();

// 刷新会话令牌
export const refreshSession = async () => {
  try {
    const { data, error } = await authManager.client.auth.refreshSession();
    return { data, error };
  } catch (error) {
    console.error('刷新会话失败:', error);
    return { data: null, error: authManager.handleError(error) };
  }
};

// 重置密码邮件发送
export const resetPasswordForEmail = async (email: string) => {
  try {
    // 先调用Supabase的重置密码功能
    const supabaseResponse = await authManager.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    // 然后发送自定义的重置密码邮件
    if (!supabaseResponse.error) {
      const { emailService } = await import('./email-service');
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?email=${encodeURIComponent(email)}`;
      
      const emailResult = await emailService.sendPasswordResetEmail(email, resetUrl);
      
      if (emailResult.success) {
        console.log('重置密码邮件发送成功:', email);
      } else {
        console.error('重置密码邮件发送失败:', emailResult.error);
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error('发送重置密码邮件失败:', error);
    return { error: authManager.handleError(error) };
  }
};

// 导出createClient函数别名
export const createClient = getSupabaseClient;