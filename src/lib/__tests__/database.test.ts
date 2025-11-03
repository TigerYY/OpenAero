import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

import { 
  DatabaseManager,
  QueryBuilder,
  ConnectionPool,
  TransactionManager,
  CacheManager,
  MigrationManager
} from '../database'

// Mock Prisma client
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  post: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn()
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient)
}))

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}))

describe('Database Module', () => {
  let databaseManager: DatabaseManager
  let queryBuilder: QueryBuilder
  let connectionPool: ConnectionPool
  let transactionManager: TransactionManager
  let cacheManager: CacheManager
  let migrationManager: MigrationManager

  beforeEach(() => {
    jest.clearAllMocks()
    
    databaseManager = new DatabaseManager({
      databaseUrl: 'postgresql://test:test@localhost:5432/test',
      maxConnections: 10,
      connectionTimeout: 5000
    })
    
    queryBuilder = new QueryBuilder()
    connectionPool = new ConnectionPool({ maxConnections: 10 })
    transactionManager = new TransactionManager(mockPrismaClient as any)
    cacheManager = new CacheManager({ redisUrl: 'redis://localhost:6379' })
    migrationManager = new MigrationManager(mockPrismaClient as any)
  })

  afterEach(async () => {
    await databaseManager.disconnect()
    await cacheManager.disconnect()
  })

  describe('DatabaseManager', () => {
    it('should initialize database connection', async () => {
      await databaseManager.connect()
      
      expect(mockPrismaClient.$connect).toHaveBeenCalled()
    })

    it('should disconnect from database', async () => {
      await databaseManager.connect()
      await databaseManager.disconnect()
      
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
    })

    it('should check database health', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ result: 1 }])
      
      const isHealthy = await databaseManager.healthCheck()
      
      expect(isHealthy).toBe(true)
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should handle connection errors', async () => {
      mockPrismaClient.$connect.mockRejectedValue(new Error('Connection failed'))
      
      await expect(databaseManager.connect()).rejects.toThrow('Connection failed')
    })

    it('should get database statistics', async () => {
      mockPrismaClient.user.count.mockResolvedValue(100)
      mockPrismaClient.post.count.mockResolvedValue(500)
      
      const stats = await databaseManager.getStatistics()
      
      expect(stats).toEqual({
        users: 100,
        posts: 500,
        connections: expect.any(Number),
        uptime: expect.any(Number)
      })
    })
  })

  describe('QueryBuilder', () => {
    it('should build SELECT query', () => {
      const query = queryBuilder
        .select(['id', 'name', 'email'])
        .from('users')
        .where('active', '=', true)
        .orderBy('created_at', 'DESC')
        .limit(10)
        .build()

      expect(query.sql).toContain('SELECT id, name, email FROM users')
      expect(query.sql).toContain('WHERE active = $1')
      expect(query.sql).toContain('ORDER BY created_at DESC')
      expect(query.sql).toContain('LIMIT 10')
      expect(query.params).toEqual([true])
    })

    it('should build INSERT query', () => {
      const query = queryBuilder
        .insert('users')
        .values({
          name: 'John Doe',
          email: 'john@example.com',
          active: true
        })
        .build()

      expect(query.sql).toContain('INSERT INTO users')
      expect(query.sql).toContain('(name, email, active)')
      expect(query.sql).toContain('VALUES ($1, $2, $3)')
      expect(query.params).toEqual(['John Doe', 'john@example.com', true])
    })

    it('should build UPDATE query', () => {
      const query = queryBuilder
        .update('users')
        .set({ name: 'Jane Doe', active: false })
        .where('id', '=', 1)
        .build()

      expect(query.sql).toContain('UPDATE users SET')
      expect(query.sql).toContain('name = $1, active = $2')
      expect(query.sql).toContain('WHERE id = $3')
      expect(query.params).toEqual(['Jane Doe', false, 1])
    })

    it('should build DELETE query', () => {
      const query = queryBuilder
        .delete('users')
        .where('active', '=', false)
        .build()

      expect(query.sql).toContain('DELETE FROM users')
      expect(query.sql).toContain('WHERE active = $1')
      expect(query.params).toEqual([false])
    })

    it('should build complex query with joins', () => {
      const query = queryBuilder
        .select(['u.name', 'p.title'])
        .from('users u')
        .join('posts p', 'u.id = p.user_id')
        .where('u.active', '=', true)
        .where('p.published', '=', true)
        .build()

      expect(query.sql).toContain('SELECT u.name, p.title')
      expect(query.sql).toContain('FROM users u')
      expect(query.sql).toContain('JOIN posts p ON u.id = p.user_id')
      expect(query.sql).toContain('WHERE u.active = $1 AND p.published = $2')
      expect(query.params).toEqual([true, true])
    })

    it('should handle OR conditions', () => {
      const query = queryBuilder
        .select(['*'])
        .from('users')
        .where('name', '=', 'John')
        .orWhere('email', 'LIKE', '%john%')
        .build()

      expect(query.sql).toContain('WHERE name = $1 OR email LIKE $2')
      expect(query.params).toEqual(['John', '%john%'])
    })

    it('should handle IN conditions', () => {
      const query = queryBuilder
        .select(['*'])
        .from('users')
        .whereIn('id', [1, 2, 3, 4, 5])
        .build()

      expect(query.sql).toContain('WHERE id IN ($1, $2, $3, $4, $5)')
      expect(query.params).toEqual([1, 2, 3, 4, 5])
    })

    it('should reset query builder', () => {
      queryBuilder
        .select(['*'])
        .from('users')
        .where('active', '=', true)

      queryBuilder.reset()

      const query = queryBuilder
        .select(['id'])
        .from('posts')
        .build()

      expect(query.sql).not.toContain('users')
      expect(query.sql).not.toContain('active')
      expect(query.sql).toContain('SELECT id FROM posts')
    })
  })

  describe('ConnectionPool', () => {
    it('should acquire connection from pool', async () => {
      const connection = await connectionPool.acquire()
      
      expect(connection).toBeDefined()
      expect(connectionPool.activeConnections).toBe(1)
    })

    it('should release connection back to pool', async () => {
      const connection = await connectionPool.acquire()
      await connectionPool.release(connection)
      
      expect(connectionPool.activeConnections).toBe(0)
    })

    it('should respect max connections limit', async () => {
      const pool = new ConnectionPool({ maxConnections: 2 })
      
      const conn1 = await pool.acquire()
      const conn2 = await pool.acquire()
      
      // Third connection should wait or throw
      await expect(pool.acquire()).rejects.toThrow()
      
      await pool.release(conn1)
      await pool.release(conn2)
    })

    it('should handle connection timeouts', async () => {
      const pool = new ConnectionPool({ 
        maxConnections: 1,
        connectionTimeout: 100
      })
      
      const conn1 = await pool.acquire()
      
      // Second connection should timeout
      await expect(pool.acquire()).rejects.toThrow('Connection timeout')
      
      await pool.release(conn1)
    })

    it('should get pool statistics', () => {
      const stats = connectionPool.getStats()
      
      expect(stats).toEqual({
        total: expect.any(Number),
        active: expect.any(Number),
        idle: expect.any(Number),
        waiting: expect.any(Number)
      })
    })
  })

  describe('TransactionManager', () => {
    it('should execute transaction successfully', async () => {
      const mockTransaction = jest.fn().mockResolvedValue('success')
      mockPrismaClient.$transaction.mockImplementation(mockTransaction)
      
      const result = await transactionManager.execute(async (tx) => {
        await tx.user.create({ data: { name: 'Test', email: 'test@example.com' } })
        return 'success'
      })
      
      expect(result).toBe('success')
      expect(mockPrismaClient.$transaction).toHaveBeenCalled()
    })

    it('should rollback transaction on error', async () => {
      const error = new Error('Transaction failed')
      mockPrismaClient.$transaction.mockRejectedValue(error)
      
      await expect(
        transactionManager.execute(async () => {
          throw error
        })
      ).rejects.toThrow('Transaction failed')
    })

    it('should handle nested transactions', async () => {
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaClient)
      })
      
      const result = await transactionManager.execute(async (tx) => {
        await tx.user.create({ data: { name: 'User1', email: 'user1@example.com' } })
        
        return await transactionManager.execute(async (nestedTx) => {
          await nestedTx.user.create({ data: { name: 'User2', email: 'user2@example.com' } })
          return 'nested success'
        })
      })
      
      expect(result).toBe('nested success')
    })

    it('should track transaction statistics', async () => {
      mockPrismaClient.$transaction.mockResolvedValue('success')
      
      await transactionManager.execute(async () => 'success')
      await transactionManager.execute(async () => { throw new Error('fail') }).catch(() => {})
      
      const stats = transactionManager.getStats()
      
      expect(stats.total).toBe(2)
      expect(stats.successful).toBe(1)
      expect(stats.failed).toBe(1)
    })
  })

  describe('CacheManager', () => {
    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(null)
      mockRedisClient.set.mockResolvedValue('OK')
      mockRedisClient.del.mockResolvedValue(1)
      mockRedisClient.exists.mockResolvedValue(0)
    })

    it('should connect to Redis', async () => {
      await cacheManager.connect()
      
      expect(mockRedisClient.connect).toHaveBeenCalled()
    })

    it('should set and get cache values', async () => {
      const key = 'test:key'
      const value = { data: 'test data' }
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(value))
      
      await cacheManager.set(key, value, 3600)
      const result = await cacheManager.get(key)
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value), 'EX', 3600)
      expect(result).toEqual(value)
    })

    it('should delete cache values', async () => {
      const key = 'test:key'
      
      await cacheManager.delete(key)
      
      expect(mockRedisClient.del).toHaveBeenCalledWith(key)
    })

    it('should check if key exists', async () => {
      const key = 'test:key'
      mockRedisClient.exists.mockResolvedValue(1)
      
      const exists = await cacheManager.exists(key)
      
      expect(exists).toBe(true)
      expect(mockRedisClient.exists).toHaveBeenCalledWith(key)
    })

    it('should clear all cache', async () => {
      await cacheManager.clear()
      
      expect(mockRedisClient.flushall).toHaveBeenCalled()
    })

    it('should handle cache with TTL', async () => {
      const key = 'test:key'
      const value = 'test value'
      const ttl = 1800
      
      await cacheManager.set(key, value, ttl)
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value), 'EX', ttl)
    })

    it('should handle cache miss gracefully', async () => {
      const key = 'nonexistent:key'
      mockRedisClient.get.mockResolvedValue(null)
      
      const result = await cacheManager.get(key)
      
      expect(result).toBeNull()
    })

    it('should handle Redis connection errors', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Redis connection failed'))
      
      await expect(cacheManager.connect()).rejects.toThrow('Redis connection failed')
    })
  })

  describe('MigrationManager', () => {
    it('should run pending migrations', async () => {
      const migrations = [
        { id: '001_create_users', sql: 'CREATE TABLE users (id SERIAL PRIMARY KEY)' },
        { id: '002_add_email', sql: 'ALTER TABLE users ADD COLUMN email VARCHAR(255)' }
      ]
      
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      const result = await migrationManager.runMigrations(migrations)
      
      expect(result.executed).toBe(2)
      expect(result.failed).toBe(0)
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledTimes(2)
    })

    it('should handle migration failures', async () => {
      const migrations = [
        { id: '001_create_users', sql: 'CREATE TABLE users (id SERIAL PRIMARY KEY)' },
        { id: '002_invalid_sql', sql: 'INVALID SQL STATEMENT' }
      ]
      
      mockPrismaClient.$executeRaw
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(new Error('SQL syntax error'))
      
      const result = await migrationManager.runMigrations(migrations)
      
      expect(result.executed).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
    })

    it('should rollback migrations', async () => {
      const rollbacks = [
        { id: '002_add_email', sql: 'ALTER TABLE users DROP COLUMN email' },
        { id: '001_create_users', sql: 'DROP TABLE users' }
      ]
      
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      const result = await migrationManager.rollback(rollbacks)
      
      expect(result.executed).toBe(2)
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledTimes(2)
    })

    it('should get migration status', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([
        { id: '001_create_users', executed_at: new Date() },
        { id: '002_add_email', executed_at: new Date() }
      ])
      
      const status = await migrationManager.getStatus()
      
      expect(status).toHaveLength(2)
      expect(status[0]).toHaveProperty('id', '001_create_users')
      expect(status[0]).toHaveProperty('executed_at')
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPrismaClient.$connect.mockRejectedValue(new Error('Database unavailable'))
      
      await expect(databaseManager.connect()).rejects.toThrow('Database unavailable')
    })

    it('should handle query execution errors', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Query failed'))
      
      await expect(databaseManager.healthCheck()).rejects.toThrow('Query failed')
    })

    it('should handle cache connection errors', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Redis unavailable'))
      
      await expect(cacheManager.connect()).rejects.toThrow('Redis unavailable')
    })

    it('should handle transaction rollback errors', async () => {
      const error = new Error('Rollback failed')
      mockPrismaClient.$transaction.mockRejectedValue(error)
      
      await expect(
        transactionManager.execute(async () => {
          throw new Error('Transaction error')
        })
      ).rejects.toThrow()
    })
  })

  describe('Performance', () => {
    it('should measure query execution time', async () => {
      const startTime = Date.now()
      mockPrismaClient.$queryRaw.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return [{ result: 1 }]
      })
      
      await databaseManager.healthCheck()
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(100)
    })

    it('should track connection pool usage', async () => {
      const conn1 = await connectionPool.acquire()
      const conn2 = await connectionPool.acquire()
      
      const stats = connectionPool.getStats()
      
      expect(stats.active).toBe(2)
      expect(stats.idle).toBe(0)
      
      await connectionPool.release(conn1)
      await connectionPool.release(conn2)
    })

    it('should monitor cache hit rates', async () => {
      const key = 'performance:test'
      
      // Cache miss
      mockRedisClient.get.mockResolvedValueOnce(null)
      await cacheManager.get(key)
      
      // Cache hit
      mockRedisClient.get.mockResolvedValueOnce('"cached value"')
      await cacheManager.get(key)
      
      const stats = cacheManager.getStats()
      
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(0.5)
    })
  })
})