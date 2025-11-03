import { PrismaClient } from '@prisma/client';

import { emailService } from './email.service';

const prisma = new PrismaClient();

export interface ReviewNotificationData {
  solutionId: string;
  solutionTitle: string;
  creatorEmail: string;
  creatorName: string;
  reviewStatus: 'APPROVED' | 'REJECTED';
  reviewNotes: string;
  reviewerName: string;
  reviewedAt: Date;
}

export class ReviewNotificationService {
  /**
   * 发送审核结果通知邮件给创作者
   */
  async sendReviewNotification(
    userId: string,
    solutionTitle: string,
    status: 'approved' | 'rejected' | 'needs_revision',
    reviewNotes?: string
  ): Promise<boolean> {
    try {
      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const data: ReviewNotificationData = {
        solutionId: '',
        solutionTitle,
        creatorEmail: user.email,
        creatorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        reviewStatus: status === 'approved' ? 'APPROVED' : 'REJECTED',
        reviewNotes: reviewNotes || '',
        reviewerName: 'OpenAero 审核团队',
        reviewedAt: new Date()
      };

      const template = this.getReviewNotificationTemplate(data);
      
      const success = await emailService.sendEmail({
        to: data.creatorEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // 记录通知发送日志
      await this.logNotificationSent(data, success);

      return success;
    } catch (error) {
      console.error('发送审核通知失败:', error);
      return false;
    }
  }

  /**
   * 发送审核结果通知邮件给创作者 (原有方法)
   */
  async sendReviewNotificationWithData(data: ReviewNotificationData): Promise<boolean> {
    try {
      const template = this.getReviewNotificationTemplate(data);
      
      const success = await emailService.sendEmail({
        to: data.creatorEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // 记录通知发送日志
      await this.logNotificationSent(data, success);

      return success;
    } catch (error) {
      console.error('发送审核通知失败:', error);
      await this.logNotificationSent(data, false, error instanceof Error ? error.message : '未知错误');
      return false;
    }
  }

  /**
   * 批量发送审核通知
   */
  async sendBatchReviewNotifications(notifications: ReviewNotificationData[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      const result = await this.sendReviewNotificationWithData(notification);
      if (result) {
        success++;
      } else {
        failed++;
      }
      
      // 添加延迟避免邮件服务器限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { success, failed };
  }

  /**
   * 生成审核通知邮件模板
   */
  private getReviewNotificationTemplate(data: ReviewNotificationData) {
    const isApproved = data.reviewStatus === 'APPROVED';
    const statusText = isApproved ? '已通过审核' : '需要修改';
    const statusColor = isApproved ? '#10b981' : '#ef4444';
    const statusIcon = isApproved ? '✅' : '❌';

    return {
      subject: `${statusIcon} 您的方案「${data.solutionTitle}」${statusText} - OpenAero`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>方案审核结果</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">OpenAero</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">航空方案平台</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: ${statusColor}; color: white; padding: 15px 25px; border-radius: 50px; display: inline-block; font-size: 18px; font-weight: bold;">
                ${statusIcon} ${statusText}
              </div>
            </div>

            <h2 style="color: #333; margin-top: 0;">审核结果通知</h2>
            
            <p>亲爱的 ${data.creatorName}，</p>
            
            <p>您提交的方案「<strong>${data.solutionTitle}</strong>」已完成审核。</p>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">审核详情</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">方案名称：</td>
                  <td style="padding: 8px 0;">${data.solutionTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">审核状态：</td>
                  <td style="padding: 8px 0; color: ${statusColor}; font-weight: bold;">${statusText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">审核员：</td>
                  <td style="padding: 8px 0;">${data.reviewerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">审核时间：</td>
                  <td style="padding: 8px 0;">${data.reviewedAt.toLocaleString('zh-CN')}</td>
                </tr>
              </table>
            </div>

            ${data.reviewNotes ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #92400e;">审核意见</h4>
              <p style="margin-bottom: 0; color: #92400e;">${data.reviewNotes}</p>
            </div>
            ` : ''}

            ${isApproved ? `
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #10b981; font-size: 16px; margin-bottom: 20px;">🎉 恭喜！您的方案已通过审核并发布到平台上。</p>
              <a href="${process.env.NEXTAUTH_URL}/solutions/${data.solutionId}" 
                 style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                查看方案
              </a>
            </div>
            ` : `
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #ef4444; font-size: 16px; margin-bottom: 20px;">请根据审核意见修改您的方案后重新提交。</p>
              <a href="${process.env.NEXTAUTH_URL}/creators/solutions/${data.solutionId}/edit" 
                 style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                修改方案
              </a>
            </div>
            `}
            
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
        方案审核结果 - OpenAero
        
        亲爱的 ${data.creatorName}，
        
        您提交的方案「${data.solutionTitle}」已完成审核。
        
        审核结果：${statusText}
        审核员：${data.reviewerName}
        审核时间：${data.reviewedAt.toLocaleString('zh-CN')}
        
        ${data.reviewNotes ? `审核意见：${data.reviewNotes}` : ''}
        
        ${isApproved 
          ? `恭喜！您的方案已通过审核并发布到平台上。\n查看方案：${process.env.NEXTAUTH_URL}/solutions/${data.solutionId}`
          : `请根据审核意见修改您的方案后重新提交。\n修改方案：${process.env.NEXTAUTH_URL}/creators/solutions/${data.solutionId}/edit`
        }
        
        如有疑问，请联系我们：support@openaero.cn
        
        © 2025 OpenAero. 保留所有权利。
      `
    };
  }

  /**
   * 记录通知发送日志
   */
  private async logNotificationSent(
    data: ReviewNotificationData,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      // 这里可以记录到数据库或日志文件
      console.log(`审核通知发送${success ? '成功' : '失败'}:`, {
        solutionId: data.solutionId,
        creatorEmail: data.creatorEmail,
        reviewStatus: data.reviewStatus,
        success,
        error,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('记录通知日志失败:', logError);
    }
  }
}

export const reviewNotificationService = new ReviewNotificationService();