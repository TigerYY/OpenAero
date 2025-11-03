import { NextApiRequest, NextApiResponse } from 'next';

import logger from '@/lib/logger';
import { authenticateToken } from '../../../backend/auth/auth.middleware';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UnsubscribeRequestBody {
  subscription: PushSubscription;
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
    const authResult = await authenticateToken(req as unknown as NextApiRequest);
    if (authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = (req as unknown as { user: { userId: string } }).user;
    const { subscription }: UnsubscribeRequestBody = req.body;

    // 验证订阅数据
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // 这里应该从数据库中删除订阅信息
    // 示例：使用 Prisma 或其他 ORM
    /*
    await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.userId,
        endpoint: subscription.endpoint
      }
    });
    */

    // 临时日志记录（生产环境应使用数据库）
    logger.info('Push subscription removed:', {
      userId: user.userId,
      endpoint: subscription.endpoint,
      removedAt: new Date().toISOString()
    });

    res.status(200).json({ 
      success: true, 
      message: 'Subscription removed successfully'
    });

  } catch (error) {
    logger.error('Unsubscribe API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}