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
   */
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('获取用户资料失败:', error);
        return;
      }

      if (data) {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('获取用户资料失败:', error);
    }
  };

  /**
   * 刷新用户资料
   */
  const refreshProfile = async () => {
    if (user) {
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
      username?: string;
      fullName?: string;
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
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
