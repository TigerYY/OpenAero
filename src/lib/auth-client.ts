/**
 * 客户端认证管理
 */

interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

interface SessionInfo {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  user_id: string;
}

export class AuthClient {
  private static readonly SESSION_KEY = 'supabase_session';
  private static readonly USER_KEY = 'user_info';

  /**
   * 保存登录信息
   */
  static saveSession(session: SessionInfo, user: UserInfo) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * 获取当前session
   */
  static getSession(): SessionInfo | null {
    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem(this.SESSION_KEY);
      return sessionStr ? JSON.parse(sessionStr) : null;
    }
    return null;
  }

  /**
   * 获取当前用户信息
   */
  static getUser(): UserInfo | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  /**
   * 检查是否已登录
   */
  static isAuthenticated(): boolean {
    const session = this.getSession();
    const user = this.getUser();
    return !!(session && user);
  }

  /**
   * 获取用户角色
   */
  static getUserRole(): string | null {
    const user = this.getUser();
    return user?.role || null;
  }

  /**
   * 检查是否为管理员
   */
  static isAdmin(): boolean {
    return this.getUserRole() === 'ADMIN';
  }

  /**
   * 检查是否为创作者
   */
  static isCreator(): boolean {
    return this.getUserRole() === 'CREATOR';
  }

  /**
   * 清除登录信息
   */
  static clearSession() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  /**
   * 检查session是否过期
   */
  static isSessionExpired(): boolean {
    const session = this.getSession();
    if (!session) return true;
    
    return Date.now() / 1000 > session.expires_at;
  }

  /**
   * 获取Authorization header
   */
  static getAuthHeader(): { Authorization: string } | {} {
    const session = this.getSession();
    if (session && !this.isSessionExpired()) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }
}

export default AuthClient;