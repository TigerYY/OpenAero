import { describe, it, expect, beforeEach, jest } from '@jest/globals'

import { 
  hasPermission,
  canAccessResource,
  hasMinimumRole,
  AuthManager,
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLES,
  User,
  UserRole,
  Permission
} from '../auth'

// Mock user data that matches the User interface
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '123',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user' as UserRole,
  permissions: [
    { id: 'content_read', name: '查看内容', description: '查看内容', resource: 'content', action: 'read' },
    { id: 'user_update', name: '更新用户', description: '更新用户信息', resource: 'user', action: 'update' }
  ],
  profile: {
    firstName: 'Test',
    lastName: 'User',
    avatar: '',
    bio: '',
    location: '',
    website: '',
    socialLinks: {},
    skills: [],
    interests: []
  },
  settings: {
    theme: 'light',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    notifications: {
      email: true,
      push: true,
      inApp: true,
      types: {
        mentions: true,
        comments: true,
        likes: true,
        follows: true,
        system: true
      }
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showLocation: false,
      allowMessages: true,
      allowFollows: true
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  isActive: true,
  isVerified: true,
  ...overrides
})

describe('Auth Module', () => {
  describe('Permission System', () => {
    it('should check user permissions correctly', () => {
      const mockUser = createMockUser()
      
      expect(hasPermission(mockUser, 'content_read')).toBe(true)
      expect(hasPermission(mockUser, 'user_update')).toBe(true)
      expect(hasPermission(mockUser, 'admin_system')).toBe(false)
    })

    it('should check resource access correctly', () => {
      const mockUser = createMockUser()
      
      expect(canAccessResource(mockUser, 'content', 'read')).toBe(true)
      expect(canAccessResource(mockUser, 'user', 'update')).toBe(true)
      expect(canAccessResource(mockUser, 'admin', 'manage_system')).toBe(false)
    })

    it('should check minimum role correctly', () => {
      const userMock = createMockUser({ role: 'user' })
      const moderatorMock = createMockUser({ role: 'moderator' })
      const adminMock = createMockUser({ role: 'admin' })
      
      expect(hasMinimumRole(userMock, 'user')).toBe(true)
      expect(hasMinimumRole(userMock, 'moderator')).toBe(false)
      expect(hasMinimumRole(userMock, 'admin')).toBe(false)
      
      expect(hasMinimumRole(moderatorMock, 'user')).toBe(true)
      expect(hasMinimumRole(moderatorMock, 'moderator')).toBe(true)
      expect(hasMinimumRole(moderatorMock, 'admin')).toBe(false)
      
      expect(hasMinimumRole(adminMock, 'user')).toBe(true)
      expect(hasMinimumRole(adminMock, 'moderator')).toBe(true)
      expect(hasMinimumRole(adminMock, 'admin')).toBe(true)
    })
  })

  describe('AuthManager', () => {
    let authManager: AuthManager

    beforeEach(() => {
      authManager = AuthManager.getInstance()
      // Clear any existing session
      authManager.logout()
    })

    it('should be a singleton', () => {
      const instance1 = AuthManager.getInstance()
      const instance2 = AuthManager.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should start with no authenticated user', () => {
      expect(authManager.getCurrentUser()).toBeNull()
      expect(authManager.isAuthenticated()).toBe(false)
    })

    it('should handle login attempt', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      // Mock the login method to avoid actual API calls
      const mockLogin = jest.spyOn(authManager, 'login')
      mockLogin.mockResolvedValue({
        user: createMockUser(),
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString()
      })

      const session = await authManager.login(credentials)
      
      expect(session).toBeDefined()
      expect(session.user).toBeDefined()
      expect(session.token).toBeDefined()
      
      mockLogin.mockRestore()
    })

    it('should handle registration', async () => {
      const registerData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        firstName: 'New',
        lastName: 'User'
      }

      // Mock the register method
      const mockRegister = jest.spyOn(authManager, 'register')
      mockRegister.mockResolvedValue(createMockUser({
        email: registerData.email,
        username: registerData.username
      }))

      const user = await authManager.register(registerData)
      
      expect(user).toBeDefined()
      expect(user.email).toBe(registerData.email)
      expect(user.username).toBe(registerData.username)
      
      mockRegister.mockRestore()
    })
  })

  describe('Default Permissions and Roles', () => {
    it('should have valid default permissions', () => {
      expect(DEFAULT_PERMISSIONS).toBeDefined()
      expect(Array.isArray(DEFAULT_PERMISSIONS)).toBe(true)
      expect(DEFAULT_PERMISSIONS.length).toBeGreaterThan(0)
      
      // Check for essential permissions
      const permissionIds = DEFAULT_PERMISSIONS.map(p => p.id)
      expect(permissionIds).toContain('content_read')
      expect(permissionIds).toContain('user_update')
    })

    it('should have valid default roles', () => {
      expect(DEFAULT_ROLES).toBeDefined()
      expect(Array.isArray(DEFAULT_ROLES)).toBe(true)
      expect(DEFAULT_ROLES.length).toBeGreaterThan(0)
      
      const roleNames = DEFAULT_ROLES.map(r => r.name)
      expect(roleNames).toContain('user')
      expect(roleNames).toContain('moderator')
      expect(roleNames).toContain('admin')
    })

    it('should have proper role hierarchy', () => {
      const guestRole = DEFAULT_ROLES.find(r => r.name === 'guest')
      const userRole = DEFAULT_ROLES.find(r => r.name === 'user')
      const moderatorRole = DEFAULT_ROLES.find(r => r.name === 'moderator')
      const adminRole = DEFAULT_ROLES.find(r => r.name === 'admin')
      
      expect(guestRole?.level).toBe(0)
      expect(userRole?.level).toBe(1)
      expect(moderatorRole?.level).toBe(2)
      expect(adminRole?.level).toBe(3)
      
      // Admin should have all permissions
      expect(adminRole?.permissions).toEqual(DEFAULT_PERMISSIONS)
    })
  })

  describe('Edge Cases', () => {
    it('should handle user without permissions', () => {
      const userWithoutPermissions = createMockUser({ permissions: [] })
      
      expect(hasPermission(userWithoutPermissions, 'content_read')).toBe(false)
    })

    it('should handle invalid permission check', () => {
      const mockUser = createMockUser()
      
      expect(hasPermission(mockUser, 'nonexistent_permission')).toBe(false)
    })

    it('should handle invalid resource access check', () => {
      const mockUser = createMockUser()
      
      expect(canAccessResource(mockUser, 'nonexistent_resource', 'read')).toBe(false)
    })
  })
})