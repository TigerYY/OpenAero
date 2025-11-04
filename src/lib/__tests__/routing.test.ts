import { RoutingUtils, useRouting } from '../routing';

// Mock next-intl
jest.mock('next-intl', () => ({
  useLocale: () => 'zh-CN'
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/zh-CN/auth/login'
}));

describe('RoutingUtils', () => {
  describe('validateRoutePath', () => {
    it('应该验证有效的路由路径', () => {
      expect(RoutingUtils.validateRoutePath('/auth/login')).toEqual({
        isValid: true
      });
      
      expect(RoutingUtils.validateRoutePath('auth/login')).toEqual({
        isValid: true
      });
    });

    it('应该拒绝无效的路由路径', () => {
      expect(RoutingUtils.validateRoutePath('')).toEqual({
        isValid: false,
        error: '路由路径必须是非空字符串'
      });
      
      expect(RoutingUtils.validateRoutePath('//path')).toEqual({
        isValid: false,
        error: '路由路径不能包含连续的斜杠'
      });
      
      expect(RoutingUtils.validateRoutePath('http://example.com')).toEqual({
        isValid: false,
        error: '路由路径不能包含协议前缀'
      });
    });
  });

  describe('generateRoute', () => {
    it('应该生成带locale的完整路由', () => {
      expect(RoutingUtils.generateRoute('zh', '/auth/login')).toBe('/zh/auth/login');
      expect(RoutingUtils.generateRoute('en', 'auth/login')).toBe('/en/auth/login');
    });

    it('应该验证locale和路由参数', () => {
      expect(() => RoutingUtils.generateRoute('', '/auth/login')).toThrow('Locale必须是有效的字符串');
      expect(() => RoutingUtils.generateRoute('zh', '')).toThrow('路由路径格式错误');
    });
  });

  describe('extractLocaleFromPath', () => {
    it('应该从路径中提取有效的locale', () => {
      expect(RoutingUtils.extractLocaleFromPath('/zh/auth/login')).toBe('zh');
      expect(RoutingUtils.extractLocaleFromPath('/en/solutions')).toBe('en');
    });

    it('应该返回null对于无效的locale', () => {
      expect(RoutingUtils.extractLocaleFromPath('/invalid/auth/login')).toBeNull();
      expect(RoutingUtils.extractLocaleFromPath('/auth/login')).toBeNull();
    });
  });

  describe('getPathWithoutLocale', () => {
    it('应该移除路径中的locale前缀', () => {
      expect(RoutingUtils.getPathWithoutLocale('/zh/auth/login')).toBe('/auth/login');
      expect(RoutingUtils.getPathWithoutLocale('/en/solutions')).toBe('/solutions');
    });

    it('应该保持无locale的路径不变', () => {
      expect(RoutingUtils.getPathWithoutLocale('/auth/login')).toBe('/auth/login');
      expect(RoutingUtils.getPathWithoutLocale('/')).toBe('/');
    });
  });

  describe('isPublicRoute', () => {
    it('应该识别公开路由', () => {
      expect(RoutingUtils.isPublicRoute('/zh/auth/login')).toBe(true);
      expect(RoutingUtils.isPublicRoute('/en/auth/register')).toBe(true);
      expect(RoutingUtils.isPublicRoute('/zh/auth/verify-email')).toBe(true);
    });

    it('应该拒绝非公开路由', () => {
      expect(RoutingUtils.isPublicRoute('/zh/admin/dashboard')).toBe(false);
      expect(RoutingUtils.isPublicRoute('/en/profile')).toBe(false);
    });
  });

  describe('isApiRoute', () => {
    it('应该识别API路由', () => {
      expect(RoutingUtils.isApiRoute('/api/auth/login')).toBe(true);
      expect(RoutingUtils.isApiRoute('/api/users')).toBe(true);
    });

    it('应该拒绝非API路由', () => {
      expect(RoutingUtils.isApiRoute('/auth/login')).toBe(false);
      expect(RoutingUtils.isApiRoute('/api')).toBe(false);
    });
  });

  describe('matchRoute', () => {
    it('应该匹配静态路由', () => {
      expect(RoutingUtils.matchRoute('/zh/auth/login', '/auth/login')).toBe(true);
      expect(RoutingUtils.matchRoute('/en/solutions', '/solutions')).toBe(true);
    });

    it('应该匹配动态路由', () => {
      expect(RoutingUtils.matchRoute('/zh/solutions/123', '/solutions/[id]')).toBe(true);
      expect(RoutingUtils.matchRoute('/en/shop/products/drone-kit', '/shop/products/[slug]')).toBe(true);
    });

    it('应该拒绝不匹配的路由', () => {
      expect(RoutingUtils.matchRoute('/zh/auth/login', '/auth/register')).toBe(false);
      expect(RoutingUtils.matchRoute('/en/solutions/123', '/solutions')).toBe(false);
    });
  });

  describe('extractParams', () => {
    it('应该从动态路由中提取参数', () => {
      expect(RoutingUtils.extractParams('/zh/solutions/123', '/solutions/[id]')).toEqual({
        id: '123'
      });
      
      expect(RoutingUtils.extractParams('/en/shop/products/drone-kit', '/shop/products/[slug]')).toEqual({
        slug: 'drone-kit'
      });
    });

    it('应该返回空对象对于不匹配的路由', () => {
      expect(RoutingUtils.extractParams('/zh/auth/login', '/solutions/[id]')).toEqual({});
    });
  });

  describe('generateRouteWithParams', () => {
    it('应该生成带查询参数的路由', () => {
      expect(RoutingUtils.generateRouteWithParams('zh', '/solutions', { category: 'drones' }))
        .toBe('/zh/solutions?category=drones');
      
      expect(RoutingUtils.generateRouteWithParams('en', '/search', { q: 'drone', page: 1 }))
        .toBe('/en/search?q=drone&page=1');
    });

    it('应该生成无查询参数的路由', () => {
      expect(RoutingUtils.generateRouteWithParams('zh', '/auth/login')).toBe('/zh/auth/login');
      expect(RoutingUtils.generateRouteWithParams('en', '/solutions', {})).toBe('/en/solutions');
    });
  });
});

describe('useRouting', () => {
  it('应该提供正确的路由生成功能', () => {
    const { route, routeWithParams, routes, utils, currentLocale, currentPathname, isActive, isExactActive } = useRouting();
    
    expect(route('/auth/login')).toBe('/zh/auth/login');
    expect(routeWithParams('/solutions', { category: 'drones' })).toBe('/zh/solutions?category=drones');
    expect(routes.AUTH.LOGIN).toBe('/auth/login');
    expect(utils).toBe(RoutingUtils);
    expect(currentLocale).toBe('zh');
    expect(currentPathname).toBe('/zh/auth/login');
    expect(isActive('/auth/login')).toBe(true);
    expect(isExactActive('/auth/login')).toBe(true);
  });

  it('应该正确检查路由激活状态', () => {
    const { isActive, isExactActive } = useRouting();
    
    expect(isActive('/auth')).toBe(true); // 子路由匹配
    expect(isActive('/auth/login')).toBe(true); // 精确匹配
    expect(isActive('/solutions')).toBe(false); // 不匹配
    
    expect(isExactActive('/auth/login')).toBe(true); // 精确匹配
    expect(isExactActive('/auth')).toBe(false); // 不是精确匹配
  });
});