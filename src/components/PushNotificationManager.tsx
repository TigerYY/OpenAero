import React, { useState, useEffect, useCallback } from 'react';

interface PushNotificationManagerProps {
  vapidPublicKey?: string;
  onSubscriptionChange?: (subscription: PushSubscription | null) => void;
  onNotificationReceived?: (notification: any) => void;
}

interface NotificationPermission {
  state: 'default' | 'granted' | 'denied';
  canRequest: boolean;
}

export default function PushNotificationManager({
  vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  onSubscriptionChange,
  onNotificationReceived
}: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>({
    state: 'default',
    canRequest: true
  });
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 检查浏览器支持
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission({
          state: Notification.permission as 'default' | 'granted' | 'denied',
          canRequest: Notification.permission === 'default'
        });
      }
    };

    checkSupport();
  }, []);

  // 获取现有订阅
  useEffect(() => {
    if (!isSupported) return;

    const getExistingSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (existingSubscription) {
          setSubscription(existingSubscription);
          onSubscriptionChange?.(existingSubscription);
        }
      } catch (error) {
        console.error('获取推送订阅失败:', error);
      }
    };

    getExistingSubscription();
  }, [isSupported, onSubscriptionChange]);

  // 请求通知权限
  const requestPermission = useCallback(async () => {
    if (!isSupported || permission.state !== 'default') return false;

    setIsLoading(true);
    
    try {
      const result = await Notification.requestPermission();
      setPermission({
        state: result,
        canRequest: result === 'default'
      });
      
      return result === 'granted';
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission.state]);

  // 订阅推送通知
  const subscribeToPush = useCallback(async () => {
    if (!isSupported || permission.state !== 'granted' || !vapidPublicKey) return null;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setSubscription(pushSubscription);
      onSubscriptionChange?.(pushSubscription);

      // 发送订阅信息到服务器
      await sendSubscriptionToServer(pushSubscription);

      return pushSubscription;
    } catch (error) {
      console.error('订阅推送通知失败:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission.state, vapidPublicKey, onSubscriptionChange]);

  // 取消订阅
  const unsubscribeFromPush = useCallback(async () => {
    if (!subscription) return false;

    setIsLoading(true);

    try {
      const success = await subscription.unsubscribe();
      
      if (success) {
        setSubscription(null);
        onSubscriptionChange?.(null);
        
        // 通知服务器取消订阅
        await removeSubscriptionFromServer(subscription);
      }

      return success;
    } catch (error) {
      console.error('取消订阅失败:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription, onSubscriptionChange]);

  // 发送测试通知
  const sendTestNotification = useCallback(async () => {
    if (!subscription) return;

    try {
      await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          message: {
            title: 'OpenAero 测试通知',
            body: '这是一条测试推送通知',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: 'test-notification',
            data: {
              url: '/',
              timestamp: Date.now()
            }
          }
        })
      });
    } catch (error) {
      console.error('发送测试通知失败:', error);
    }
  }, [subscription]);

  // 处理一键订阅
  const handleOneClickSubscribe = useCallback(async () => {
    if (permission.state === 'default') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if (permission.state === 'granted' && !subscription) {
      await subscribeToPush();
    }
  }, [permission.state, subscription, requestPermission, subscribeToPush]);

  // 如果不支持推送通知，不渲染组件
  if (!isSupported) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">推送通知</h3>
        <div className="flex items-center space-x-2">
          {permission.state === 'granted' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              已授权
            </span>
          )}
          {permission.state === 'denied' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              已拒绝
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* 权限状态说明 */}
        <div className="text-sm text-gray-600">
          {permission.state === 'default' && (
            <p>启用推送通知以接收审核结果、订单状态等重要提醒。</p>
          )}
          {permission.state === 'granted' && subscription && (
            <p>您已成功订阅推送通知，将及时收到重要消息提醒。</p>
          )}
          {permission.state === 'granted' && !subscription && (
            <p>权限已授予，点击下方按钮完成订阅设置。</p>
          )}
          {permission.state === 'denied' && (
            <p>推送通知已被禁用。如需启用，请在浏览器设置中允许通知权限。</p>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2">
          {permission.state === 'default' && (
            <button
              onClick={requestPermission}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '请求中...' : '启用通知'}
            </button>
          )}

          {permission.state === 'granted' && !subscription && (
            <button
              onClick={subscribeToPush}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '订阅中...' : '订阅通知'}
            </button>
          )}

          {permission.state === 'granted' && subscription && (
            <>
              <button
                onClick={sendTestNotification}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                发送测试
              </button>
              <button
                onClick={unsubscribeFromPush}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '取消中...' : '取消订阅'}
              </button>
            </>
          )}

          {(permission.state === 'default' || (permission.state === 'granted' && !subscription)) && (
            <button
              onClick={handleOneClickSubscribe}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-md hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? '设置中...' : '一键开启通知'}
            </button>
          )}
        </div>

        {/* 通知类型设置 */}
        {subscription && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">通知类型</h4>
            <div className="space-y-2">
              <NotificationTypeToggle
                type="order"
                label="订单状态更新"
                description="订单确认、发货、完成等状态变化"
                defaultEnabled={true}
              />
              <NotificationTypeToggle
                type="review"
                label="审核结果通知"
                description="解决方案审核通过或需要修改"
                defaultEnabled={true}
              />
              <NotificationTypeToggle
                type="message"
                label="消息提醒"
                description="新的私信、评论或回复"
                defaultEnabled={false}
              />
              <NotificationTypeToggle
                type="promotion"
                label="活动推广"
                description="优惠活动、新功能发布等"
                defaultEnabled={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 通知类型开关组件
function NotificationTypeToggle({
  type,
  label,
  description,
  defaultEnabled
}: {
  type: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  const handleToggle = async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);

    // 保存到服务器
    try {
      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          enabled: newEnabled
        })
      });
    } catch (error) {
      console.error('保存通知偏好失败:', error);
      // 回滚状态
      setEnabled(!newEnabled);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// 工具函数：将 VAPID 公钥转换为 Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return new Uint8Array(outputArray.buffer);
}

// 发送订阅信息到服务器
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      })
    });
  } catch (error) {
    console.error('发送订阅信息到服务器失败:', error);
    throw error;
  }
}

// 从服务器移除订阅信息
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  try {
    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });
  } catch (error) {
    console.error('从服务器移除订阅信息失败:', error);
    throw error;
  }
}