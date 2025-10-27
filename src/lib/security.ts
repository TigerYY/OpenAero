// 安全工具库 - 数据加密、安全审计、防护机制

import crypto from 'crypto';

// 加密配置
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  iterations: number;
  digest: string;
}

// 安全审计日志
export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
}

// 安全威胁检测
export interface SecurityThreat {
  id: string;
  type: 'brute_force' | 'sql_injection' | 'xss' | 'csrf' | 'rate_limit' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  target: string;
  timestamp: string;
  blocked: boolean;
  details: Record<string, any>;
}

// 默认加密配置
const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  iterations: 100000,
  digest: 'sha512'
};

// 数据加密类
export class DataEncryption {
  private config: EncryptionConfig;
  private masterKey: Buffer;

  constructor(masterKey: string, config?: Partial<EncryptionConfig>) {
    this.config = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
    this.masterKey = Buffer.from(masterKey, 'hex');
  }

  // 生成密钥
  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      this.config.iterations,
      this.config.keyLength,
      this.config.digest
    );
  }

  // 加密数据
  encrypt(data: string): string {
    try {
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(this.config.ivLength);
      const key = this.deriveKey(salt);
      
      const cipher = crypto.createCipher('aes-256-cbc', key);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 组合: salt + iv + encrypted
      const result = Buffer.concat([
        salt,
        iv,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return result.toString('base64');
    } catch (error) {
      throw new Error(`加密失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 解密数据
  decrypt(encryptedData: string): string {
    try {
      const data = Buffer.from(encryptedData, 'base64');
      
      const salt = data.subarray(0, 16);
      const iv = data.subarray(16, 16 + this.config.ivLength);
      const encrypted = data.subarray(16 + this.config.ivLength);
      
      const key = this.deriveKey(salt);
      
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`解密失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 生成哈希
  hash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, this.config.iterations, 64, this.config.digest);
    return `${actualSalt}:${hash.toString('hex')}`;
  }

  // 验证哈希
  verifyHash(data: string, hash: string): boolean {
    try {
      const [salt, originalHash] = hash.split(':');
      if (!salt || !originalHash) return false;
      const newHash = crypto.pbkdf2Sync(data, salt, this.config.iterations, 64, this.config.digest);
      return originalHash === newHash.toString('hex');
    } catch {
      return false;
    }
  }
}

// 安全审计管理器
export class SecurityAuditManager {
  private logs: SecurityAuditLog[] = [];
  private threats: SecurityThreat[] = [];
  private maxLogs = 10000;
  private maxThreats = 1000;

  // 记录安全事件
  logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'timestamp'>): void {
    const log: SecurityAuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    };

    this.logs.push(log);
    
    // 保持日志数量限制
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 检查是否需要触发威胁检测
    this.detectThreats(log);
  }

  // 威胁检测
  private detectThreats(log: SecurityAuditLog): void {
    // 检测暴力破解攻击
    if (log.action === 'login' && !log.success) {
      this.detectBruteForce(log);
    }

    // 检测可疑活动
    if (log.riskLevel === 'high' || log.riskLevel === 'critical') {
      this.detectSuspiciousActivity(log);
    }

    // 检测频率限制违规
    this.detectRateLimit(log);
  }

  // 检测暴力破解
  private detectBruteForce(log: SecurityAuditLog): void {
    const recentFailures = this.logs.filter(l => 
      l.ip === log.ip &&
      l.action === 'login' &&
      !l.success &&
      new Date(l.timestamp).getTime() > Date.now() - 15 * 60 * 1000 // 15分钟内
    );

    if (recentFailures.length >= 5) {
      this.recordThreat({
        type: 'brute_force',
        severity: 'high',
        source: log.ip,
        target: 'login',
        blocked: true,
        details: {
          attempts: recentFailures.length,
          timeWindow: '15 minutes',
          userId: log.userId
        }
      });
    }
  }

  // 检测可疑活动
  private detectSuspiciousActivity(log: SecurityAuditLog): void {
    this.recordThreat({
      type: 'suspicious_activity',
      severity: log.riskLevel === 'critical' ? 'critical' : 'high',
      source: log.ip,
      target: log.resource,
      blocked: false,
      details: {
        action: log.action,
        userId: log.userId,
        userAgent: log.userAgent,
        logDetails: log.details
      }
    });
  }

  // 检测频率限制
  private detectRateLimit(log: SecurityAuditLog): void {
    const recentRequests = this.logs.filter(l => 
      l.ip === log.ip &&
      new Date(l.timestamp).getTime() > Date.now() - 60 * 1000 // 1分钟内
    );

    if (recentRequests.length > 100) {
      this.recordThreat({
        type: 'rate_limit',
        severity: 'medium',
        source: log.ip,
        target: 'api',
        blocked: true,
        details: {
          requests: recentRequests.length,
          timeWindow: '1 minute'
        }
      });
    }
  }

  // 记录威胁
  private recordThreat(threat: Omit<SecurityThreat, 'id' | 'timestamp'>): void {
    const newThreat: SecurityThreat = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...threat
    };

    this.threats.push(newThreat);
    
    // 保持威胁记录数量限制
    if (this.threats.length > this.maxThreats) {
      this.threats = this.threats.slice(-this.maxThreats);
    }

    // 触发威胁响应
    this.respondToThreat(newThreat);
  }

  // 威胁响应
  private respondToThreat(threat: SecurityThreat): void {
    console.warn(`安全威胁检测: ${threat.type} - ${threat.severity}`, threat);
    
    // 这里可以添加自动响应逻辑，如：
    // - 发送警报通知
    // - 自动封禁IP
    // - 触发安全策略
    // - 记录到外部安全系统
  }

  // 获取安全报告
  getSecurityReport(timeRange?: { start: string; end: string }) {
    const filteredLogs = timeRange 
      ? this.logs.filter(log => 
          new Date(log.timestamp) >= new Date(timeRange.start) &&
          new Date(log.timestamp) <= new Date(timeRange.end)
        )
      : this.logs;

    const filteredThreats = timeRange
      ? this.threats.filter(threat =>
          new Date(threat.timestamp) >= new Date(timeRange.start) &&
          new Date(threat.timestamp) <= new Date(timeRange.end)
        )
      : this.threats;

    return {
      summary: {
        totalLogs: filteredLogs.length,
        totalThreats: filteredThreats.length,
        successfulActions: filteredLogs.filter(log => log.success).length,
        failedActions: filteredLogs.filter(log => !log.success).length,
        riskDistribution: {
          low: filteredLogs.filter(log => log.riskLevel === 'low').length,
          medium: filteredLogs.filter(log => log.riskLevel === 'medium').length,
          high: filteredLogs.filter(log => log.riskLevel === 'high').length,
          critical: filteredLogs.filter(log => log.riskLevel === 'critical').length,
        }
      },
      logs: filteredLogs,
      threats: filteredThreats,
      topRisks: this.getTopRisks(filteredLogs),
      recommendations: this.getSecurityRecommendations(filteredLogs, filteredThreats)
    };
  }

  // 获取主要风险
  private getTopRisks(logs: SecurityAuditLog[]) {
    const riskCounts: Record<string, number> = {};
    
    logs.forEach(log => {
      const key = `${log.action}:${log.resource}`;
      riskCounts[key] = (riskCounts[key] || 0) + 1;
    });

    return Object.entries(riskCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([risk, count]) => ({ risk, count }));
  }

  // 获取安全建议
  private getSecurityRecommendations(logs: SecurityAuditLog[], threats: SecurityThreat[]) {
    const recommendations: string[] = [];

    // 基于威胁类型的建议
    const threatTypes = [...new Set(threats.map(t => t.type))];
    
    if (threatTypes.includes('brute_force')) {
      recommendations.push('建议启用账户锁定机制和多因素认证');
    }
    
    if (threatTypes.includes('rate_limit')) {
      recommendations.push('建议优化API频率限制策略');
    }
    
    if (threatTypes.includes('suspicious_activity')) {
      recommendations.push('建议加强用户行为监控和异常检测');
    }

    // 基于日志模式的建议
    const failureRate = logs.filter(log => !log.success).length / logs.length;
    if (failureRate > 0.1) {
      recommendations.push('失败率较高，建议检查系统稳定性和用户体验');
    }

    const highRiskLogs = logs.filter(log => log.riskLevel === 'high' || log.riskLevel === 'critical');
    if (highRiskLogs.length > logs.length * 0.05) {
      recommendations.push('高风险活动较多，建议加强安全监控');
    }

    return recommendations;
  }
}

