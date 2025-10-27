// 权限系统和认证管理库

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  profile: UserProfile;
  settings: UserSettings;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
  skills?: string[];
  interests?: string[];
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: {
    mentions: boolean;
    comments: boolean;
    likes: boolean;
    follows: boolean;
    system: boolean;
  };
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showLocation: boolean;
  allowMessages: boolean;
  allowFollows: boolean;
}

export type UserRole = 'admin' | 'moderator' | 'user' | 'guest';

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: UserRole;
  description: string;
  permissions: Permission[];
  level: number; // 权限级别，数字越大权限越高
}

export interface AuthSession {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

// 权限检查函数
export function hasPermission(user: User, permission: string): boolean {
  if (!user.permissions || user.permissions.length === 0) {
    return false;
  }
  
  return user.permissions.some(p => 
    p.resource === '*' || 
    `${p.action}:${p.resource}` === permission
  );
}

export function canAccessResource(user: User, resource: string, action: string): boolean {
  const permission = `${action}:${resource}`;
  return hasPermission(user, permission);
}

export function hasMinimumRole(user: User, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    guest: 0,
    user: 1,
    moderator: 2,
    admin: 3
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// 权限装饰器工厂（简化版本，实际使用时需要配合具体的认证上下文）
export function requirePermission(resource: string, action: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      // 注意：实际使用时需要从上下文获取当前用户
      // const user = getCurrentUserFromContext();
      // if (!user || !canAccessResource(user, resource, action)) {
      //   throw new Error('权限不足');
      // }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// 角色装饰器工厂（简化版本）
export function requireRole(role: UserRole) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      // 注意：实际使用时需要从上下文获取当前用户
      // const user = getCurrentUserFromContext();
      // if (!user || !hasMinimumRole(user, role)) {
      //   throw new Error('角色权限不足');
      // }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// 认证管理类
export class AuthManager {
  private static instance: AuthManager;
  private currentUser: User | null = null;
  private session: AuthSession | null = null;
  
  private constructor() {}
  
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }
  
  // 登录
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        throw new Error('登录失败');
      }
      
      const session: AuthSession = await response.json();
      this.setSession(session);
      
      return session;
    } catch (error) {
      console.error('登录错误:', error);
      throw error;
    }
  }
  
  // 注册
  async register(data: RegisterData): Promise<User> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('注册失败');
      }
      
      return await response.json();
    } catch (error) {
      console.error('注册错误:', error);
      throw error;
    }
  }
  
  // 登出
  async logout(): Promise<void> {
    try {
      if (this.session) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.session.token}`,
          },
        });
      }
    } catch (error) {
      console.error('登出错误:', error);
    } finally {
      this.clearSession();
    }
  }
  
  // 刷新令牌
  async refreshToken(): Promise<AuthSession> {
    if (!this.session?.refreshToken) {
      throw new Error('没有刷新令牌');
    }
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.session.refreshToken,
        }),
      });
      
      if (!response.ok) {
        throw new Error('令牌刷新失败');
      }
      
      const newSession: AuthSession = await response.json();
      this.setSession(newSession);
      
      return newSession;
    } catch (error) {
      console.error('令牌刷新错误:', error);
      this.clearSession();
      throw error;
    }
  }
  
  // 获取当前用户
  getCurrentUser(): User | null {
    return this.currentUser;
  }
  
  // 获取当前会话
  getCurrentSession(): AuthSession | null {
    return this.session;
  }
  
  // 检查是否已登录
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.session !== null;
  }
  
  // 检查令牌是否过期
  isTokenExpired(): boolean {
    if (!this.session) return true;
    
    const expiresAt = new Date(this.session.expiresAt);
    return expiresAt <= new Date();
  }
  
  // 设置会话
  private setSession(session: AuthSession): void {
    this.session = session;
    this.currentUser = session.user;
    
    // 保存到本地存储
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_session', JSON.stringify(session));
    }
  }
  
  // 清除会话
  private clearSession(): void {
    this.session = null;
    this.currentUser = null;
    
    // 从本地存储移除
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_session');
    }
  }
  
  // 从本地存储恢复会话
  restoreSession(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const sessionData = localStorage.getItem('auth_session');
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        
        // 检查是否过期
        if (new Date(session.expiresAt) > new Date()) {
          this.setSession(session);
        } else {
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('恢复会话错误:', error);
      this.clearSession();
    }
  }
  
  // 密码重置请求
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error('密码重置请求失败');
      }
    } catch (error) {
      console.error('密码重置请求错误:', error);
      throw error;
    }
  }
  
  // 重置密码
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });
      
      if (!response.ok) {
        throw new Error('密码重置失败');
      }
    } catch (error) {
      console.error('密码重置错误:', error);
      throw error;
    }
  }
  
  // 更新用户资料
  async updateProfile(updates: Partial<UserProfile>): Promise<User> {
    if (!this.session) {
      throw new Error('未登录');
    }
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('更新资料失败');
      }
      
      const updatedUser: User = await response.json();
      
      // 更新本地用户信息
      if (this.session) {
        this.session.user = updatedUser;
        this.currentUser = updatedUser;
        this.setSession(this.session);
      }
      
      return updatedUser;
    } catch (error) {
      console.error('更新资料错误:', error);
      throw error;
    }
  }
  
  // 更新用户设置
  async updateSettings(updates: Partial<UserSettings>): Promise<User> {
    if (!this.session) {
      throw new Error('未登录');
    }
    
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('更新设置失败');
      }
      
      const updatedUser: User = await response.json();
      
      // 更新本地用户信息
      if (this.session) {
        this.session.user = updatedUser;
        this.currentUser = updatedUser;
        this.setSession(this.session);
      }
      
      return updatedUser;
    } catch (error) {
      console.error('更新设置错误:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const authManager = AuthManager.getInstance();

// 默认权限定义
export const DEFAULT_PERMISSIONS: Permission[] = [
  // 用户权限
  { id: 'user_read', name: '查看用户', description: '查看用户信息', resource: 'user', action: 'read' },
  { id: 'user_update', name: '更新用户', description: '更新用户信息', resource: 'user', action: 'update' },
  { id: 'user_delete', name: '删除用户', description: '删除用户', resource: 'user', action: 'delete' },
  
  // 内容权限
  { id: 'content_read', name: '查看内容', description: '查看内容', resource: 'content', action: 'read' },
  { id: 'content_create', name: '创建内容', description: '创建新内容', resource: 'content', action: 'create' },
  { id: 'content_update', name: '更新内容', description: '更新内容', resource: 'content', action: 'update' },
  { id: 'content_delete', name: '删除内容', description: '删除内容', resource: 'content', action: 'delete' },
  
  // 评论权限
  { id: 'comment_read', name: '查看评论', description: '查看评论', resource: 'comment', action: 'read' },
  { id: 'comment_create', name: '创建评论', description: '创建评论', resource: 'comment', action: 'create' },
  { id: 'comment_update', name: '更新评论', description: '更新评论', resource: 'comment', action: 'update' },
  { id: 'comment_delete', name: '删除评论', description: '删除评论', resource: 'comment', action: 'delete' },
  
  // 管理权限
  { id: 'admin_panel', name: '管理面板', description: '访问管理面板', resource: 'admin', action: 'access' },
  { id: 'admin_users', name: '用户管理', description: '管理用户', resource: 'admin', action: 'manage_users' },
  { id: 'admin_content', name: '内容管理', description: '管理内容', resource: 'admin', action: 'manage_content' },
  { id: 'admin_system', name: '系统管理', description: '系统设置', resource: 'admin', action: 'manage_system' },
];

// 默认角色定义
export const DEFAULT_ROLES: Role[] = [
  {
    id: 'guest',
    name: 'guest',
    description: '访客用户',
    level: 0,
    permissions: [
      DEFAULT_PERMISSIONS.find(p => p.id === 'content_read')!,
      DEFAULT_PERMISSIONS.find(p => p.id === 'comment_read')!,
    ]
  },
  {
    id: 'user',
    name: 'user',
    description: '普通用户',
    level: 1,
    permissions: [
      DEFAULT_PERMISSIONS.find(p => p.id === 'content_read')!,
      DEFAULT_PERMISSIONS.find(p => p.id === 'content_create')!,
      DEFAULT_PERMISSIONS.find(p => p.id === 'content_update')!,
      DEFAULT_PERMISSIONS.find(p => p.id === 'comment_read')!,
      DEFAULT_PERMISSIONS.find(p => p.id === 'comment_create')!,
      DEFAULT_PERMISSIONS.find(p => p.id === 'comment_update')!,
      DEFAULT_PERMISSIONS.find(p => p.id === 'user_read')!,
      DEFAULT_PERMISSIONS.find(p => p.id === 'user_update')!,
    ]
  },
  {
    id: 'moderator',
    name: 'moderator',
    description: '版主',
    level: 2,
    permissions: [
      ...DEFAULT_PERMISSIONS.filter(p => ['content_read', 'content_create', 'content_update', 'content_delete', 'comment_read', 'comment_create', 'comment_update', 'comment_delete', 'user_read', 'user_update', 'admin_content'].includes(p.id)),
    ]
  },
  {
    id: 'admin',
    name: 'admin',
    description: '管理员',
    level: 3,
    permissions: DEFAULT_PERMISSIONS
  }
];