import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateToken } from '../../../backend/auth/auth.middleware';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SubscribeRequestBody {
  subscription: PushSubscription;
  userAgent?: string;
  timestamp?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 验证用户身份
    const authResult = await authenticateToken(req as any);
    if (authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = (req as any).user;
    const { subscription, userAgent, timestamp }: SubscribeRequestBody = req.body;

    // 验证订阅数据
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // 这里应该将订阅信息保存到数据库
    // 示例：使用 Prisma 或其他 ORM
    /*
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: user.userId,
          endpoint: subscription.endpoint
        }
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        updatedAt: new Date()
      },
      create: {
        userId: user.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    */

    // 临时存储到内存中（生产环境应使用数据库）
    const subscriptionData = {
      userId: user.userId,
      subscription,
      userAgent,
      timestamp: timestamp || Date.now(),
      createdAt: new Date().toISOString()
    };

    // 这里可以添加到 Redis 或其他缓存中
    console.log('Push subscription saved:', subscriptionData);

    // 发送欢迎通知
    try {
      await sendWelcomeNotification(subscription);
    } catch (error) {
      console.error('Failed to send welcome notification:', error);
      // 不影响订阅成功
    }

    res.status(200).json({ 
      success: true, 
      message: 'Subscription saved successfully',
      subscriptionId: `${user.userId}_${Date.now()}`
    });

  } catch (error) {
    console.error('Subscribe API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 发送欢迎通知
async function sendWelcomeNotification(subscription: PushSubscription) {
  try {
    const webpush = require('web-push');
    
    // 配置 VAPID 密钥
    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      process.env.VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || ''
    );

    const payload = JSON.stringify({
      title: '欢迎使用 OpenAero 推送通知！',
      body: '您已成功订阅推送通知，将及时收到重要消息提醒。',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'welcome-notification',
      data: {
        url: '/',
        timestamp: Date.now(),
        type: 'welcome'
      },
      actions: [
        {
          action: 'view',
          title: '查看详情',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'settings',
          title: '通知设置',
          icon: '/icons/settings-icon.png'
        }
      ]
    });

    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    console.error('Failed to send welcome notification:', error);
    // 不抛出错误，避免影响订阅流程
  }
}