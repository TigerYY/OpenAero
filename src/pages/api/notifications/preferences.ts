import { NextApiRequest, NextApiResponse } from 'next';

import { authenticateToken } from '../../../backend/auth/auth.middleware';

interface NotificationPreference {
  type: string;
  enabled: boolean;
}

interface PreferencesRequestBody {
  type?: string;
  enabled?: boolean;
  preferences?: NotificationPreference[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 验证用户身份
    const authResult = await authenticateToken(req as any);
    if (authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = (req as any).user;

    if (req.method === 'GET') {
      // 获取用户通知偏好
      return await getUserPreferences(user.userId, res);
    } else if (req.method === 'POST') {
      // 更新用户通知偏好
      return await updateUserPreferences(user.userId, req.body, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Notification preferences API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 获取用户通知偏好
async function getUserPreferences(userId: string, res: NextApiResponse) {
  try {
    // 这里应该从数据库中获取用户偏好
    // 示例：使用 Prisma 或其他 ORM
    /*
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId },
      select: {
        type: true,
        enabled: true
      }
    });
    */

    // 默认偏好设置
    const defaultPreferences = [
      { type: 'order', enabled: true, label: '订单状态更新', description: '订单确认、发货、完成等状态变化' },
      { type: 'review', enabled: true, label: '审核结果通知', description: '解决方案审核通过或需要修改' },
      { type: 'message', enabled: false, label: '消息提醒', description: '新的私信、评论或回复' },
      { type: 'promotion', enabled: false, label: '活动推广', description: '优惠活动、新功能发布等' },
      { type: 'system', enabled: true, label: '系统通知', description: '系统维护、重要公告等' }
    ];

    res.status(200).json({
      success: true,
      data: {
        preferences: defaultPreferences,
        userId
      }
    });

  } catch (error) {
    console.error('Failed to get user preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
}

// 更新用户通知偏好
async function updateUserPreferences(
  userId: string, 
  body: PreferencesRequestBody, 
  res: NextApiResponse
) {
  try {
    const { type, enabled, preferences } = body;

    if (preferences && Array.isArray(preferences)) {
      // 批量更新偏好
      for (const pref of preferences) {
        if (!pref.type || typeof pref.enabled !== 'boolean') {
          return res.status(400).json({ error: 'Invalid preference data' });
        }
      }

      // 这里应该批量更新数据库
      /*
      for (const pref of preferences) {
        await prisma.notificationPreference.upsert({
          where: {
            userId_type: {
              userId,
              type: pref.type
            }
          },
          update: {
            enabled: pref.enabled,
            updatedAt: new Date()
          },
          create: {
            userId,
            type: pref.type,
            enabled: pref.enabled,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      */

      console.log('Batch updated preferences:', { userId, preferences });

      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        data: { updated: preferences.length }
      });

    } else if (type && typeof enabled === 'boolean') {
      // 单个偏好更新
      if (!['order', 'review', 'message', 'promotion', 'system'].includes(type)) {
        return res.status(400).json({ error: 'Invalid notification type' });
      }

      // 这里应该更新数据库
      /*
      await prisma.notificationPreference.upsert({
        where: {
          userId_type: {
            userId,
            type
          }
        },
        update: {
          enabled,
          updatedAt: new Date()
        },
        create: {
          userId,
          type,
          enabled,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      */

      console.log('Updated preference:', { userId, type, enabled });

      res.status(200).json({
        success: true,
        message: 'Preference updated successfully',
        data: { type, enabled }
      });

    } else {
      return res.status(400).json({ error: 'Invalid request data' });
    }

  } catch (error) {
    console.error('Failed to update user preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
}