import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 配置 Prisma Client 以兼容 Supabase Session Pooler
// Session Pooler 使用 PgBouncer，不支持 prepared statements
// 需要在 DATABASE_URL 中添加 ?pgbouncer=true 参数
const databaseUrl = process.env.DATABASE_URL || ''
const isPooler = databaseUrl.includes('pooler.supabase.com') || databaseUrl.includes('pooler') || databaseUrl.includes(':6543')

// 如果使用 Session Pooler，确保 URL 包含 pgbouncer 参数
let finalDatabaseUrl = databaseUrl
if (isPooler && !databaseUrl.includes('pgbouncer=true')) {
  // 添加 pgbouncer=true 参数以禁用 prepared statements
  const separator = databaseUrl.includes('?') ? '&' : '?'
  finalDatabaseUrl = `${databaseUrl}${separator}pgbouncer=true`
  console.log('[Prisma] 检测到 Supabase Session Pooler，已添加 pgbouncer=true 参数')
}

const prismaConfig: ConstructorParameters<typeof PrismaClient>[0] = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: finalDatabaseUrl,
    },
  },
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaConfig)

// 添加连接错误处理和重试逻辑
prisma.$connect().catch((error) => {
  console.error('[Prisma] 数据库连接失败:', error)
})

// 处理连接断开的情况
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
  
  // 处理未捕获的异常，确保连接正确关闭
  process.on('uncaughtException', async (error) => {
    console.error('[Prisma] 未捕获的异常:', error)
    await prisma.$disconnect()
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 导出db别名以保持向后兼容
export const db = prisma