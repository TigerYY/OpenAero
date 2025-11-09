'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useRouting } from '@/lib/routing';

interface NavigationItem {
  name: string;
  href: string;
  icon?: string;
  roles?: string[]; // 允许访问的角色，如果为空则表示所有角色都可以访问
  children?: NavigationItem[];
}

// 导航项定义 - 使用路由常量而不是硬编码路径
const createNavigationItems = (routes: any) => [
  // 公开菜单项（所有用户都可以访问）
  {
    name: '首页',
    href: routes.BUSINESS.HOME,
    icon: '🏠'
  },
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
    name: '关于我们',
    href: routes.BUSINESS.ABOUT,
    icon: '👥'
  },
  
  // 创作者菜单项（仅创作者可以访问）
  {
    name: '创作者中心',
    href: routes.CREATORS.HOME,
    icon: '🎨',
    roles: ['CREATOR'],
    children: [
      {
        name: '仪表板',
        href: routes.CREATORS.DASHBOARD,
        icon: '📊'
      },
      {
        name: '产品管理',
        href: routes.CREATORS.PRODUCTS,
        icon: '📦'
      },
      {
        name: '订单管理',
        href: routes.CREATORS.ORDERS,
        icon: '📋'
      },
      {
        name: '数据分析',
        href: routes.CREATORS.ANALYTICS,
        icon: '📈'
      }
    ]
  },
  
  // 创作者申请菜单项（仅普通用户可以访问）
  {
    name: '成为创作者',
    href: routes.BUSINESS.CREATORS_APPLY,
    icon: '🚀',
    roles: ['USER'] // 仅普通用户可以看到申请链接
  },
  
  // 管理员菜单项（仅管理员可以访问）
  {
    name: '管理后台',
    href: routes.ADMIN.DASHBOARD,
    icon: '⚙️',
    roles: ['ADMIN'],
    children: [
      {
        name: '用户管理',
        href: routes.ADMIN.USERS,
        icon: '👥'
      },
      {
        name: '创作者审核',
        href: routes.ADMIN.CREATORS,
        icon: '✅'
      },
      {
        name: '产品审核',
        href: routes.ADMIN.SOLUTIONS,
        icon: '📦'
      },
      {
        name: '系统设置',
        href: routes.ADMIN.SETTINGS,
        icon: '⚙️'
      }
    ]
  }
];

// 用户菜单项（根据登录状态显示不同内容）
const createUserMenuItems = (routes: any) => [
  {
    name: '个人资料',
    href: routes.AUTH.PROFILE,
    icon: '👤'
  },
  {
    name: '我的订单',
    href: routes.ORDERS.HOME,
    icon: '📋'
  },
  {
    name: '退出登录',
    href: routes.AUTH.LOGOUT,
    icon: '🚪'
  }
];

export function RoleBasedNavigation() {
  const { user, session, isAuthenticated, isLoading } = useAuth();
  const { route, routes, isActive: isRouteActive, isExactActive } = useRouting();
  
  // 使用路由常量创建导航项
  const navigationItems = createNavigationItems(routes);
  const userMenuItems = createUserMenuItems(routes);

  // 检查用户是否有权限访问某个菜单项
  const hasPermission = (item: NavigationItem): boolean => {
    // 如果没有设置角色限制，则所有用户都可以访问
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    
    // 如果用户未登录，则不能访问需要特定角色的菜单项
    if (!user) {
      return false;
    }
    
    // 检查用户角色是否在允许的角色列表中
    return item.roles.includes(user.role);
  };

  // 过滤导航项，只显示用户有权限访问的
  const filteredNavigation = navigationItems.filter(hasPermission);

  if (isLoading) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 左侧导航 */}
          <div className="flex space-x-8">
            {filteredNavigation.map((item) => (
              <div key={item.href} className="relative group">
                <Link
                  href={route(item.href)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isRouteActive(item.href)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.name}
                </Link>
                
                {/* 子菜单 */}
                {item.children && item.children.length > 0 && (
                  <div className="absolute left-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={route(child.href)}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            isRouteActive(child.href)
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                          }`}
                        >
                          {child.icon && <span className="mr-2">{child.icon}</span>}
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 右侧用户菜单 */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
                  <span className="mr-2">👤</span>
                  {user?.name || user?.email}
                  <span className="ml-1 text-xs text-gray-500">({user?.role})</span>
                </button>
                
                {/* 用户下拉菜单 */}
                <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={route(item.href)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isRouteActive(item.href)
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                        }`}
                      >
                        {item.icon && <span className="mr-2">{item.icon}</span>}
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link
                  href={route(routes.AUTH.LOGIN)}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  登录
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href={route(routes.AUTH.REGISTER)}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// 移动端导航组件
export function MobileRoleBasedNavigation() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  // 过滤导航项，只显示用户有权限访问的
  const filteredNavigation = navigationItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  if (isLoading) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
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
                {filteredNavigation.map((item) => (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.icon && <span className="mr-2">{item.icon}</span>}
                      {item.name}
                    </Link>
                    
                    {/* 子菜单 */}
                    {item.children && item.children.length > 0 && (
                      <div className="pl-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                            onClick={() => setIsOpen(false)}
                          >
                            {child.icon && <span className="mr-2">{child.icon}</span>}
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* 用户菜单 */}
                <div className="border-t border-gray-200 pt-4">
                  {isAuthenticated ? (
                    <>
                      <div className="px-3 py-2 text-sm font-medium text-gray-500">
                        欢迎，{user?.name || user?.email}
                      </div>
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                          onClick={() => setIsOpen(false)}
                        >
                          {item.icon && <span className="mr-2">{item.icon}</span>}
                          {item.name}
                        </Link>
                      ))}
                    </>
                  ) : (
                    <div className="flex space-x-4 px-3 py-2">
                      <Link
                        href={route(routes.AUTH.LOGIN)}
                        className="text-base font-medium text-gray-700 hover:text-blue-600"
                        onClick={() => setIsOpen(false)}
                      >
                        登录
                      </Link>
                      <Link
                        href={route(routes.AUTH.REGISTER)}
                        className="text-base font-medium text-gray-700 hover:text-blue-600"
                        onClick={() => setIsOpen(false)}
                      >
                        注册
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}