import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client';

import { ReviewNotificationService } from '@/backend/email/review-notification.service';
import { prisma } from '@/lib/prisma';
import { getWebSocketManager } from '@/lib/websocket';

export interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  priority?: NotificationPriority;
  channels?: string[];
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  websocketEnabled: boolean;
  reviewNotifications: boolean;
  systemNotifications: boolean;
  marketingNotifications: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
}

export class NotificationService {
  private prisma: PrismaClient;
  private webSocketManager: any;
  private reviewNotificationService: ReviewNotificationService;

  constructor() {
    this.prisma = new PrismaClient();
    this.webSocketManager = getWebSocketManager();
    this.reviewNotificationService = new ReviewNotificationService();
  }

  // 发送通知
  async sendNotification(data: NotificationData): Promise<void> {
    try {
      // 获取用户通知偏好
      const preferences = await this.getUserPreferences(data.userId);
      
      // 检查是否在静默时间
      if (this.isInQuietHours(preferences)) {
        // 延迟到静默时间结束后发送
        data.scheduledAt = this.getNextActiveTime(preferences);
      }

      // 保存通知到数据库
      const notification = await this.saveNotification(data);

      // 根据偏好发送通知
      const deliveryResults: Record<string, boolean> = {};

      if (preferences.websocketEnabled && data.channels?.includes('websocket')) {
        deliveryResults.websocket = await this.sendWebSocketNotification(data);
      }

      if (preferences.emailEnabled && data.channels?.includes('email')) {
        deliveryResults.email = await this.sendEmailNotification(data);
      }

      if (preferences.pushEnabled && data.channels?.includes('push')) {
        deliveryResults.push = await this.sendPushNotification(data);
      }

      // 更新通知发送状态
      await this.updateNotificationDelivery(notification.id, deliveryResults);

    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  // 发送审核结果通知
  async sendReviewNotification(
    userId: string,
    solutionTitle: string,
    status: 'approved' | 'rejected' | 'needs_revision',
    reviewNotes?: string
  ): Promise<void> {
    const notificationData: NotificationData = {
      type: NotificationType.REVIEW,
      title: `方案审核${status === 'approved' ? '通过' : status === 'rejected' ? '被拒绝' : '需要修改'}`,
      message: `您的方案"${solutionTitle}"${status === 'approved' ? '已通过审核' : status === 'rejected' ? '审核被拒绝' : '需要修改'}`,
      userId,
      actionUrl: '/dashboard/solutions',
      metadata: {
        solutionTitle,
        status,
        reviewNotes
      },
      priority: NotificationPriority.HIGH,
      channels: ['websocket', 'email']
    };

    await this.sendNotification(notificationData);
  }

  // 发送系统通知
  async sendSystemNotification(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<void> {
    const notificationData: NotificationData = {
      type: NotificationType.SYSTEM,
      title,
      message,
      userId,
      actionUrl,
      priority,
      channels: ['websocket', 'email']
    };

    await this.sendNotification(notificationData);
  }

  // 批量发送通知
  async sendBatchNotifications(notifications: NotificationData[]): Promise<void> {
    const promises = notifications.map(notification => this.sendNotification(notification));
    await Promise.allSettled(promises);
  }

  // 获取用户通知列表
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ) {
    const skip = (page - 1) * limit;
    
    const where = {
      userId,
      ...(unreadOnly && { read: false })
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.notification.count({ where })
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // 标记通知为已读
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  }

  // 批量标记为已读
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  }

  // 删除通知
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId
      }
    });
  }

  // 获取用户通知偏好
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!preferences) {
      // 创建默认偏好
      preferences = await this.prisma.notificationPreference.create({
        data: {
          userId,
          emailEnabled: true,
          pushEnabled: true,
          websocketEnabled: true,
          reviewNotifications: true,
          systemNotifications: true,
          marketingNotifications: false,
          timezone: 'Asia/Shanghai'
        }
      });
    }

    return preferences;
  }

  // 更新用户通知偏好
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences,
        emailEnabled: preferences.emailEnabled ?? true,
        pushEnabled: preferences.pushEnabled ?? true,
        websocketEnabled: preferences.websocketEnabled ?? true,
        reviewNotifications: preferences.reviewNotifications ?? true,
        systemNotifications: preferences.systemNotifications ?? true,
        marketingNotifications: preferences.marketingNotifications ?? false,
        timezone: preferences.timezone ?? 'Asia/Shanghai'
      }
    });
  }

  // 发送WebSocket通知
  private async sendWebSocketNotification(data: NotificationData): Promise<boolean> {
    try {
      this.webSocketManager.sendToUser(data.userId, {
        type: 'notification',
        data: {
          type: data.type,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          metadata: data.metadata,
          priority: data.priority
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error);
      return false;
    }
  }

  // 发送邮件通知
  private async sendEmailNotification(data: NotificationData): Promise<boolean> {
    try {
      if (data.type === NotificationType.REVIEW && data.metadata?.status) {
        await this.reviewNotificationService.sendReviewNotification(
          data.userId,
          data.metadata.solutionTitle,
          data.metadata.status,
          data.metadata.reviewNotes
        );
      } else {
        // 发送通用邮件通知
        // 这里可以实现通用邮件发送逻辑
      }
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  // 发送推送通知
  private async sendPushNotification(data: NotificationData): Promise<boolean> {
    try {
      // 实现推送通知逻辑
      // 这里可以集成第三方推送服务
      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  // 保存通知到数据库
  private async saveNotification(data: NotificationData) {
    return await this.prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        userId: data.userId,
        actionUrl: data.actionUrl,
        metadata: data.metadata || {},
        priority: data.priority || NotificationPriority.MEDIUM,
        channels: data.channels || [],
        scheduledAt: data.scheduledAt,
        expiresAt: data.expiresAt
      }
    });
  }

  // 更新通知发送状态
  private async updateNotificationDelivery(
    notificationId: string,
    deliveryResults: Record<string, boolean>
  ): Promise<void> {
    const delivered = Object.values(deliveryResults).some(result => result);
    
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        delivered,
        deliveryStatus: deliveryResults
      }
    });
  }

  // 检查是否在静默时间
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
    
    return currentTime >= preferences.quietHoursStart && 
           currentTime <= preferences.quietHoursEnd;
  }

  // 获取下一个活跃时间
  private getNextActiveTime(preferences: NotificationPreferences): Date {
    if (!preferences.quietHoursEnd) {
      return new Date();
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [hours, minutes] = preferences.quietHoursEnd.split(':').map(Number);
    tomorrow.setHours(hours, minutes, 0, 0);
    
    return tomorrow;
  }
}

export const notificationService = new NotificationService();