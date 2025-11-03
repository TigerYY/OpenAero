import { NextApiRequest, NextApiResponse } from 'next';

import { authenticateToken } from '../../../backend/auth/auth.middleware';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface TestNotificationRequestBody {
  subscription: PushSubscription;
  message?: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  };
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
    const { subscription, message }: TestNotificationRequestBody = req.body;

    // 验证订阅数据
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // 发送测试通知
    try {
      await sendTestNotification(subscription, message);
      
      res.status(200).json({ 
        success: true, 
        message: 'Test notification sent successfully'
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      res.status(500).json({ 
        error: 'Failed to send test notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Test notification API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 发送测试通知
async function sendTestNotification(
  subscription: PushSubscription, 
  customMessage?: any
) {
  try {
    const webpush = require('web-push');
    
    // 配置 VAPID 密钥
    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      process.env.VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || ''
    );

    // 默认测试消息
    const defaultMessage = {
      title: 'OpenAero 测试通知',
      body: '这是一条测试推送通知，用于验证通知功能是否正常工作。',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-notification',
      data: {
        url: '/',
        timestamp: Date.now(),
        type: 'test'
      },
      actions: [
        {
          action: 'view',
          title: '查看',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: '关闭',
          icon: '/icons/close-icon.png'
        }
      ]
    };

    // 合并自定义消息
    const payload = JSON.stringify({
      ...defaultMessage,
      ...customMessage
    });

    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    console.error('Failed to send test notification:', error);
    throw error;
  }
}