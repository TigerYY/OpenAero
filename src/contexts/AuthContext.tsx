'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseBrowser as supabase } from '@/lib/auth/supabase-client';

/**
 * 用户资料信息接口 (对应 user_profiles 表)
 */
export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar?: string;
  bio?: string;
  role: 'USER' | 'CREATOR' | 'REVIEWER' | 'FACTORY_MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
  permissions: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  is_blocked: boolean;
  blocked_reason?: string;
  blocked_at?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

/**
 * 认证上下文状态接口
 */
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (newPassword: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string | string[]) => boolean;
  isAdmin: boolean;
  isCreator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider 组件
 * 提供全局认证状态管理
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 获取用户扩展信息 (从 user_profiles 表)
   * 优先使用 API 端点，失败时回退到直接查询
   */
  const fetchUserProfile = async (userId: string) => {
    try {
      // 优先尝试使用 API 端点
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.profile) {
            setProfile(data.data.profile as UserProfile);
            return;
          }
        }
      } catch (apiError) {
        console.warn('API 获取用户资料失败，尝试直接查询:', apiError);
      }

      // 回退到直接查询 Supabase
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('获取用户资料失败:', error);
        
        // 如果是"未找到记录"错误，尝试通过 API 创建
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          console.log('未找到用户profile，尝试通过 API 创建...');
          
          // 尝试通过 API 创建（如果 API 支持自动创建）
          // 或者尝试直接创建
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('user_profiles')
              .insert([
                {
                  user_id: userId,
                  role: 'USER',
                  status: 'ACTIVE',
                },
              ])
              .select()
              .single();

            if (createError) {
              console.error('创建用户profile失败:', createError);
              // 不设置为 null，让页面显示友好的错误提示
              // setProfile(null);
            } else if (newProfile) {
              console.log('用户profile创建成功:', newProfile);
              setProfile(newProfile as UserProfile);
            }
          } catch (createErr) {
            console.error('创建用户profile异常:', createErr);
          }
        } else {
          // 其他错误（如权限问题），不设置为 null，让页面显示错误提示
          console.error('获取用户资料错误:', error.code, error.message);
        }
        return;
      }

      if (data) {
        setProfile(data as UserProfile);
      } else {
        // 数据为空，但不设置为 null，让页面有机会显示友好提示
        console.warn('用户profile数据为空');
      }
    } catch (error) {
      console.error('获取用户资料异常:', error);
      // 不设置为 null，让页面显示友好的错误提示
    }
  };

  /**
   * 刷新用户资料
   * 优先使用 API 端点获取完整用户信息
   */
  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      // 优先使用 API 端点获取完整用户信息（包含 phone 等字段）
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // 更新 user 和 profile
          if (data.data.profile) {
            setProfile(data.data.profile as UserProfile);
          }
          // 注意: user 对象来自 Supabase Auth，不能直接更新
          // phone 等信息需要从 data.data.phone 获取，但这里我们主要更新 profile
        }
      } else {
        // API 失败，回退到直接查询
        await fetchUserProfile(user.id);
      }
    } catch (error) {
      console.error('刷新用户资料失败:', error);
      // 回退到直接查询
      await fetchUserProfile(user.id);
    }
  };

  /**
   * 用户登录
   */
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchUserProfile(data.user.id);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  /**
   * 用户注册
   */
  const signUp = async (
    email: string,
    password: string,
    metadata?: {
      first_name?: string;
      last_name?: string;
      display_name?: string;
    }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  /**
   * 用户登出
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  /**
   * 发送密码重置邮件
   */
  const sendPasswordResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  /**
   * 重置密码
   */
  const resetPassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  /**
   * 检查用户是否有指定角色
   */
  const hasRole = (role: string | string[]): boolean => {
    if (!profile) return false;

    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(profile.role);
  };

  /**
   * 监听认证状态变化
   */
  useEffect(() => {
    // 获取初始会话
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('获取会话失败:', error);
      setLoading(false);
    });

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    sendPasswordResetEmail,
    resetPassword,
    refreshProfile,
    isAuthenticated: !!user,
    hasRole,
    isAdmin: profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN',
    isCreator: profile?.role === 'CREATOR' || profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * 获取认证上下文
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
