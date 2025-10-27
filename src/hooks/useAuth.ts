import { useState, useEffect, useCallback, useRef } from 'react';
import { authManager, AuthSession, User } from '@/lib/auth';

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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  // 自动刷新token的函数
  const scheduleTokenRefresh = useCallback((expiresAt: string) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    
    // 在token过期前5分钟刷新
    const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000);

    refreshTimeoutRef.current = setTimeout(async () => {
      if (!isRefreshingRef.current && session?.refreshToken) {
        try {
          isRefreshingRef.current = true;
          console.log('自动刷新token...');
          const newSession = await authManager.refreshToken();
          setSession(newSession);
          setUser(newSession.user);
          
          // 安排下次刷新
          scheduleTokenRefresh(newSession.expiresAt);
        } catch (error) {
          console.error('自动刷新token失败:', error);
          // 如果刷新失败，清除会话
          await logout();
        } finally {
          isRefreshingRef.current = false;
        }
      }
    }, refreshTime);
  }, [session?.refreshToken]);

  // 手动刷新token
  const refreshToken = useCallback(async (): Promise<AuthSession> => {
    if (isRefreshingRef.current) {
      throw new Error('Token刷新正在进行中');
    }

    try {
      isRefreshingRef.current = true;
      const newSession = await authManager.refreshToken();
      setSession(newSession);
      setUser(newSession.user);
      
      // 重新安排自动刷新
      scheduleTokenRefresh(newSession.expiresAt);
      
      return newSession;
    } catch (error) {
      console.error('手动刷新token失败:', error);
      await logout();
      throw error;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [scheduleTokenRefresh]);

  // 登录函数
  const login = useCallback(async (email: string, password: string, rememberMe?: boolean): Promise<AuthSession> => {
    try {
      setIsLoading(true);
      const newSession = await authManager.login({ email, password, rememberMe });
      setSession(newSession);
      setUser(newSession.user);
      
      // 安排自动刷新
      scheduleTokenRefresh(newSession.expiresAt);
      
      return newSession;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [scheduleTokenRefresh]);

  // 登出函数
  const logout = useCallback(async (): Promise<void> => {
    try {
      // 清除自动刷新定时器
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      await authManager.logout();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('登出失败:', error);
      // 即使登出失败，也要清除本地状态
      setSession(null);
      setUser(null);
    }
  }, []);

  // 更新用户资料
  const updateProfile = useCallback(async (updates: Partial<User>): Promise<User> => {
    try {
      // 提取profile相关的更新
      const profileUpdates = {
        firstName: updates.profile?.firstName,
        lastName: updates.profile?.lastName,
        avatar: updates.profile?.avatar,
        bio: updates.profile?.bio,
        location: updates.profile?.location,
        website: updates.profile?.website,
        socialLinks: updates.profile?.socialLinks,
        skills: updates.profile?.skills,
        interests: updates.profile?.interests,
      };
      
      const updatedUser = await authManager.updateProfile(profileUpdates);
      setUser(updatedUser);
      
      // 更新session中的用户信息
      if (session) {
        const updatedSession = { ...session, user: updatedUser };
        setSession(updatedSession);
      }
      
      return updatedUser;
    } catch (error) {
      console.error('更新用户资料失败:', error);
      throw error;
    }
  }, [session]);

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        
        // 从本地存储恢复会话
        authManager.restoreSession();
        
        const currentSession = authManager.getCurrentSession();
        const currentUser = authManager.getCurrentUser();
        
        if (currentSession && currentUser) {
          // 检查token是否过期
          if (authManager.isTokenExpired()) {
            try {
              // 尝试刷新token
              const newSession = await authManager.refreshToken();
              setSession(newSession);
              setUser(newSession.user);
              scheduleTokenRefresh(newSession.expiresAt);
            } catch (error) {
              console.error('初始化时刷新token失败:', error);
              // 如果刷新失败，清除会话
              await logout();
              setSession(null);
              setUser(null);
            }
          } else {
            setSession(currentSession);
            setUser(currentUser);
            scheduleTokenRefresh(currentSession.expiresAt);
          }
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 清理函数
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [scheduleTokenRefresh]);

  // 监听页面可见性变化，在页面重新可见时检查token状态
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && session && !isRefreshingRef.current) {
        // 检查token是否即将过期（5分钟内）
        const expiryTime = new Date(session.expiresAt).getTime();
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;
        
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          try {
            await refreshToken();
          } catch (error) {
            console.error('页面可见时刷新token失败:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, refreshToken]);

  return {
    user,
    session,
    isAuthenticated: !!user && !!session,
    isLoading,
    login,
    logout,
    refreshToken,
    updateProfile,
  };
}