import crypto from 'crypto';

import { PrismaClient, User as PrismaUser, UserRole as PrismaUserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  AuthTokens,
  PasswordResetRequest,
  PasswordResetConfirm,
  EmailVerificationRequest,
  User,
  UserRole
} from '../../shared/types';
import { emailService } from '../email/email.service';

export class AuthService {
  private prisma: PrismaClient;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('邮箱已被注册');
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: UserRole.CUSTOMER,
      }
    });

    // 创建邮箱验证令牌
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerification.create({
      data: {
        email: data.email,
        token: verificationToken,
        type: 'REGISTRATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
      }
    });

    // 生成JWT令牌
    const tokens = this.generateTokens(this.convertPrismaUserToUser(user));

    // 创建会话
    await this.createSession(user.id, tokens.accessToken);

    // 发送验证邮件
    const emailSent = await emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.name || undefined
    );

    if (!emailSent) {
      console.warn('验证邮件发送失败，但用户注册成功');
    }

    return {
      user: this.convertPrismaUserToUser(user),
      tokens
    };
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new Error('邮箱或密码错误');
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new Error('邮箱或密码错误');
    }

    // 生成JWT令牌
    const tokens = this.generateTokens(user);

    // 创建会话
    await this.createSession(user.id, tokens.accessToken);

    return {
      user: this.convertPrismaUserToUser(user),
      tokens
    };
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      return this.generateTokens(this.convertPrismaUserToUser(user));
    } catch (error) {
      throw new Error('无效的刷新令牌');
    }
  }

  /**
   * 用户登出
   */
  async logout(token: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { token }
    });
  }

  /**
   * 忘记密码
   */
  async forgotPassword(data: PasswordResetRequest): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      // 为了安全，即使用户不存在也返回成功
      return;
    }

    // 创建密码重置令牌
    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerification.create({
      data: {
        email: data.email,
        token: resetToken,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1小时后过期
      }
    });

    // TODO: 发送密码重置邮件
    console.log(`密码重置令牌: ${resetToken}`);
  }

  /**
   * 重置密码
   */
  async resetPassword(data: PasswordResetConfirm): Promise<void> {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { 
        token: data.token,
      }
    });

    if (!verification || verification.type !== 'PASSWORD_RESET' || verification.expiresAt < new Date()) {
      throw new Error('无效或已过期的重置令牌');
    }

    if (verification.usedAt) {
      throw new Error('重置令牌已被使用');
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // 更新用户密码
    await this.prisma.user.update({
      where: { email: verification.email },
      data: { password: hashedPassword }
    });

    // 标记令牌为已使用
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() }
    });

    // 删除所有用户会话
    const user = await this.prisma.user.findUnique({
      where: { email: verification.email }
    });
    if (user) {
      await this.prisma.userSession.deleteMany({
        where: { userId: user.id }
      });
    }
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(data: EmailVerificationRequest): Promise<void> {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token: data.token }
    });

    if (!verification || verification.type !== 'REGISTRATION' || verification.expiresAt < new Date()) {
      throw new Error('无效或已过期的验证令牌');
    }

    if (verification.usedAt) {
      throw new Error('验证令牌已被使用');
    }

    // 标记令牌为已使用
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() }
    });

    // 更新用户邮箱验证状态
    await this.prisma.user.update({
      where: { email: verification.email },
      data: { emailVerified: true }
    });
  }

  /**
   * 获取用户资料
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        creatorProfile: true
      }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return this.convertPrismaUserToUser(user);
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        avatar: data.avatar,
      }
    });

    return this.convertPrismaUserToUser(updatedUser);
  }

  /**
   * 转换Prisma用户对象为User类型
   */
  private convertPrismaUserToUser(prismaUser: PrismaUser & { creatorProfile?: any }): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name || undefined,
      avatar: prismaUser.avatar || undefined,
      role: prismaUser.role as UserRole,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }

  /**
   * 生成JWT令牌
   */
  private generateTokens(user: User): AuthTokens {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15分钟
    };
  }

  /**
   * 创建用户会话
   */
  private async createSession(userId: string, token: string): Promise<void> {
    await this.prisma.userSession.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后过期
      }
    });
  }
}