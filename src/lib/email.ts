import nodemailer from 'nodemailer';

// 邮件内容接口
export interface EmailContent {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// 邮件服务类
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // 创建邮件传输器
    this.transporter = nodemailer.createTransporter({
      host: 'smtp.exmail.qq.com',
      port: 465,
      secure: true, // 使用SSL
      auth: {
        user: process.env.EMAIL_FROM || 'support@openaero.cn',
        pass: process.env.EMAIL_SERVER?.split(':')[2]?.split('@')[0] || 'zdM469e7q3ZU2gy7'
      }
    });
  }

  // 验证邮件服务连接
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('邮件服务连接成功');
      return true;
    } catch (error) {
      console.error('邮件服务连接失败:', error);
      return false;
    }
  }

  // 发送邮件
  async sendEmail(content: EmailContent): Promise<boolean> {
    try {
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'OpenAero',
          address: process.env.EMAIL_FROM || 'support@openaero.cn'
        },
        to: content.to,
        subject: content.subject,
        html: content.html,
        text: content.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('邮件发送成功:', result.messageId);
      return true;
    } catch (error) {
      console.error('邮件发送失败:', error);
      return false;
    }
  }

  // 发送验证邮件
  async sendVerificationEmail(to: string, token: string): Promise<boolean> {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">欢迎注册 OpenAero</h2>
        <p>请点击下面的链接验证您的邮箱地址：</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">验证邮箱</a>
        <p>如果按钮无法点击，请复制以下链接到浏览器：</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p>此链接将在24小时后失效。</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'OpenAero - 邮箱验证',
      html
    });
  }

  // 发送密码重置邮件
  async sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">重置您的 OpenAero 密码</h2>
        <p>我们收到了重置您账户密码的请求。请点击下面的链接重置密码：</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px;">重置密码</a>
        <p>如果按钮无法点击，请复制以下链接到浏览器：</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p>此链接将在1小时后失效。</p>
        <p>如果您没有请求重置密码，请忽略此邮件。</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'OpenAero - 密码重置',
      html
    });
  }
}

// 创建全局邮件服务实例
export const emailService = new EmailService();