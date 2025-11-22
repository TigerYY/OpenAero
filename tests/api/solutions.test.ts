// Set environment variables BEFORE any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock Supabase client BEFORE importing modules that use it
jest.mock('@/lib/auth/supabase-client', () => ({
  createSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}));

// Mock Next.js Request and Response
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  method: options?.method || 'GET',
  headers: new Map(),
  json: jest.fn(),
  text: jest.fn(),
})) as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.Response = jest.fn().mockImplementation((body, options) => ({
  status: options?.status || 200,
  json: jest.fn().mockReturnValue(body),
  text: jest.fn().mockReturnValue(JSON.stringify(body)),
})) as any;

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/solutions/route'
import { db } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth-helpers'
import { logAuditAction } from '@/lib/api-helpers'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  db: {
    solution: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    creatorProfile: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    _count: {
      solution: {
        reviews: 0,
      },
    },
  },
}))


// Mock auth helpers
jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}))

// Mock api-helpers (只mock logAuditAction，其他函数可以直接使用)
jest.mock('@/lib/api-helpers', () => {
  const actual = jest.requireActual('@/lib/api-helpers')
  return {
    ...actual,
    logAuditAction: jest.fn(),
  }
})

const mockDb = db as jest.Mocked<typeof db>
const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>
const mockLogAuditAction = logAuditAction as jest.MockedFunction<typeof logAuditAction>

describe('/api/solutions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLogAuditAction.mockResolvedValue(undefined)
    // Default mock for unauthenticated requests
    mockAuthenticateRequest.mockResolvedValue({
      success: false,
      user: undefined,
    } as any)
  })

  describe('GET', () => {
    it('returns solutions with pagination using unified response format', async () => {
      const mockSolutions = [
        {
          id: '1',
          title: 'Test Solution 1',
          slug: 'test-solution-1',
          description: 'Description 1',
          price: 2999,
          status: 'APPROVED',
          images: [],
          categoryId: 'cat1',
          creatorId: 'creator1',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
          reviews: [{ rating: 5 }],
          user: null,
          _count: { reviews: 1 },
        },
        {
          id: '2',
          title: 'Test Solution 2',
          slug: 'test-solution-2',
          description: 'Description 2',
          price: 4599,
          status: 'APPROVED',
          images: [],
          categoryId: 'cat1',
          creatorId: 'creator1',
          createdAt: new Date('2024-01-16'),
          updatedAt: new Date('2024-01-16'),
          reviews: [{ rating: 4 }, { rating: 5 }],
          user: null,
          _count: { reviews: 2 },
        },
      ]

      mockDb.solution.findMany = jest.fn().mockResolvedValue(mockSolutions)
      mockDb.solution.count = jest.fn().mockResolvedValue(2)
      
      // Mock authenticateRequest to return unauthenticated user
      mockAuthenticateRequest.mockResolvedValue({
        success: false,
        user: undefined,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/solutions?page=1&limit=20')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.total).toBe(2)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(20)
      expect(data.pagination.totalPages).toBe(1)
    })

    it('filters by category', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSolutions: any[] = []
      mockDb.solution.findMany = jest.fn().mockResolvedValue(mockSolutions)
      mockDb.solution.count = jest.fn().mockResolvedValue(0)
      
      // Mock authenticateRequest to return unauthenticated user
      mockAuthenticateRequest.mockResolvedValue({
        success: false,
        user: undefined,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/solutions?category=cat1')
      await GET(request)

      expect(mockDb.solution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'cat1',
          }),
        })
      )
    })

    it('searches by query', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSolutions: any[] = []
      mockDb.solution.findMany = jest.fn().mockResolvedValue(mockSolutions)
      mockDb.solution.count = jest.fn().mockResolvedValue(0)
      
      // Mock authenticateRequest to return unauthenticated user
      mockAuthenticateRequest.mockResolvedValue({
        success: false,
        user: undefined,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/solutions?search=drone')
      await GET(request)

      expect(mockDb.solution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                title: expect.objectContaining({
                  contains: 'drone',
                }),
              }),
            ]),
          }),
        })
      )
    })

    it('handles errors gracefully using unified error response', async () => {
      mockDb.solution.findMany = jest.fn().mockRejectedValue(new Error('Database error'))
      // authenticateRequest already mocked in beforeEach

      const request = new NextRequest('http://localhost:3000/api/solutions')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.data).toBeNull()
    })
  })

  describe('POST', () => {
    beforeEach(() => {
      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: {
          id: 'user-1',
          email: 'creator@example.com',
          role: 'CREATOR',
        },
      })
      mockDb.creatorProfile.findUnique = jest.fn().mockResolvedValue({
        id: 'creator-1',
        userId: 'user-1',
        status: 'APPROVED',
      })
    })

    it('creates a new solution using unified success response', async () => {
      const mockSolution = {
        id: '1',
        title: 'New Solution',
        slug: 'new-solution',
        description: 'A new solution',
        category: 'cat1',
        price: 2999,
        status: 'DRAFT',
        version: '1.0.0',
        features: [],
        images: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        creatorId: 'creator1',
        user: null,
      }

      mockDb.solution.create = jest.fn().mockResolvedValue(mockSolution)

      const request = new NextRequest('http://localhost:3000/api/solutions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Solution',
          slug: 'new-solution',
          description: 'A new solution',
          category: 'cat1',
          price: 2999,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.message).toBe('方案创建成功')
    })

    it('validates required fields using unified validation error response', async () => {
      const request = new NextRequest('http://localhost:3000/api/solutions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Incomplete Solution',
          // Missing required fields
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('handles creation errors using unified error response', async () => {
      mockDb.solution.create = jest.fn().mockRejectedValue(new Error('Creation failed'))

      const request = new NextRequest('http://localhost:3000/api/solutions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Solution',
          slug: 'new-solution',
          description: 'A new solution',
          category: 'cat1',
          price: 2999,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.data).toBeNull()
    })

    it('returns 401 for unauthenticated requests', async () => {
      // Mock error response - use a simple response object
      const errorResponse = {
        json: async () => ({ success: false, error: '未授权访问' }),
        status: 401,
      } as any;
      mockAuthenticateRequest.mockResolvedValue({
        success: false,
        error: errorResponse,
      })

      const request = new NextRequest('http://localhost:3000/api/solutions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Solution',
          slug: 'new-solution',
          description: 'A new solution',
          category: 'cat1',
          price: 2999,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })
})
