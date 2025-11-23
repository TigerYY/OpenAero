'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function PWAInstaller() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // 检查是否已安装为 PWA
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    checkIfInstalled();

    // 注册 Service Worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('PWA: Registering Service Worker...');}
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });

          setSwRegistration(registration);

          // 监听 Service Worker 更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              if (process.env.NODE_ENV === 'development') {
                console.log('PWA: New Service Worker found, installing...');}
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('PWA: New Service Worker installed, prompting for update...');}
                  // 可以在这里显示更新提示
                  showUpdateAvailable();
                }
              });
            }
          });

          // 检查是否有等待中的 Service Worker
          if (registration.waiting) {
            showUpdateAvailable();
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('PWA: Service Worker registered successfully');}
        } catch (error) {
          console.error('PWA: Service Worker registration failed:', error);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('PWA: Service Worker not supported');}
      }
    };

    // 监听 PWA 安装提示事件
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    // 监听 PWA 安装完成事件
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    // 添加事件监听器
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 注册 Service Worker
    registerServiceWorker();

    // 清理函数
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 显示更新可用提示
  const showUpdateAvailable = () => {
    if (confirm('发现新版本，是否立即更新？')) {
      if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  };

  // 处理 PWA 安装
  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      console.log('PWA: Showing install prompt');
      await installPrompt.prompt();
      
      const choiceResult = await installPrompt.userChoice;
      if (process.env.NODE_ENV === 'development') {
        console.log('PWA: User choice:', choiceResult.outcome);}
      
      if (choiceResult.outcome === 'accepted') {
        if (process.env.NODE_ENV === 'development') {
          console.log('PWA: User accepted the install prompt');}
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('PWA: User dismissed the install prompt');}
      }
      
      setInstallPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('PWA: Install prompt failed:', error);
    }
  };

  // 检查推送通知权限
  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (process.env.NODE_ENV === 'development') {
        console.log('PWA: Notification permission:', permission);}
      return permission === 'granted';
    }
    return false;
  };

  // 订阅推送通知
  const subscribeToPush = async () => {
    if (!swRegistration) {
      console.log('PWA: Service Worker not registered');
      return;
    }

    try {
      const hasPermission = await checkNotificationPermission();
      if (!hasPermission) {
        if (process.env.NODE_ENV === 'development') {
          console.log('PWA: Notification permission denied');}
        return;
      }

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('PWA: Push subscription:', subscription);}
      
      // 发送订阅信息到服务器
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('PWA: Push subscription sent to server');}
    } catch (error) {
      console.error('PWA: Push subscription failed:', error);
    }
  };

  // 如果已安装，不显示安装按钮
  if (isInstalled) {
    return null;
  }

  // 如果不可安装，不显示组件
  if (!isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 lg:left-auto lg:right-4 lg:max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">
            安装 OpenAero 应用
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            安装到主屏幕，获得更好的使用体验
          </p>
        </div>
      </div>

      <div className="flex space-x-2 mt-4">
        <button
          onClick={handleInstall}
          className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          安装
        </button>
        
        <button
          onClick={() => {
            setIsInstallable(false);
            setInstallPrompt(null);
          }}
          className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 px-4 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          稍后
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={subscribeToPush}
          className="w-full text-xs text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
        >
          🔔 启用推送通知
        </button>
      </div>
    </div>
  );
}