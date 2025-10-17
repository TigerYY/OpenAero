import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/solutions/route'
import prisma from '@/lib/db'

// Mock Prisma
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    solution: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

describe('/api/solutions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns solutions with pagination', async () => {
      const mockSolutions = [
        {
          id: '1',
          title: 'Test Solution 1',
          price: 2999,
          status: 'APPROVED',
          reviews: [{ rating: 5 }],
        },
        {
          id: '2',
          title: 'Test Solution 2',
          price: 4599,
          status: 'APPROVED',
          reviews: [{ rating: 4 }, { rating: 5 }],
        },
      ]

      ;(prisma.$transaction as jest.Mock).mockResolvedValue([mockSolutions, 2])

      const request = new NextRequest('http://localhost:3000/api/solutions?page=1&limit=20')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.pagination.total).toBe(2)
      expect(data.pagination.page).toBe(1)
    })

    it('filters by category', async () => {
      const mockSolutions = [
        {
          id: '1',
          title: 'Test Solution 1',
          price: 2999,
          status: 'APPROVED',
          reviews: [],
        },
      ]

      ;(prisma.$transaction as jest.Mock).mockResolvedValue([mockSolutions, 1])

      const request = new NextRequest('http://localhost:3000/api/solutions?categoryId=cat1')
      const response = await GET(request)

      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat1',
          }),
        }),
        expect.any(Function),
      ])
    })

    it('searches by query', async () => {
      const mockSolutions = []

      ;(prisma.$transaction as jest.Mock).mockResolvedValue([mockSolutions, 0])

      const request = new NextRequest('http://localhost:3000/api/solutions?search=drone')
      const response = await GET(request)

      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'drone', mode: 'insensitive' } },
              { description: { contains: 'drone', mode: 'insensitive' } },
            ],
          }),
        }),
        expect.any(Function),
      ])
    })

    it('handles errors gracefully', async () => {
      ;(prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/solutions')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database error')
    })
  })

  describe('POST', () => {
    it('creates a new solution', async () => {
      const mockSolution = {
        id: '1',
        title: 'New Solution',
        price: 2999,
        status: 'DRAFT',
      }

      ;(prisma.solution.create as jest.Mock).mockResolvedValue(mockSolution)

      const request = new NextRequest('http://localhost:3000/api/solutions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Solution',
          slug: 'new-solution',
          description: 'A new solution',
          longDescription: 'A detailed description',
          images: ['https://example.com/image.jpg'],
          price: 2999,
          categoryId: 'cat1',
          creatorId: 'creator1',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockSolution)
    })

    it('validates required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/solutions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Incomplete Solution',
          // Missing required fields
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('handles creation errors', async () => {
      ;(prisma.solution.create as jest.Mock).mockRejectedValue(new Error('Creation failed'))

      const request = new NextRequest('http://localhost:3000/api/solutions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Solution',
          slug: 'new-solution',
          description: 'A new solution',
          longDescription: 'A detailed description',
          images: ['https://example.com/image.jpg'],
          price: 2999,
          categoryId: 'cat1',
          creatorId: 'creator1',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })
})
