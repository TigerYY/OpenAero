'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';


import { MobilePerformanceProvider } from '@/components/MobilePerformanceProvider';
import PushNotificationManager from '@/components/PushNotificationManager';
import PWAInstaller from '@/components/PWAInstaller';

import MobileNavigation, { MobileBottomNavigation } from './MobileNavigation';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <MobilePerformanceProvider>
      <div className="min-h-screen bg-gray-50">
      {/* 桌面端导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">OA</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">OpenAero</span>
              </Link>
            </div>

            {/* 桌面端导航菜单 */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors ${
                  pathname === '/' 
                    ? 'text-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                首页
              </Link>
              <Link
                href="/solutions"
                className={`text-sm font-medium transition-colors ${
                  pathname.startsWith('/solutions') 
                    ? 'text-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                解决方案
              </Link>
              <Link
                href="/creators"
                className={`text-sm font-medium transition-colors ${
                  pathname.startsWith('/creators') 
                    ? 'text-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                创作者
              </Link>
              <Link
                href="/analytics"
                className={`text-sm font-medium transition-colors ${
                  pathname.startsWith('/analytics') 
                    ? 'text-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                数据分析
              </Link>
            </nav>

            {/* 右侧操作区 */}
            <div className="flex items-center space-x-4">
              {/* 搜索按钮 */}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* 通知按钮 */}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.97 4.97a.75.75 0 0 0-1.08 1.05l-3.99 4.99a.75.75 0 0 0 1.08 1.05l3.99-4.99a.75.75 0 0 0 0-1.1zM9.02 8.69a.75.75 0 0 0 1.06 1.06l8.5-8.5a.75.75 0 0 0-1.06-1.06l-8.5 8.5z" />
                </svg>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* 桌面端登录/注册按钮 */}
              <div className="hidden lg:flex items-center space-x-3">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  注册
                </Link>
              </div>

              {/* 移动端菜单按钮 */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 移动端侧边栏导航 */}
      <MobileNavigation 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* 主要内容区域 */}
      <main className={`${isMobile ? 'pb-16' : ''}`}>
        {children}
      </main>

      {/* 移动端底部导航栏 */}
      <MobileBottomNavigation />

      {/* PWA 安装提示 */}
        <PWAInstaller />
        <PushNotificationManager 
          onSubscriptionChange={(subscription: PushSubscription | null) => {
            console.log('Push subscription changed:', subscription);
          }}
          onNotificationReceived={(notification: any) => {
            console.log('Notification received:', notification);
          }}
        />
      </div>
    </MobilePerformanceProvider>
  );
}
function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('用户接受了安装提示');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || localStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">OA</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">安装 OpenAero 应用</h3>
          <p className="text-xs text-gray-500 mt-1">
            将 OpenAero 添加到主屏幕，获得更好的使用体验
          </p>
          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
            >
              安装
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-gray-500 text-xs font-medium hover:text-gray-700 transition-colors"
            >
              稍后
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}