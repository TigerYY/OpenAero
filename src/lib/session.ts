import { prisma } from './prisma'

// 会话管理工具类
export class SessionManager {
  // 创建新会话
  static async createSession(userId: string, ipAddress?: string, userAgent?: string) {
    const token = this.generateSessionToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天

    const session = await prisma.userSession.create({
      data: {
        userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      },
    })

    return session
  }

  // 验证会话
  static async validateSession(token: string) {
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            emailVerified: true,
          },
        },
      },
    })

    if (!session) {
      return null
    }

    // 检查会话是否过期
    if (session.expiresAt < new Date()) {
      await this.deleteSession(token)
      return null
    }

    // 更新最后使用时间
    await this.updateLastUsed(token)

    return session
  }

  // 删除会话
  static async deleteSession(token: string) {
    await prisma.userSession.delete({
      where: { token },
    })
  }

  // 删除用户的所有会话
  static async deleteAllUserSessions(userId: string) {
    await prisma.userSession.deleteMany({
      where: { userId },
    })
  }

  // 获取用户的所有活跃会话
  static async getUserSessions(userId: string) {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    })

    return sessions
  }

  // 更新会话的最后使用时间
  static async updateLastUsed(token: string) {
    await prisma.userSession.update({
      where: { token },
      data: {
        lastUsedAt: new Date(),
      },
    })
  }

  // 清理过期会话
  static async cleanupExpiredSessions() {
    await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  }

  // 生成会话令牌
  private static generateSessionToken(): string {
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
  }

  // 检查会话是否属于当前设备
  static async isCurrentDevice(sessionToken: string, currentIp?: string, currentUserAgent?: string) {
    const session = await prisma.userSession.findUnique({
      where: { token: sessionToken },
    })

    if (!session) {
      return false
    }

    // 简单的设备匹配逻辑
    // 在实际应用中，可能需要更复杂的设备指纹识别
    const ipMatch = !currentIp || !session.ipAddress || session.ipAddress === currentIp
    const userAgentMatch = !currentUserAgent || !session.userAgent || 
      session.userAgent === currentUserAgent

    return ipMatch && userAgentMatch
  }

  // 获取会话统计信息
  static async getSessionStats(userId: string) {
    const totalSessions = await prisma.userSession.count({
      where: { userId },
    })

    const activeSessions = await prisma.userSession.count({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    const expiredSessions = totalSessions - activeSessions

    return {
      total: totalSessions,
      active: activeSessions,
      expired: expiredSessions,
    }
  }
}

// 会话工具函数
export const sessionUtils = {
  // 创建记住我会话
  async createRememberMeSession(userId: string, ipAddress?: string, userAgent?: string) {
    const token = SessionManager.generateSessionToken()
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年

    const session = await prisma.userSession.create({
      data: {
        userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      },
    })

    return session
  },

  // 验证记住我令牌
  async validateRememberMeToken(token: string) {
    return SessionManager.validateSession(token)
  },

  // 删除记住我会话
  async deleteRememberMeSession(token: string) {
    await SessionManager.deleteSession(token)
  },

  // 生成安全的会话标识符
  generateSessionIdentifier(ip: string, userAgent: string): string {
    const crypto = require('crypto')
    const data = `${ip}:${userAgent}`
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)
  },
}