/**
 * 统一路由工具库
 * 解决国际化路由与硬编码路由的架构冲突
 */

// 临时配置，避免导入问题
const APP_CONFIG = {
  supportedLocales: ['zh-CN', 'en-US']
} as const;

// 路由定义
const ROUTES = {
  // 认证路由
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_EMAIL: '/auth/verify-email',
    VERIFY_EMAIL_NOTICE: '/auth/verify-email-notice',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    PROFILE: '/auth/profile',
    SESSIONS: '/auth/profile/sessions',
    LOGOUT: '/auth/logout',
  },
  
  // 业务路由
  BUSINESS: {
    HOME: '/',
    SOLUTIONS: '/solutions',
    SOLUTION_DETAIL: '/solutions/[id]',
    SHOP: '/shop/products',
    PRODUCT_DETAIL: '/shop/products/[slug]',
    CREATORS_APPLY: '/creators/apply',
    CONTACT: '/contact',
    ABOUT: '/about',
    CASES: '/cases',
    CASE_DETAIL: '/cases/[id]',
  },
  
  // 创作者路由
  CREATORS: {
    HOME: '/creators',
    DASHBOARD: '/creators/dashboard',
    PRODUCTS: '/creators/products',
    ORDERS: '/creators/orders',
    ANALYTICS: '/creators/analytics',
    STATUS: '/creators/status',
    GUIDE: '/creators/guide',
    REVENUE: '/creators/revenue',
  },
  
  // 订单路由
  ORDERS: {
    HOME: '/orders',
    DETAIL: '/orders/[id]',
  },
  
  // 供应链路由
  SUPPLY_CHAIN: {
    FACTORIES: '/supply-chain/factories',
    SAMPLE_ORDERS: '/supply-chain/sample-orders',
  },
  
  // 管理路由
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    SOLUTIONS: '/admin/solutions',
    ORDERS: '/admin/orders',
    CREATORS: '/admin/creators',
    SETTINGS: '/admin/settings',
  }
} as const;

// 路由工具函数
export class RoutingUtils {
  /**
   * 验证路由路径格式
   */
  static validateRoutePath(route: string): { isValid: boolean; error?: string } {
    if (!route || typeof route !== 'string') {
      return { isValid: false, error: '路由路径必须是非空字符串' };
    }
    
    if (route.includes('//')) {
      return { isValid: false, error: '路由路径不能包含连续的斜杠' };
    }
    
    if (route.startsWith('http://') || route.startsWith('https://')) {
      return { isValid: false, error: '路由路径不能包含协议前缀' };
    }
    
    return { isValid: true };
  }

  /**
   * 生成带locale的完整路由
   */
  static generateRoute(locale: string, route: string): string {
    // 验证路由路径格式
    const validation = this.validateRoutePath(route);
    if (!validation.isValid) {
      throw new Error(`路由路径格式错误: ${validation.error}`);
    }
    
    // 验证locale格式
    if (!locale || typeof locale !== 'string') {
      throw new Error('Locale必须是有效的字符串');
    }
    
    // 移除开头的斜杠（如果有）
    const cleanRoute = route.startsWith('/') ? route.slice(1) : route;
    return `/${locale}/${cleanRoute}`;
  }

  /**
   * 生成API路由
   */
  static generateApiRoute(apiPath: string): string {
    return `/api${apiPath}`;
  }

  /**
   * 从路径中提取locale
   */
  static extractLocaleFromPath(pathname: string): string | null {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    
    const firstSegment = segments[0];
    return APP_CONFIG.supportedLocales.includes(firstSegment as any) ? firstSegment : null;
  }

  /**
   * 获取无locale的路径
   */
  static getPathWithoutLocale(pathname: string): string {
    const locale = this.extractLocaleFromPath(pathname);
    if (!locale) return pathname;
    
    return pathname.replace(`/${locale}`, '') || '/';
  }

  /**
   * 检查是否为公开路由
   */
  static isPublicRoute(pathname: string): boolean {
    const pathWithoutLocale = this.getPathWithoutLocale(pathname);
    
    const publicRoutes = [
      ROUTES.AUTH.LOGIN,
      ROUTES.AUTH.REGISTER,
      ROUTES.AUTH.VERIFY_EMAIL,
      ROUTES.AUTH.VERIFY_EMAIL_NOTICE,
      ROUTES.AUTH.FORGOT_PASSWORD,
      ROUTES.AUTH.RESET_PASSWORD,
    ];

    return publicRoutes.some(route => pathWithoutLocale.startsWith(route));
  }

  /**
   * 检查是否为API路由
   */
  static isApiRoute(pathname: string): boolean {
    return pathname.startsWith('/api/');
  }

  /**
   * 检查路由是否匹配给定的模式
   */
  static matchRoute(pathname: string, pattern: string): boolean {
    const pathWithoutLocale = this.getPathWithoutLocale(pathname);
    
    // 处理动态路由参数
    const patternRegex = pattern
      .replace(/\[([^\]]+)\]/g, '([^/]+)') // 将 [param] 转换为捕获组
      .replace(/\/\*/g, '/.*'); // 将 /* 转换为通配符
    
    const regex = new RegExp(`^${patternRegex}$`);
    return regex.test(pathWithoutLocale);
  }

  /**
   * 从路径中提取动态参数
   */
  static extractParams(pathname: string, pattern: string): Record<string, string> {
    const pathWithoutLocale = this.getPathWithoutLocale(pathname);
    
    // 提取参数名
    const paramNames: string[] = [];
    const paramPattern = pattern.replace(/\[([^\]]+)\]/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });
    
    const regex = new RegExp(`^${paramPattern}$`);
    const match = pathWithoutLocale.match(regex);
    
    if (!match) return {};
    
    const params: Record<string, string> = {};
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });
    
    return params;
  }

  /**
   * 生成带查询参数的路由
   */
  static generateRouteWithParams(
    locale: string, 
    route: string, 
    params?: Record<string, string | number>
  ): string {
    const baseRoute = this.generateRoute(locale, route);
    
    if (!params || Object.keys(params).length === 0) {
      return baseRoute;
    }
    
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    
    const queryString = searchParams.toString();
    return queryString ? `${baseRoute}?${queryString}` : baseRoute;
  }
}

// React Hook - 用于组件中的路由生成
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';

export function useRouting() {
  const locale = useLocale();
  const pathname = usePathname();

  return {
    // 生成带locale的路由
    route: (route: string) => RoutingUtils.generateRoute(locale, route),
    
    // 生成带查询参数的路由
    routeWithParams: (route: string, params?: Record<string, string | number>) => 
      RoutingUtils.generateRouteWithParams(locale, route, params),
    
    // 直接访问路由常量
    routes: ROUTES,
    
    // 工具函数
    utils: RoutingUtils,
    
    // 当前locale
    currentLocale: locale,
    
    // 当前路径信息
    currentPathname: pathname,
    
    // 检查当前路径是否匹配给定路由
    isActive: (route: string) => {
      const pathWithoutLocale = RoutingUtils.getPathWithoutLocale(pathname);
      return pathWithoutLocale === route || pathWithoutLocale.startsWith(route + '/');
    },
    
    // 检查当前路径是否精确匹配
    isExactActive: (route: string) => {
      const pathWithoutLocale = RoutingUtils.getPathWithoutLocale(pathname);
      return pathWithoutLocale === route;
    },
  };
}

// 默认导出路由常量
export default ROUTES;