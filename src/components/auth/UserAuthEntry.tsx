'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { useRouting } from '@/lib/routing';

interface UserAuthEntryProps {
  variant?: 'desktop' | 'mobile';
}

export default function UserAuthEntry({ variant = 'desktop' }: UserAuthEntryProps) {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { route, routes } = useRouting();

  const isLoading = status === 'loading';
  const isAuthenticated = !!session?.user;

  // 处理登出
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  // 移动端版本
  if (variant === 'mobile') {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <div className="w-full h-10 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="w-full h-10 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      );
    }

    if (isAuthenticated) {
      return (
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.user.name || session.user.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">{session.user.role}</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <Link
              href={route(routes.AUTH.PROFILE)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              个人资料
            </Link>
            <Link
              href={route('/profile/settings')}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              设置
            </Link>
            {session.user.role === 'CREATOR' && (
              <Link
                href={route('/creators/dashboard')}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                创作者中心
              </Link>
            )}
            {session.user.role === 'ADMIN' && (
              <Link
                href={route('/admin')}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                管理后台
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      );
    }

    // 未登录状态
    return (
      <div className="space-y-3">
        <Link
          href={route(routes.AUTH.LOGIN)}
          className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all duration-200"
        >
          登录
        </Link>
        <Link
          href={route(routes.AUTH.REGISTER)}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 shadow-sm"
        >
          注册
        </Link>
      </div>
    );
  }

  // 桌面端版本
  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="w-20 h-8 bg-gray-200 animate-pulse rounded-md"></div>
        <div className="w-20 h-8 bg-gray-200 animate-pulse rounded-md"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {session.user.name || session.user.email}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 下拉菜单 */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.user.name || session.user.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">{session.user.role}</p>
            </div>
            
            <Link
              href={route(routes.AUTH.PROFILE)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsDropdownOpen(false)}
            >
              个人资料
            </Link>
            <Link
              href={route('/profile/settings')}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsDropdownOpen(false)}
            >
              设置
            </Link>
            
            {session.user.role === 'CREATOR' && (
              <Link
                href={route('/creators/dashboard')}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsDropdownOpen(false)}
              >
                创作者中心
              </Link>
            )}
            
            {session.user.role === 'ADMIN' && (
              <Link
                href={route('/admin')}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsDropdownOpen(false)}
              >
                管理后台
              </Link>
            )}
            
            <div className="border-t border-gray-100 my-1"></div>
            
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              退出登录
            </button>
          </div>
        )}

        {/* 点击外部关闭下拉菜单 */}
        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    );
  }

  // 未登录状态
  return (
    <div className="flex items-center space-x-3">
      <Link
        href={route(routes.AUTH.LOGIN)}
        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      >
        登录
      </Link>
      <Link
        href={route(routes.AUTH.REGISTER)}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        注册
      </Link>
    </div>
  );
}