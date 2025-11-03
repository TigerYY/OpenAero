'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';

interface BottomNavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: number;
  color?: string;
}

export default function EnhancedMobileBottomNavigation() {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // 自动隐藏导航栏（滚动时）
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // 向下滚动且超过100px时隐藏
        setIsVisible(false);
      } else {
        // 向上滚动时显示
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const bottomNavItems: BottomNavItem[] = [
    {
      name: '首页',
      href: '/',
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.47 3.84a.75.75 0 01.06 1.06L9.93 6.5h6.57a.75.75 0 010 1.5H9.93l1.6 1.6a.75.75 0 11-1.06 1.06L7.22 7.41a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06-.06z"/>
        </svg>
      )
    },
    {
      name: '解决方案',
      href: '/solutions',
      color: 'indigo',
      badge: 5,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      name: '供应链',
      href: '/supply-chain',
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      name: '我的',
      href: '/profile',
      color: 'purple',
      badge: 2,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
        </svg>
      )
    }
  ];

  const isActive = useCallback((href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  }, [pathname]);

  // 模拟触觉反馈
  const simulateHapticFeedback = useCallback(() => {
    // 在支持的设备上触发触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // 轻微震动10ms
    }
  }, []);

  const handleNavClick = useCallback((index: number) => {
    setActiveIndex(index);
    simulateHapticFeedback();
  }, [simulateHapticFeedback]);

  // 更新活动索引
  useEffect(() => {
    const currentIndex = bottomNavItems.findIndex(item => isActive(item.href));
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    }
  }, [pathname, isActive]);

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 lg:hidden z-30 transition-all duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* 活动指示器背景 */}
      <div 
        className="absolute top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out rounded-full"
        style={{
          left: `${(activeIndex / bottomNavItems.length) * 100}%`,
          width: `${100 / bottomNavItems.length}%`
        }}
      />

      <div className="grid grid-cols-4 h-16 relative">
        {bottomNavItems.map((item, index) => {
          const active = isActive(item.href);
          const colorClasses = {
            blue: active ? 'text-blue-600' : 'text-gray-500',
            indigo: active ? 'text-indigo-600' : 'text-gray-500',
            green: active ? 'text-green-600' : 'text-gray-500',
            purple: active ? 'text-purple-600' : 'text-gray-500'
          };

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => handleNavClick(index)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                active
                  ? `${colorClasses[item.color as keyof typeof colorClasses]} bg-gradient-to-t from-${item.color}-50/50 to-transparent`
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
              }`}
              aria-label={item.name}
              role="tab"
              aria-selected={active}
            >
              {/* 图标容器 */}
              <div className={`relative transition-all duration-300 ${
                active ? 'scale-110 -translate-y-0.5' : 'group-hover:scale-105'
              }`}>
                {/* 活动状态背景光晕 */}
                {active && (
                  <div className={`absolute inset-0 bg-${item.color}-100 rounded-full scale-150 opacity-60 animate-pulse`} />
                )}
                
                {/* 图标 */}
                <div className="relative z-10">
                  {active && item.activeIcon ? item.activeIcon : item.icon}
                </div>

                {/* 徽章 */}
                {item.badge && item.badge > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </div>

              {/* 标签 */}
              <span className={`text-xs mt-1 font-medium transition-all duration-300 ${
                active 
                  ? 'font-semibold opacity-100 transform translate-y-0' 
                  : 'opacity-80 transform translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0'
              }`}>
                {item.name}
              </span>

              {/* 活动状态指示点 */}
              {active && (
                <div className={`absolute bottom-1 w-1 h-1 bg-${item.color}-600 rounded-full animate-pulse`} />
              )}

              {/* 点击波纹效果 */}
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-200/0 to-gray-200/0 group-active:from-gray-200/30 group-active:to-gray-200/10 transition-all duration-150" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* 底部安全区域指示 */}
      <div className="h-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </div>
  );
}