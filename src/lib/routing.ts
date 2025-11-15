/**
 * 统一路由工具库
 * 解决国际化路由与硬编码路由的架构冲突
 */

// 支持的locale类型
export type SupportedLocale = 'zh-CN' | 'en-US';

// 应用配置
const APP_CONFIG = {
  supportedLocales: ['zh-CN', 'en-US'] as const satisfies readonly SupportedLocale[],
  defaultLocale: 'zh-CN' as SupportedLocale,
} as const;

// 路由验证结果类型
export interface RouteValidationResult {
  isValid: boolean;
  error?: string;
}

// 路由参数类型
export type RouteParams = Record<string, string | number>;

// 路由定义类型
export type RouteDefinition = {
  readonly [key: string]: string | RouteDefinition;
};

// 路由定义
const ROUTES = {
  // 认证路由（注意：实际文件在 [locale]/(auth) 目录下，路由组不影响URL）
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    VERIFY_EMAIL: '/verify-email',
    VERIFY_EMAIL_NOTICE: '/verify-email-notice',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    PROFILE: '/profile',
    SESSIONS: '/profile/sessions',
    LOGOUT: '/logout',
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
    APPLY: '/creators/apply',
    APPLY_STATUS: '/creators/apply/status',
    APPLY_SUCCESS: '/creators/apply/success',
    PRODUCTS: '/creators/products',
    ORDERS: '/creators/orders',
    ANALYTICS: '/creators/analytics',
    STATUS: '/creators/status',
    GUIDE: '/creators/guide',
    REVENUE: '/creators/revenue',
    SOLUTIONS: '/creators/solutions',
    SOLUTION_NEW: '/creators/solutions/new',
    SOLUTION_EDIT: '/creators/solutions/[id]/edit',
  },
  
  // 订单路由
  ORDERS: {
    HOME: '/orders',
    DETAIL: '/orders/[id]',
  },
  
  // 支付路由
  PAYMENT: {
    SUCCESS: '/payment/success',
    FAILURE: '/payment/failure',
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
    APPLICATIONS: '/admin/applications',
    SETTINGS: '/admin/settings',
    ANALYTICS: '/admin/analytics',
    AUDIT_LOGS: '/admin/audit-logs',
    MONITORING: '/admin/monitoring',
    PERMISSIONS: '/admin/permissions',
    PRODUCTS: '/admin/products',
    REVIEW_STATS: '/admin/review-stats',
    REVIEW_WORKBENCH: '/admin/review-workbench',
  }
} as const satisfies RouteDefinition;