// 输入验证和清理
export class InputSanitizer {
  // XSS 防护
  static sanitizeHtml(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // SQL 注入防护
  static sanitizeSql(input: string): string {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  // 路径遍历防护
  static sanitizePath(input: string): string {
    return input
      .replace(/\.\./g, '')
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\//, '');
  }

  // 通用输入清理
  static sanitizeInput(input: string, options: {
    maxLength?: number;
    allowedChars?: RegExp;
    trim?: boolean;
  } = {}): string {
    let sanitized = input;

    if (options.trim !== false) {
      sanitized = sanitized.trim();
    }

    if (options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    if (options.allowedChars) {
      sanitized = sanitized.replace(options.allowedChars, '');
    }

    return sanitized;
  }

  // 验证邮箱格式
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // 验证密码强度
  static validatePassword(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('密码长度至少8位');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('需要包含小写字母');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('需要包含大写字母');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('需要包含数字');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('需要包含特殊字符');
    }

    return {
      isValid: score >= 4,
      score,
      feedback
    };
  }
}

// 创建全局实例
export const dataEncryption = new DataEncryption(
  process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
);

export const securityAudit = new SecurityAuditManager();

// 安全中间件工厂
export function createSecurityMiddleware() {
  return {
    // 记录请求日志
    logRequest: (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;
        
        securityAudit.logSecurityEvent({
          action: req.method,
          resource: req.path,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent') || '',
          success,
          riskLevel: success ? 'low' : 'medium',
          userId: req.user?.id,
          details: {
            statusCode: res.statusCode,
            duration,
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.method === 'POST' ? '[REDACTED]' : undefined
          }
        });
      });
      
      next();
    },

    // 输入验证中间件
    validateInput: (req: any, res: any, next: any) => {
      // 清理查询参数
      if (req.query) {
        Object.keys(req.query).forEach(key => {
          if (typeof req.query[key] === 'string') {
            req.query[key] = InputSanitizer.sanitizeInput(req.query[key], {
              maxLength: 1000,
              trim: true
            });
          }
        });
      }

      // 清理请求体
      if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
          if (typeof req.body[key] === 'string') {
            req.body[key] = InputSanitizer.sanitizeInput(req.body[key], {
              maxLength: 10000,
              trim: true
            });
          }
        });
      }

      next();
    }
  };
}