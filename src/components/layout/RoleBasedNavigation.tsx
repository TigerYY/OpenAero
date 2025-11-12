'use client';

import Link from 'next/link';
import { useRouting } from '@/lib/routing';
import React from 'react';

interface NavigationItem {
  name: string;
  href: string;
  icon?: string;
  children?: NavigationItem[];
}

// 简化的导航项定义 - 无用户权限控制
const createNavigationItems = (routes: any): NavigationItem[] => [
  {
    name: '解决方案',
    href: routes.BUSINESS.SOLUTIONS,
    icon: '💡'
  },
  {
    name: '产品商店',
    href: routes.BUSINESS.SHOP,
    icon: '🛒'
  },
  {
    name: '创作者申请',
    href: routes.BUSINESS.CREATORS_APPLY,
    icon: '🚀'
  },
  {
    name: '关于我们',
    href: routes.BUSINESS.ABOUT,
    icon: '👥'
  },
  {
    name: '联系我们',
    href: routes.BUSINESS.CONTACT,
    icon: '📧'
  }
];

export function RoleBasedNavigation() {
  const { route, routes, isActive } = useRouting();
  
  const navigationItems = createNavigationItems(routes);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 左侧导航 */}
          <div className="flex space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={route(item.href)}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(item.href)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.name}
              </Link>
            ))}
          </div>

          {/* 右侧简单提示 */}
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              访客模式
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

// 移动端导航组件
export function MobileRoleBasedNavigation() {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const navigationItems = createNavigationItems(routes);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <span className="sr-only">打开主菜单</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>

          {/* 移动端导航菜单 */}
          {isOpen && (
            <div className="absolute top-16 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={route(item.href)}
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    {item.name}
                  </Link>
                ))}
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="px-3 py-2 text-sm font-medium text-gray-500">
                    当前为访客模式
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}