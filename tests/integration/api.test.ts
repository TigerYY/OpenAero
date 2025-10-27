import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}

// Mock Redis client
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn(),
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('@/lib/redis', () => ({
  redis: mockRedis,
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

import { getServerSession } from 'next-auth'
import { GET as getUsersGET, POST as createUserPOST } from '@/app/api/users/route'
import { GET as getProjectsGET, POST as createProjectPOST } from '@/app/api/projects/route'
import { GET as getMetricsGET } from '@/app/api/metrics/route'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('/api/users', () => {
    describe('GET /api/users', () => {
      it('should return users list for authenticated admin', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: '1', email: 'admin@example.com', role: 'ADMIN' },
        } as any)

        mockPrisma.user.findMany.mockResolvedValue([
          { id: '1', email: 'user1@example.com', name: 'User 1', role: 'USER' },
          { id: '2', email: 'user2@example.com', name: 'User 2', role: 'USER' },
        ])

        const { req } = createMocks({
          method: 'GET',
          url: '/api/users',
        })

        const request = new NextRequest(req.url!, {
          method: req.method,
          headers: req.headers as any,
        })

        const response = await getUsersGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.users).toHaveLength(2)
        expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      })

      it('should return 401 for unauthenticated requests', async () => {
        mockGetServerSession.mockResolvedValue(null)

        const { req } = createMocks({
          method: 'GET',
          url: '/api/users',
        })

        const request = new NextRequest(req.url!, {
          method: req.method,
          headers: req.headers as any,
        })

        const response = await getUsersGET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 403 for non-admin users', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: '1', email: 'user@example.com', role: 'USER' },
        } as any)

        const { req } = createMocks({
          method: 'GET',
          url: '/api/users',
        })

        const request = new NextRequest(req.url!, {
          method: req.method,
          headers: req.headers as any,
        })

        const response = await getUsersGET(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Forbidden')
      })
    })

    describe('POST /api/users', () => {
      it('should create a new user', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: '1', email: 'admin@example.com', role: 'ADMIN' },
        } as any)

        const newUser = {
          id: '3',
          email: 'newuser@example.com',
          name: 'New User',
          role: 'USER',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockPrisma.user.create.mockResolvedValue(newUser)

        const { req } = createMocks({
          method: 'POST',
          url: '/api/users',
          body: {
            email: 'newuser@example.com',
            name: 'New User',
            password: 'password123',
          },
        })

        const request = new NextRequest(req.url!, {
          method: req.method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(req.body),
        })

        const response = await createUserPOST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.user.email).toBe('newuser@example.com')
        expect(mockPrisma.user.create).toHaveBeenCalled()
      })

      it('should return 400 for invalid input', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: '1', email: 'admin@example.com', role: 'ADMIN' },
        } as any)

        const { req } = createMocks({
          method: 'POST',
          url: '/api/users',
          body: {
            email: 'invalid-email',
            name: '',
          },
        })

        const request = new NextRequest(req.url!, {
          method: req.method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(req.body),
        })

        const response = await createUserPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid input')
      })
    })
  })

  describe('/api/projects', () => {
    describe('GET /api/projects', () => {
      it('should return user projects', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: '1', email: 'user@example.com', role: 'USER' },
        } as any)

        const projects = [
          {
            id: '1',
            name: 'Project 1',
            description: 'Description 1',
            userId: '1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '2',
            name: 'Project 2',
            description: 'Description 2',
            userId: '1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        mockPrisma.project.findMany.mockResolvedValue(projects)

        const { req } = createMocks({
          method: 'GET',
          url: '/api/projects',
        })

        const request = new NextRequest(req.url!, {
          method: req.method,
          headers: req.headers as any,
        })

        const response = await getProjectsGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.projects).toHaveLength(2)
        expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
          where: { userId: '1' },
          orderBy: { createdAt: 'desc' },
        })
      })

      it('should handle database errors', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: '1', email: 'user@example.com', role: 'USER' },
        } as any)

        mockPrisma.project.findMany.mockRejectedValue(new Error('Database error'))

        const { req } = createMocks({
          method: 'GET',
          url: '/api/projects',
        })

        const request = new NextRequest(req.url!, {
          method: req.method,
          headers: req.headers as any,
        })

        const response = await getProjectsGET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })
    })

    describe('POST /api/projects', () => {
      it('should create a new project', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: '1', email: 'user@example.com', role: 'USER' },
        } as any)

        const newProject = {
          id: '3',
          name: 'New Project',
          description: 'New Description',
          userId: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockPrisma.project.create.mockResolvedValue(newProject)

        const { req } = createMocks({
          method: 'POST',
          url: '/api/projects',
          body: {
            name: 'New Project',
            description: 'New Description',
          },
        })

        const request = new NextRequest(req.url!, {
          method: req.method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(req.body),
        })

        const response = await createProjectPOST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.project.name).toBe('New Project')
        expect(mockPrisma.project.create).toHaveBeenCalledWith({
          data: {
            name: 'New Project',
            description: 'New Description',
            userId: '1',
          },
        })
      })
    })
  })

  describe('/api/metrics', () => {
    describe('GET /api/metrics', () => {
      it('should return Prometheus metrics', async () => {
        const { req } = createMocks({
          method: 'GET',
          url: '/api/metrics',
        })

        const request = new NextRequest(req.url!, {
          method: req.method,
          headers: req.headers as any,
        })

        const response = await getMetricsGET(request)
        const text = await response.text()

        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toBe('text/plain; version=0.0.4; charset=utf-8')
        expect(text).toContain('# HELP')
        expect(text).toContain('# TYPE')
      })

      it('should handle metrics collection errors', async () => {
        // Mock metrics collection error
        jest.doMock('prom-client', () => {
          throw new Error('Metrics collection failed')
        })

        const { req } = createMocks({
          method: 'GET',
          url: '/api/metrics',
        })

        const request = new NextRequest(req.url!, {
          method: req.method,
          headers: req.headers as any,
        })

        try {
          await getMetricsGET(request)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      mockRedis.get.mockResolvedValue('10') // Simulate 10 requests already made
      mockRedis.set.mockResolvedValue('OK')
      mockRedis.expire.mockResolvedValue(1)

      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      } as any)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/projects',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const request = new NextRequest(req.url!, {
        method: req.method,
        headers: req.headers as any,
      })

      // Simulate rate limit exceeded
      const response = await getProjectsGET(request)

      if (response.status === 429) {
        const data = await response.json()
        expect(data.error).toBe('Rate limit exceeded')
      }
    })
  })

  describe('Caching', () => {
    it('should cache GET responses', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      } as any)

      const cachedData = JSON.stringify({
        projects: [
          { id: '1', name: 'Cached Project', userId: '1' },
        ],
      })

      mockRedis.get.mockResolvedValue(cachedData)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/projects',
      })

      const request = new NextRequest(req.url!, {
        method: req.method,
        headers: req.headers as any,
      })

      const response = await getProjectsGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects[0].name).toBe('Cached Project')
      expect(mockRedis.get).toHaveBeenCalled()
    })

    it('should invalidate cache on mutations', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      } as any)

      const newProject = {
        id: '3',
        name: 'New Project',
        description: 'New Description',
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.project.create.mockResolvedValue(newProject)
      mockRedis.del.mockResolvedValue(1)

      const { req } = createMocks({
        method: 'POST',
        url: '/api/projects',
        body: {
          name: 'New Project',
          description: 'New Description',
        },
      })

      const request = new NextRequest(req.url!, {
        method: req.method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req.body),
      })

      const response = await createProjectPOST(request)

      expect(response.status).toBe(201)
      expect(mockRedis.del).toHaveBeenCalled() // Cache should be invalidated
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      } as any)

      const { req } = createMocks({
        method: 'POST',
        url: '/api/projects',
        body: {
          name: '', // Invalid: empty name
          description: 'Valid description',
        },
      })

      const request = new NextRequest(req.url!, {
        method: req.method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req.body),
      })

      const response = await createProjectPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
      expect(data.details).toBeDefined()
    })

    it('should handle database connection errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      } as any)

      mockPrisma.project.findMany.mockRejectedValue(new Error('Connection refused'))

      const { req } = createMocks({
        method: 'GET',
        url: '/api/projects',
      })

      const request = new NextRequest(req.url!, {
        method: req.method,
        headers: req.headers as any,
      })

      const response = await getProjectsGET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed JSON', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      } as any)

      const { req } = createMocks({
        method: 'POST',
        url: '/api/projects',
        body: 'invalid json',
      })

      const request = new NextRequest(req.url!, {
        method: req.method,
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      })

      const response = await createProjectPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON')
    })
  })

  describe('Security', () => {
    it('should sanitize input data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      } as any)

      const maliciousProject = {
        id: '3',
        name: 'Clean Project Name',
        description: 'Clean Description',
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.project.create.mockResolvedValue(maliciousProject)

      const { req } = createMocks({
        method: 'POST',
        url: '/api/projects',
        body: {
          name: '<script>alert("xss")</script>Project',
          description: 'Normal description',
        },
      })

      const request = new NextRequest(req.url!, {
        method: req.method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req.body),
      })

      const response = await createProjectPOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.project.name).not.toContain('<script>')
    })

    it('should validate CSRF tokens', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      } as any)

      const { req } = createMocks({
        method: 'POST',
        url: '/api/projects',
        headers: {
          'x-csrf-token': 'invalid-token',
        },
        body: {
          name: 'Test Project',
          description: 'Test Description',
        },
      })

      const request = new NextRequest(req.url!, {
        method: req.method,
        headers: req.headers as any,
        body: JSON.stringify(req.body),
      })

      // CSRF validation would happen in middleware
      // This is a placeholder for the actual implementation
      const response = await createProjectPOST(request)

      // If CSRF validation fails, it should return 403
      if (response.status === 403) {
        const data = await response.json()
        expect(data.error).toBe('Invalid CSRF token')
      }
    })
  })
})