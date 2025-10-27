'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TouchGestureHandler from '@/components/TouchGestureHandler';

interface EnhancedMobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  submenu?: Array<{ name: string; href: string; badge?: string }>;
  badge?: string;
}

export default function EnhancedMobileNavigation({ isOpen, onClose }: EnhancedMobileNavigationProps) {
  const pathname = usePathname();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 键盘导航和无障碍支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      // 快捷键支持
      if (e.key === '/' && isOpen && !isSearchFocused) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 聚焦管理
      setTimeout(() => {
        sidebarRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isSearchFocused]);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    };
  }, [isOpen]);

  const navigationItems: NavigationItem[] = [
    {
      name: '首页',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      name: '解决方案',
      href: '/solutions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      submenu: [
        { name: '浏览全部', href: '/solutions' },
        { name: '无人机套件', href: '/solutions?category=drone-kits', badge: 'Hot' },
        { name: '飞控系统', href: '/solutions?category=flight-control' },
        { name: '传感器模块', href: '/solutions?category=sensors', badge: 'New' },
        { name: '通信设备', href: '/solutions?category=communication' },
        { name: '地面站软件', href: '/solutions?category=ground-station' }
      ]
    },
    {
      name: '供应链',
      href: '/supply-chain',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      submenu: [
        { name: '工厂管理', href: '/supply-chain/factories' },
        { name: '样品订单', href: '/supply-chain/sample-orders' },
        { name: '供应商网络', href: '/supply-chain/suppliers' }
      ]
    },
    {
      name: '创作者',
      href: '/creators',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      submenu: [
        { name: '申请加入', href: '/creators/apply' },
        { name: '创作者社区', href: '/creators/community' },
        { name: '资源中心', href: '/creators/resources' }
      ]
    },
    {
      name: '移动端',
      href: '/mobile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" />
        </svg>
      ),
      submenu: [
        { name: '联系我们', href: '/mobile/contact' },
        { name: '创作者申请', href: '/mobile/creator-apply' },
        { name: '手势测试', href: '/mobile/gestures', badge: 'Demo' }
      ]
    }
  ];

  const handleSubmenuToggle = useCallback((itemName: string) => {
    setActiveSubmenu(activeSubmenu === itemName ? null : itemName);
  }, [activeSubmenu]);

  const isActive = useCallback((href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  }, [pathname]);

  // 搜索过滤
  const filteredItems = navigationItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.submenu?.some(subItem => 
      subItem.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // 手势处理
  const handleSwipe = useCallback((direction: string) => {
    if (direction === 'left') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 侧边栏 */}
      <TouchGestureHandler
        onSwipe={handleSwipe}
        className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-2xl transform transition-all duration-300 ease-out lg:hidden"
      >
        <div 
          ref={sidebarRef}
          className="flex flex-col h-full focus:outline-none"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="移动端导航菜单"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">OA</span>
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">OpenAero</span>
                <p className="text-xs text-gray-500">移动端导航</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
              aria-label="关闭导航菜单"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 搜索栏 */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜索菜单... (按 / 快速搜索)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* 导航菜单 */}
          <div className="flex-1 overflow-y-auto py-2">
            <nav className="space-y-1 px-3" role="navigation">
              {filteredItems.map((item) => (
                <div key={item.name} className="group">
                  {item.submenu ? (
                    <>
                      <button
                        onClick={() => handleSubmenuToggle(item.name)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-98 ${
                          isActive(item.href)
                            ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                        aria-expanded={activeSubmenu === item.name}
                        aria-controls={`submenu-${item.name}`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="transition-all duration-200 group-hover:scale-110">
                            {item.icon}
                          </span>
                          <span>{item.name}</span>
                          {item.badge && (
                            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-600 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <svg
                          className={`w-4 h-4 transition-transform duration-300 ${
                            activeSubmenu === item.name ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      <div 
                        id={`submenu-${item.name}`}
                        className={`overflow-hidden transition-all duration-300 ${
                          activeSubmenu === item.name 
                            ? 'max-h-96 opacity-100 mt-2' 
                            : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="space-y-1 pl-6 pr-2">
                          {item.submenu.map((subItem) => (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={onClose}
                              className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-98 ${
                                pathname === subItem.href
                                  ? 'bg-blue-50 text-blue-600 font-medium shadow-sm border-l-2 border-blue-500'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100'
                              }`}
                            >
                              <span>{subItem.name}</span>
                              {subItem.badge && (
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  subItem.badge === 'New' ? 'bg-green-100 text-green-600' :
                                  subItem.badge === 'Hot' ? 'bg-red-100 text-red-600' :
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  {subItem.badge}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-98 ${
                        isActive(item.href)
                          ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="transition-all duration-200 group-hover:scale-110">
                          {item.icon}
                        </span>
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-600 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* 搜索无结果 */}
            {searchQuery && filteredItems.length === 0 && (
              <div className="px-4 py-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 text-sm">未找到匹配的菜单项</p>
                <p className="text-gray-400 text-xs mt-1">尝试使用其他关键词</p>
              </div>
            )}
          </div>

          {/* 底部操作 */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="space-y-3">
              <Link
                href="/auth/login"
                onClick={onClose}
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 active:scale-98"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                登录
              </Link>
              <Link
                href="/auth/register"
                onClick={onClose}
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 active:scale-98 shadow-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                注册
              </Link>
            </div>
            
            {/* 快捷提示 */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400 text-center">
                💡 提示：向左滑动可关闭菜单
              </p>
            </div>
          </div>
        </div>
      </TouchGestureHandler>
    </>
  );
}