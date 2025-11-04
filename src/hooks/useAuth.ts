import { useSession, signIn, signOut } from 'next-auth/react';

// 基于 NextAuth.js 的简化版本
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthSession {
  user: User;
  expires: string;
}

interface UseAuthReturn {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<User>;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = !!session?.user;

  // 登录函数 - 使用 NextAuth.js 的 signIn
  const login = async (email: string, password: string, rememberMe?: boolean): Promise<void> => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/'
      });

      if (result?.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  // 登出函数 - 使用 NextAuth.js 的 signOut
  const logout = async (): Promise<void> => {
    try {
      await signOut({ redirect: false });
    } catch (error) {
      console.error('登出失败:', error);
      throw error;
    }
  };

  // 更新用户资料 - 简化版本，实际需要调用API
  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    try {
      // 这里应该调用API来更新用户资料
      // 暂时返回当前用户信息
      if (!session?.user) {
        throw new Error('用户未登录');
      }
      
      const updatedUser = { ...session.user, ...updates };
      return updatedUser;
    } catch (error) {
      console.error('更新用户资料失败:', error);
      throw error;
    }
  };

  return {
    user: session?.user ? {
      id: session.user.id || '',
      email: session.user.email || '',
      name: session.user.name || '',
      role: session.user.role || 'USER'
    } : null,
    session: session ? {
      user: {
        id: session.user.id || '',
        email: session.user.email || '',
        name: session.user.name || '',
        role: session.user.role || 'USER'
      },
      expires: session.expires || ''
    } : null,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateProfile,
  };
}