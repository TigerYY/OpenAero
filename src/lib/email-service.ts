/**
 * 邮件服务
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export class EmailService {
  /**
   * 发送邮件
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: 实现实际的邮件发送逻辑
      console.log('发送邮件:', options);
      return { success: true };
    } catch (error) {
      console.error('发送邮件失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '发送邮件失败' 
      };
    }
  }

  /**
   * 发送验证邮件
   */
  async sendVerificationEmail(email: string, token: string): Promise<{ success: boolean; error?: string }> {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;
    
    return this.sendEmail({
      to: email,
      subject: '验证您的邮箱地址',
      html: `
        <h1>欢迎注册 OpenAero</h1>
        <p>请点击下面的链接验证您的邮箱地址:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>如果您没有注册账户,请忽略此邮件。</p>
      `,
    });
  }

  /**
   * 发送重置密码邮件
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
    
    return this.sendEmail({
      to: email,
      subject: '重置您的密码',
      html: `
        <h1>重置密码</h1>
        <p>请点击下面的链接重置您的密码:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>如果您没有请求重置密码,请忽略此邮件。</p>
        <p>此链接将在24小时后失效。</p>
      `,
    });
  }

  /**
   * 发送通知邮件
   */
  async sendNotificationEmail(
    email: string, 
    subject: string, 
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      to: email,
      subject,
      html: `
        <h1>${subject}</h1>
        <p>${message}</p>
      `,
    });
  }
}

// 导出单例
export const emailService = new EmailService();
