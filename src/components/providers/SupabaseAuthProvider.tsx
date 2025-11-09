/**
 * Supabase认证提供者
 * 替换NextAuth的SessionProvider
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, onAuthStateChange } from '@/lib/supabase';
import { UserRole } from '@/shared/types';

// 扩展用户类型
interface AuthUser extends User {
  role?: UserRole;
  firstName?: string;
  lastName?: string;
}

// 认证上下文类型
interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: { firstName?: string; lastName?: string; avatar_url?: string }) => Promise<{ error: any }>;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 处理认证状态变化
  useEffect(() => {
    // 获取初始会话
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        const enrichedUser = await enrichUser(session.user);
        setUser(enrichedUser);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // 监听认证状态变化
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        const enrichedUser = await enrichUser(session.user);
        setUser(enrichedUser);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 丰富用户信息
  const enrichUser = async (user: User): Promise<AuthUser> => {
    const metadata = user.user_metadata || {};
    
    return {
      ...user,
      role: metadata.role || UserRole.USER,
      firstName: metadata.first_name,
      lastName: metadata.last_name,
    };
  };

  // 登录
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const signUp = async (email: string, password: string, metadata?: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: metadata?.firstName,
            last_name: metadata?.lastName,
            role: metadata?.role || UserRole.USER,
            ...metadata,
          },
        },
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };



  // 重置密码
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // 更新用户资料
  const updateProfile = async (updates: { 
    firstName?: string; 
    lastName?: string; 
    avatar_url?: string 
  }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: updates.firstName,
          last_name: updates.lastName,
          avatar_url: updates.avatar_url,
        },
      });
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// 使用认证上下文的Hook
export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}

// 便捷的认证状态检查Hook
export function useAuth() {
  const { user, loading } = useSupabaseAuth();
  
  return {
    isAuthenticated: !!user,
    isLoading: loading,
    user,
  };
}

// 角色检查Hook
export function useUserRole() {
  const { user } = useSupabaseAuth();
  
  return {
    role: user?.role || UserRole.USER,
    isAdmin: user?.role === UserRole.ADMIN,
    isCreator: user?.role === UserRole.CREATOR,
    isUser: user?.role === UserRole.USER,
  };
}