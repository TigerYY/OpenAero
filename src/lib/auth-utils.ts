import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// 密码哈希和验证工具
export class AuthUtils {
  // 生成密码哈希
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // 验证密码
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // 生成随机令牌
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // 生成邮箱验证令牌
  static generateEmailToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // 生成密码重置令牌
  static generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // 验证密码强度
  static validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: '密码长度至少8个字符' };
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, message: '密码必须包含小写字母' };
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: '密码必须包含大写字母' };
    }

    if (!/\d/.test(password)) {
      return { valid: false, message: '密码必须包含数字' };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: '密码必须包含特殊字符' };
    }

    return { valid: true };
  }

  // 验证邮箱格式
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// JWT工具类
export class JWTUtils {
  // 生成JWT令牌
  static generateToken(payload: any, expiresIn: string = '7d'): string {
    // 这里使用简单的实现，实际项目中应该使用专业的JWT库
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const data = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + this.getExpirationSeconds(expiresIn),
      iat: Math.floor(Date.now() / 1000)
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedData = Buffer.from(JSON.stringify(data)).toString('base64url');
    
    // 简单的签名实现（生产环境应该使用更安全的签名方法）
    const signature = crypto
      .createHmac('sha256', process.env.NEXTAUTH_SECRET || 'default-secret')
      .update(`${encodedHeader}.${encodedData}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedData}.${signature}`;
  }

  // 验证JWT令牌
  static verifyToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const [encodedHeader, encodedData, signature] = parts;
      
      // 验证签名
      const expectedSignature = crypto
        .createHmac('sha256', process.env.NEXTAUTH_SECRET || 'default-secret')
        .update(`${encodedHeader}.${encodedData}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }

      const data = JSON.parse(Buffer.from(encodedData, 'base64url').toString());
      
      // 检查过期时间
      if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      return data;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // 获取过期时间秒数
  private static getExpirationSeconds(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 7 * 24 * 60 * 60; // 默认7天
    }
  }
}