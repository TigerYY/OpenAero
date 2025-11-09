import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * 邮件服务类
 */
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * 发送邮件
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const mailOptions = {
        from: `"${process.env.SMTP_SENDER_NAME || 'OpenAero'}" <${process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('邮件发送成功:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      return { success: true };
    } catch (error) {
      console.error('邮件发送失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '发送邮件时发生未知错误' 
      };
    }
  }

  /**
   * 发送邮箱验证邮件
   */
  async sendVerificationEmail(email: string, verificationUrl: string): Promise<{ success: boolean; error?: string }> {
    const subject = '验证您的 OpenAero 账户';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>验证您的 OpenAero 账户</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>欢迎加入 OpenAero！</h1>
          </div>
          <div class="content">
            <p>感谢您注册 OpenAero 账户。请点击下面的按钮验证您的邮箱地址：</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">验证邮箱地址</a>
            </div>
            <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
            <p>此链接将在24小时后失效。</p>
            <p>如果您没有注册此账户，请忽略此邮件。</p>
          </div>
          <div class="footer">
            <p>© 2025 OpenAero. 保留所有权利。</p>
            <p>此邮件由系统自动发送，请勿回复。</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      欢迎加入 OpenAero！
      
      感谢您注册 OpenAero 账户。请访问以下链接验证您的邮箱地址：
      ${verificationUrl}
      
      此链接将在24小时后失效。
      
      如果您没有注册此账户，请忽略此邮件。
      
      © 2025 OpenAero. 保留所有权利。
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<{ success: boolean; error?: string }> {
    const subject = '重置您的 OpenAero 密码';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>重置您的 OpenAero 密码</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>重置您的密码</h1>
          </div>
          <div class="content">
            <p>我们收到了重置您 OpenAero 账户密码的请求。</p>
            <div class="warning">
              <strong>安全提醒：</strong>如果您没有请求重置密码，请忽略此邮件。
            </div>
            <p>请点击下面的按钮重置您的密码：</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">重置密码</a>
            </div>
            <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${resetUrl}</p>
            <p>此链接将在1小时后失效。</p>
          </div>
          <div class="footer">
            <p>© 2025 OpenAero. 保留所有权利。</p>
            <p>此邮件由系统自动发送，请勿回复。</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      重置您的 OpenAero 密码
      
      我们收到了重置您 OpenAero 账户密码的请求。
      
      安全提醒：如果您没有请求重置密码，请忽略此邮件。
      
      请访问以下链接重置您的密码：
      ${resetUrl}
      
      此链接将在1小时后失效。
      
      © 2025 OpenAero. 保留所有权利。
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * 测试邮件连接
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      console.error('邮件服务连接测试失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '邮件服务连接失败' 
      };
    }
  }
}

// 创建邮件服务实例
export const emailService = new EmailService();