// 路由工具函数
export class RoutingUtils {
  /**
   * 验证路由路径格式
   */
  static validateRoutePath(route: string): RouteValidationResult {
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
   * 验证locale格式
   */
  static validateLocale(locale: string): locale is SupportedLocale {
    return APP_CONFIG.supportedLocales.includes(locale as SupportedLocale);
  }

  /**
   * 生成带locale的完整路由
   */
  static generateRoute(locale: string, route: string): string {
    // 验证路由路径格式
    const routeValidation = this.validateRoutePath(route);
    if (!routeValidation.isValid) {
      throw new Error(`路由路径格式错误: ${routeValidation.error}`);
    }
    
    // 验证locale格式
    if (!locale || typeof locale !== 'string') {
      throw new Error('Locale必须是有效的字符串');
    }
    
    if (!this.validateLocale(locale)) {
      throw new Error(`不支持的locale: ${locale}。支持的locale: ${APP_CONFIG.supportedLocales.join(', ')}`);
    }
    
    // 处理根路径
    if (route === '/') {
      return `/${locale}`;
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
  static extractLocaleFromPath(pathname: string): SupportedLocale | null {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    
    const firstSegment = segments[0];
    return this.validateLocale(firstSegment) ? firstSegment : null;
  }

  /**
   * 获取默认locale
   */
  static getDefaultLocale(): SupportedLocale {
    return APP_CONFIG.defaultLocale;
  }

  /**
   * 获取所有支持的locale
   */
  static getSupportedLocales(): readonly SupportedLocale[] {
    return APP_CONFIG.supportedLocales;
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
    params?: RouteParams
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

  /**
   * 生成带动态参数的路由（替换 [param] 占位符）
   */
  static generateRouteWithDynamicParams(
    locale: string,
    route: string,
    params: Record<string, string | number>
  ): string {
    let processedRoute = route;
    
    // 替换动态参数占位符 [param]
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `[${key}]`;
      if (processedRoute.includes(placeholder)) {
        processedRoute = processedRoute.replace(placeholder, String(value));
      }
    });
    
    return this.generateRoute(locale, processedRoute);
  }

  /**
   * 安全地生成路由（不抛出异常，返回错误信息）
   */
  static safeGenerateRoute(locale: string, route: string): { success: boolean; route?: string; error?: string } {
    try {
      const generatedRoute = this.generateRoute(locale, route);
      return { success: true, route: generatedRoute };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }
}

// React Hook - 用于组件中的路由生成
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';

/**
 * useRouting Hook 返回类型
 */
export interface UseRoutingReturn {
  /** 生成带locale的路由 */
  route: (route: string) => string;
  /** 生成带查询参数的路由 */
  routeWithParams: (route: string, params?: RouteParams) => string;
  /** 生成带动态参数的路由（替换 [param] 占位符） */
  routeWithDynamicParams: (route: string, params: Record<string, string | number>) => string;
  /** 直接访问路由常量 */
  routes: typeof ROUTES;
  /** 工具函数类 */
  utils: typeof RoutingUtils;
  /** 当前locale */
  currentLocale: SupportedLocale;
  /** 当前路径信息 */
  currentPathname: string;
  /** 检查当前路径是否匹配给定路由 */
  isActive: (route: string) => boolean;
  /** 检查当前路径是否精确匹配 */
  isExactActive: (route: string) => boolean;
  /** 安全地生成路由（不抛出异常） */
  safeRoute: (route: string) => { success: boolean; route?: string; error?: string };
}

/**
 * 路由生成Hook
 * 用于组件中生成带locale的路由
 * 
 * @example
 * ```tsx
 * const { route, routes } = useRouting();
 * <Link href={route(routes.BUSINESS.SOLUTIONS)}>解决方案</Link>
 * ```
 */
export function useRouting(): UseRoutingReturn {
  const localeFromHook = useLocale();
  const pathname = usePathname();
  
  // 确保 locale 有效，如果无效则使用默认 locale
  const locale: SupportedLocale = (localeFromHook && RoutingUtils.validateLocale(localeFromHook))
    ? (localeFromHook as SupportedLocale)
    : APP_CONFIG.defaultLocale;

  return {
    // 生成带locale的路由
    route: (route: string) => RoutingUtils.generateRoute(locale, route),
    
    // 生成带查询参数的路由
    routeWithParams: (route: string, params?: RouteParams) => 
      RoutingUtils.generateRouteWithParams(locale, route, params),
    
    // 生成带动态参数的路由（替换 [param] 占位符）
    routeWithDynamicParams: (route: string, params: Record<string, string | number>) =>
      RoutingUtils.generateRouteWithDynamicParams(locale, route, params),
    
    // 直接访问路由常量
    routes: ROUTES,
    
    // 工具函数类
    utils: RoutingUtils,
    
    // 当前locale
    currentLocale: locale,
    
    // 当前路径信息
    currentPathname: pathname,
    
    // 检查当前路径是否匹配给定路由
    isActive: (route: string): boolean => {
      const pathWithoutLocale = RoutingUtils.getPathWithoutLocale(pathname);
      return pathWithoutLocale === route || pathWithoutLocale.startsWith(route + '/');
    },
    
    // 检查当前路径是否精确匹配
    isExactActive: (route: string): boolean => {
      const pathWithoutLocale = RoutingUtils.getPathWithoutLocale(pathname);
      return pathWithoutLocale === route;
    },

    // 安全地生成路由（不抛出异常）
    safeRoute: (route: string) => RoutingUtils.safeGenerateRoute(locale, route),
  };
}

// 导出路由常量类型
export type Routes = typeof ROUTES;

// 导出路由常量（命名导出）
export { ROUTES };

// 默认导出路由常量
export default ROUTES;