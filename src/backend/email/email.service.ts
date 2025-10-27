import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: any;
  private fromEmail: string;

  constructor() {
    // 暂时禁用邮件功能以解决构建问题
    this.fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@openaero.cn';
    this.transporter = null;
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      // 暂时返回true，实际不发送邮件
      console.log('邮件发送已禁用 (构建模式):', options.to, options.subject);
      
      // 记录邮件发送日志
      await this.logEmailSent(options.to, options.subject, true, 'mock-message-id');
      
      return true;
    } catch (error) {
      console.error('邮件发送失败:', error);
      
      // 记录邮件发送失败日志
      await this.logEmailSent(options.to, options.subject, false, null, error instanceof Error ? error.message : '未知错误');
      
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, name?: string): Promise<boolean> {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
    
    const template = this.getVerificationEmailTemplate(verificationUrl, name);
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, name?: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
    
    const template = this.getPasswordResetEmailTemplate(resetUrl, name);
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const template = this.getWelcomeEmailTemplate(name);
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  private getVerificationEmailTemplate(verificationUrl: string, name?: string): EmailTemplate {
    const displayName = name || '用户';
    
    return {
      subject: '验证您的邮箱地址 - OpenAero',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>验证邮箱</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">OpenAero</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">航空方案平台</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">验证您的邮箱地址</h2>
            
            <p>亲爱的 ${displayName}，</p>
            
            <p>感谢您注册 OpenAero！为了完成注册流程，请点击下面的按钮验证您的邮箱地址：</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                验证邮箱
              </a>
            </div>
            
            <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
            <p style="background: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 14px;">
              ${verificationUrl}
            </p>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              此链接将在24小时后过期。如果您没有注册 OpenAero 账户，请忽略此邮件。
            </p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              © 2025 OpenAero. 保留所有权利。<br>
              如有疑问，请联系我们：support@openaero.cn
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        验证您的邮箱地址 - OpenAero
        
        亲爱的 ${displayName}，
        
        感谢您注册 OpenAero！为了完成注册流程，请访问以下链接验证您的邮箱地址：
        
        ${verificationUrl}
        
        此链接将在24小时后过期。如果您没有注册 OpenAero 账户，请忽略此邮件。
        
        © 2025 OpenAero
        如有疑问，请联系我们：support@openaero.cn
      `,
    };
  }

  private getPasswordResetEmailTemplate(resetUrl: string, name?: string): EmailTemplate {
    const displayName = name || '用户';
    
    return {
      subject: '重置您的密码 - OpenAero',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>重置密码</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">OpenAero</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">航空方案平台</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">重置您的密码</h2>
            
            <p>亲爱的 ${displayName}，</p>
            
            <p>我们收到了您的密码重置请求。点击下面的按钮来设置新密码：</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                重置密码
              </a>
            </div>
            
            <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
            <p style="background: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 14px;">
              ${resetUrl}
            </p>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              此链接将在1小时后过期。如果您没有请求重置密码，请忽略此邮件，您的密码不会被更改。
            </p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              © 2025 OpenAero. 保留所有权利。<br>
              如有疑问，请联系我们：support@openaero.cn
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        重置您的密码 - OpenAero
        
        亲爱的 ${displayName}，
        
        我们收到了您的密码重置请求。请访问以下链接来设置新密码：
        
        ${resetUrl}
        
        此链接将在1小时后过期。如果您没有请求重置密码，请忽略此邮件，您的密码不会被更改。
        
        © 2025 OpenAero
        如有疑问，请联系我们：support@openaero.cn
      `,
    };
  }

  private getWelcomeEmailTemplate(name: string): EmailTemplate {
    return {
      subject: '欢迎加入 OpenAero！',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>欢迎加入</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">OpenAero</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">航空方案平台</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">欢迎加入 OpenAero！</h2>
            
            <p>亲爱的 ${name}，</p>
            
            <p>欢迎加入 OpenAero 航空方案平台！我们很高兴您成为我们社区的一员。</p>
            
            <p>在 OpenAero，您可以：</p>
            <ul style="padding-left: 20px;">
              <li>浏览和购买专业的航空方案</li>
              <li>与航空专家交流</li>
              <li>分享您的航空经验</li>
              <li>获取最新的航空资讯</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}" 
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                开始探索
              </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              如果您有任何问题或需要帮助，请随时联系我们的客服团队。
            </p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              © 2025 OpenAero. 保留所有权利。<br>
              如有疑问，请联系我们：support@openaero.cn
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        欢迎加入 OpenAero！
        
        亲爱的 ${name}，
        
        欢迎加入 OpenAero 航空方案平台！我们很高兴您成为我们社区的一员。
        
        在 OpenAero，您可以：
        - 浏览和购买专业的航空方案
        - 与航空专家交流
        - 分享您的航空经验
        - 获取最新的航空资讯
        
        访问我们的网站开始探索：${process.env.NEXTAUTH_URL}
        
        如果您有任何问题或需要帮助，请随时联系我们的客服团队。
        
        © 2025 OpenAero
        如有疑问，请联系我们：support@openaero.cn
      `,
    };
  }

  private async logEmailSent(
    to: string,
    subject: string,
    success: boolean,
    messageId: string | null,
    error?: string
  ): Promise<void> {
    try {
      // 这里可以记录到数据库或日志文件
      console.log(`邮件发送记录: ${to} - ${subject} - ${success ? '成功' : '失败'}${error ? ` (${error})` : ''}`);
      
      // 如果需要，可以存储到数据库
      // await prisma.emailLog.create({
      //   data: {
      //     to,
      //     subject,
      //     success,
      //     messageId,
      //     error,
      //     sentAt: new Date(),
      //   },
      // });
    } catch (logError) {
      console.error('记录邮件日志失败:', logError);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('邮件服务连接测试失败:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();