'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Home,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouting } from '@/lib/routing';
import { Button } from '@/components/ui/Button';

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  icon: any;
  label: string;
  badge?: number;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { route, routes } = useRouting();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      href: route(routes.ADMIN.DASHBOARD),
      icon: LayoutDashboard,
      label: '仪表盘'
    },
    {
      href: route(routes.ADMIN.USERS),
      icon: Users,
      label: '用户管理'
    },
    {
      href: route(routes.ADMIN.PERMISSIONS),
      icon: UserCheck,
      label: '权限管理'
    },
    {
      href: route(routes.ADMIN.APPLICATIONS),
      icon: UserCheck,
      label: '创作者申请'
    },
    {
      href: route(routes.ADMIN.REVIEW_WORKBENCH),
      icon: CheckCircle,
      label: '审核工作台'
    },
    {
      href: route(routes.ADMIN.ANALYTICS),
      icon: BarChart3,
      label: '数据分析'
    },
    {
      href: route(routes.ADMIN.SETTINGS),
      icon: Settings,
      label: '系统设置'
    }
  ];

  const isActive = (href: string) => {
    // 精确匹配或路径前缀匹配
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="flex flex-1 relative">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-900">管理中心</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {/* 返回首页 */}
            <Link
              href={route(routes.BUSINESS.HOME)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                sidebarCollapsed ? 'justify-center' : ''
              } text-gray-600 hover:bg-gray-100 hover:text-gray-900`}
              title="返回首页"
            >
              <Home className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm font-medium">返回首页</span>}
            </Link>

            {/* 分隔线 */}
            <div className="my-2 border-t border-gray-200" />

            {/* 导航菜单 */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    sidebarCollapsed ? 'justify-center' : ''
                  } ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={item.label}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                  )}
                  {!sidebarCollapsed && item.badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-red-600 hover:bg-red-50 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="退出登录"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm font-medium">退出登录</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">管理中心</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {/* 返回首页 */}
            <Link
              href={route(routes.BUSINESS.HOME)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="h-5 w-5" />
              <span className="text-sm font-medium">返回首页</span>
            </Link>

            <div className="my-2 border-t border-gray-200" />

            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">退出登录</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden fixed bottom-4 right-4 p-4 bg-blue-600 text-white rounded-full shadow-lg z-30 hover:bg-blue-700 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Page Content */}
          <div className="min-h-screen">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
