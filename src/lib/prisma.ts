import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 配置 Prisma Client 以兼容 Supabase Session Pooler
// Session Pooler 使用 PgBouncer，不支持 prepared statements
// 需要在 DATABASE_URL 中添加 ?pgbouncer=true 参数
const databaseUrl = process.env.DATABASE_URL || ''

if (!databaseUrl) {
  console.error('[Prisma] 错误: DATABASE_URL 环境变量未设置！')
  console.error('[Prisma] 请在 .env.local 文件中设置 DATABASE_URL')
}

const isPooler = databaseUrl.includes('pooler.supabase.com') || 
                 databaseUrl.includes('pooler.supabase.net') || 
                 databaseUrl.includes('pooler') || 
                 databaseUrl.includes(':6543')

// 如果使用 Session Pooler，确保 URL 包含 pgbouncer 参数
let finalDatabaseUrl = databaseUrl
if (isPooler && !databaseUrl.includes('pgbouncer=true')) {
  // 添加 pgbouncer=true 参数以禁用 prepared statements
  const separator = databaseUrl.includes('?') ? '&' : '?'
  finalDatabaseUrl = `${databaseUrl}${separator}pgbouncer=true`
  console.log('[Prisma] 检测到 Supabase Session Pooler，已添加 pgbouncer=true 参数')
}

// 诊断信息（不显示完整密码）
if (databaseUrl) {
  try {
    // 安全地解析 URL（不显示密码）
    const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/(.+)/)
    if (urlMatch) {
      const [, user, , host, port, database] = urlMatch
      console.log('[Prisma] 数据库连接配置:')
      console.log(`  - User: ${user}`)
      console.log(`  - Host: ${host}`)
      console.log(`  - Port: ${port || '5432'}`)
      console.log(`  - Database: ${database.split('?')[0]}`)
      console.log(`  - Pooler: ${isPooler ? '是' : '否'}`)
      console.log(`  - PgBouncer: ${finalDatabaseUrl.includes('pgbouncer=true') ? '已启用' : '未启用'}`)
    }
  } catch (e) {
    console.warn('[Prisma] 无法解析 DATABASE_URL 格式')
  }
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
let connectionAttempts = 0
const maxConnectionAttempts = 3

async function connectWithRetry() {
  try {
    await prisma.$connect()
    console.log('[Prisma] 数据库连接成功')
    connectionAttempts = 0
  } catch (error: any) {
    connectionAttempts++
    console.error(`[Prisma] 数据库连接失败 (尝试 ${connectionAttempts}/${maxConnectionAttempts}):`, error.message)
    
    if (connectionAttempts < maxConnectionAttempts) {
      // 等待后重试
      const delay = connectionAttempts * 2000 // 递增延迟：2s, 4s, 6s
      console.log(`[Prisma] ${delay/1000}秒后重试连接...`)
      setTimeout(() => {
        connectWithRetry()
      }, delay)
    } else {
      console.error('[Prisma] 达到最大重试次数，连接失败')
      console.error('[Prisma] 请检查：')
      console.error('1. DATABASE_URL 环境变量是否正确配置')
      console.error('2. 数据库服务器是否可访问')
      console.error('3. 网络连接是否正常')
      console.error('4. 如果使用 Supabase Pooler，请确认使用端口 6543 和正确的连接字符串')
    }
  }
}

// 延迟连接，避免在模块加载时立即连接
if (typeof process !== 'undefined') {
  // 在 Next.js 中，延迟连接以避免启动时的连接问题
  setTimeout(() => {
    connectWithRetry()
  }, 1000)
}

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