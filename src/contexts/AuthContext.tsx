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
  roles: ('USER' | 'CREATOR' | 'REVIEWER' | 'FACTORY_MANAGER' | 'ADMIN' | 'SUPER_ADMIN')[]; // 多角色数组
  role?: 'USER' | 'CREATOR' | 'REVIEWER' | 'FACTORY_MANAGER' | 'ADMIN' | 'SUPER_ADMIN'; // 向后兼容：单一角色（已废弃）
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
        const response = await fetch('/api/users/me', {
          credentials: 'include', // 确保发送 cookies
        });
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
                  roles: ['USER'],
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
      const response = await fetch('/api/users/me', {
        credentials: 'include', // 确保发送 cookies
      });
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

      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        
        // 同步 session 到 cookies（通过 API 路由）
        // 这样服务器端 API 路由可以读取认证信息
        try {
          await fetch('/api/auth/sync-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }),
          });
        } catch (syncError) {
          console.warn('同步 session 到 cookies 失败:', syncError);
          // 不阻止登录流程，继续执行
        }
        
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
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/auth/callback?next=/welcome`,
          data: metadata,
        },
      });

      if (error) {
        console.error('注册错误:', error);
        return { error };
      }

      // 检查是否成功发送验证邮件
      if (data.user && !data.session) {
        // 用户已创建但未验证，说明验证邮件应该已发送
        console.log('用户注册成功，验证邮件应已发送到:', email);
      }

      return { error: null };
    } catch (error) {
      console.error('注册异常:', error);
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
   * 同步 session 到 cookies（用于服务器端 API 路由）
   */
  const syncSessionToCookies = async (session: Session | null) => {
    if (!session?.access_token) return;
    
    try {
      await fetch('/api/auth/sync-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
        }),
      });
    } catch (error) {
      console.warn('同步 session 到 cookies 失败:', error);
    }
  };

  /**
   * 监听认证状态变化
   */
  useEffect(() => {
    // 获取初始会话
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // 同步 session 到 cookies
          try {
            await syncSessionToCookies(session);
          } catch (syncError) {
            console.warn('同步 session 到 cookies 失败:', syncError);
          }
          // 获取用户资料（不阻塞 loading 状态）
          fetchUserProfile(session.user.id).catch((profileError) => {
            console.error('获取用户资料失败:', profileError);
          });
        }
      } catch (error) {
        console.error('处理会话时出错:', error);
      } finally {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('获取会话失败:', error);
      setLoading(false);
    });

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // 同步 session 到 cookies
          try {
            await syncSessionToCookies(session);
          } catch (syncError) {
            console.warn('同步 session 到 cookies 失败:', syncError);
          }
          // 获取用户资料（不阻塞 loading 状态）
          fetchUserProfile(session.user.id).catch((profileError) => {
            console.error('获取用户资料失败:', profileError);
          });
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('处理认证状态变化时出错:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 辅助函数：检查用户是否有指定角色（支持多角色）
  const checkRole = (requiredRoles: string | string[]): boolean => {
    if (!profile) return false;
    const userRoles = Array.isArray(profile.roles) 
      ? profile.roles 
      : (profile.role ? [profile.role] : []);
    const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return required.some(role => userRoles.includes(role as any));
  };

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
    hasRole: checkRole,
    isAdmin: checkRole(['ADMIN', 'SUPER_ADMIN']),
    isCreator: checkRole(['CREATOR', 'ADMIN', 'SUPER_ADMIN']),
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
