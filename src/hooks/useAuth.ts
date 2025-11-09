import { useSupabaseAuth } from '@/components/providers/SupabaseAuthProvider';
import { UserRole } from '@/shared/types';
import { supabase } from '@/lib/supabase';

// 基于 Supabase 的用户认证接口
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  avatar_url?: string;
}

interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

interface UseAuthReturn {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<AuthSession>;
  updateProfile: (updates: Partial<User>) => Promise<User>;
}

export function useAuth(): UseAuthReturn {
  const { user, session, loading, signIn, signOut, updateProfile: updateSupabaseProfile } = useSupabaseAuth();

  // 转换用户数据格式
  const formatUser = (supabaseUser: any): User | null => {
    if (!supabaseUser) return null;
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || 
           `${supabaseUser.user_metadata?.first_name || ''} ${supabaseUser.user_metadata?.last_name || ''}`.trim() ||
           supabaseUser.email?.split('@')[0] || '',
      role: supabaseUser.user_metadata?.role || UserRole.USER,
      firstName: supabaseUser.user_metadata?.first_name,
      lastName: supabaseUser.user_metadata?.last_name,
      avatar_url: supabaseUser.user_metadata?.avatar_url,
    };
  };

  // 转换会话数据格式
  const formatSession = (supabaseSession: any): AuthSession | null => {
    if (!supabaseSession) return null;
    
    const user = formatUser(supabaseSession.user);
    if (!user) return null;

    return {
      user,
      access_token: supabaseSession.access_token,
      refresh_token: supabaseSession.refresh_token,
      expires_at: supabaseSession.expires_at,
    };
  };

  const formattedUser = formatUser(user);
  const formattedSession = formatSession(session);
  const isAuthenticated = !!user;
  const isLoading = loading;

  // 登录函数 - 使用 Supabase
  const login = async (email: string, password: string, rememberMe?: boolean): Promise<AuthSession> => {
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        throw new Error(error.message || '登录失败');
      }

      // 等待状态更新
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 重新获取会话
      const { data: { session: newSession } } = await supabase.auth.getSession();
      const formattedNewSession = formatSession(newSession);
      
      if (!formattedNewSession) {
        throw new Error('登录成功但无法获取会话信息');
      }

      return formattedNewSession;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  // 登出函数 - 使用 Supabase
  const logout = async (): Promise<void> => {
    try {
      const { error } = await signOut();
      
      if (error) {
        console.error('登出时出现错误:', error);
        throw new Error(error.message || '登出失败');
      }
    } catch (error) {
      console.error('登出失败:', error);
      throw error;
    }
  };

  // 刷新令牌函数
  const refreshToken = async (): Promise<AuthSession> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw new Error(error.message || '令牌刷新失败');
      }

      const formattedNewSession = formatSession(data.session);
      
      if (!formattedNewSession) {
        throw new Error('令牌刷新成功但无法获取会话信息');
      }

      return formattedNewSession;
    } catch (error) {
      console.error('令牌刷新失败:', error);
      throw error;
    }
  };

  // 更新用户资料函数
  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    try {
      if (!formattedUser) {
        throw new Error('用户未登录');
      }

      const { error } = await updateSupabaseProfile({
        firstName: updates.firstName,
        lastName: updates.lastName,
        avatar_url: updates.avatar_url,
      });
      
      if (error) {
        throw new Error(error.message || '更新用户资料失败');
      }

      // 返回更新后的用户信息
      const updatedUser = { ...formattedUser, ...updates };
      return updatedUser;
    } catch (error) {
      console.error('更新用户资料失败:', error);
      throw error;
    }
  };

  return {
    user: formattedUser,
    session: formattedSession,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    updateProfile,
  };
}