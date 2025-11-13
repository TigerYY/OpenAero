/**
 * 路由工具库单元测试
 */

import { RoutingUtils, ROUTES, SupportedLocale } from '../routing';

describe('RoutingUtils', () => {
  describe('validateRoutePath', () => {
    it('应该验证有效的路由路径', () => {
      expect(RoutingUtils.validateRoutePath('/login')).toEqual({ isValid: true });
      expect(RoutingUtils.validateRoutePath('/solutions')).toEqual({ isValid: true });
    });

    it('应该拒绝无效的路由路径', () => {
      expect(RoutingUtils.validateRoutePath('')).toEqual({ 
        isValid: false, 
        error: '路由路径必须是非空字符串' 
      });
      expect(RoutingUtils.validateRoutePath('//login')).toEqual({ 
        isValid: false, 
        error: '路由路径不能包含连续的斜杠' 
      });
      expect(RoutingUtils.validateRoutePath('http://example.com')).toEqual({ 
        isValid: false, 
        error: '路由路径不能包含协议前缀' 
      });
    });
  });

  describe('validateLocale', () => {
    it('应该验证支持的locale', () => {
      expect(RoutingUtils.validateLocale('zh-CN')).toBe(true);
      expect(RoutingUtils.validateLocale('en-US')).toBe(true);
    });

    it('应该拒绝不支持的locale', () => {
      expect(RoutingUtils.validateLocale('fr-FR')).toBe(false);
      expect(RoutingUtils.validateLocale('invalid')).toBe(false);
    });
  });

  describe('generateRoute', () => {
    it('应该生成带locale的路由', () => {
      expect(RoutingUtils.generateRoute('zh-CN', '/login')).toBe('/zh-CN/login');
      expect(RoutingUtils.generateRoute('en-US', '/solutions')).toBe('/en-US/solutions');
    });

    it('应该处理根路径', () => {
      expect(RoutingUtils.generateRoute('zh-CN', '/')).toBe('/zh-CN');
    });

    it('应该拒绝无效的locale', () => {
      expect(() => RoutingUtils.generateRoute('invalid', '/login')).toThrow();
    });

    it('应该拒绝无效的路由路径', () => {
      expect(() => RoutingUtils.generateRoute('zh-CN', '//login')).toThrow();
    });
  });

  describe('extractLocaleFromPath', () => {
    it('应该从路径中提取locale', () => {
      expect(RoutingUtils.extractLocaleFromPath('/zh-CN/login')).toBe('zh-CN');
      expect(RoutingUtils.extractLocaleFromPath('/en-US/solutions')).toBe('en-US');
    });

    it('应该返回null如果没有locale', () => {
      expect(RoutingUtils.extractLocaleFromPath('/login')).toBeNull();
      expect(RoutingUtils.extractLocaleFromPath('/')).toBeNull();
    });
  });

  describe('getPathWithoutLocale', () => {
    it('应该移除locale前缀', () => {
      expect(RoutingUtils.getPathWithoutLocale('/zh-CN/login')).toBe('/login');
      expect(RoutingUtils.getPathWithoutLocale('/en-US/solutions')).toBe('/solutions');
    });

    it('应该返回原路径如果没有locale', () => {
      expect(RoutingUtils.getPathWithoutLocale('/login')).toBe('/login');
    });
  });

  describe('generateRouteWithParams', () => {
    it('应该生成带查询参数的路由', () => {
      const route = RoutingUtils.generateRouteWithParams('zh-CN', '/solutions', { 
        page: 1, 
        category: 'fpv' 
      });
      expect(route).toContain('/zh-CN/solutions');
      expect(route).toContain('page=1');
      expect(route).toContain('category=fpv');
    });

    it('应该处理空参数', () => {
      const route = RoutingUtils.generateRouteWithParams('zh-CN', '/solutions');
      expect(route).toBe('/zh-CN/solutions');
    });
  });

  describe('generateRouteWithDynamicParams', () => {
    it('应该替换动态参数占位符', () => {
      const route = RoutingUtils.generateRouteWithDynamicParams(
        'zh-CN',
        '/solutions/[id]',
        { id: '123' }
      );
      expect(route).toBe('/zh-CN/solutions/123');
    });

    it('应该处理多个动态参数', () => {
      const route = RoutingUtils.generateRouteWithDynamicParams(
        'zh-CN',
        '/shop/products/[slug]',
        { slug: 'test-product' }
      );
      expect(route).toBe('/zh-CN/shop/products/test-product');
    });
  });

  describe('safeGenerateRoute', () => {
    it('应该成功生成路由', () => {
      const result = RoutingUtils.safeGenerateRoute('zh-CN', '/login');
      expect(result.success).toBe(true);
      expect(result.route).toBe('/zh-CN/login');
    });

    it('应该返回错误信息当路由无效', () => {
      const result = RoutingUtils.safeGenerateRoute('invalid', '/login');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('isPublicRoute', () => {
    it('应该识别公开路由', () => {
      expect(RoutingUtils.isPublicRoute('/zh-CN/login')).toBe(true);
      expect(RoutingUtils.isPublicRoute('/zh-CN/register')).toBe(true);
    });

    it('应该识别非公开路由', () => {
      expect(RoutingUtils.isPublicRoute('/zh-CN/profile')).toBe(false);
      expect(RoutingUtils.isPublicRoute('/zh-CN/admin')).toBe(false);
    });
  });

  describe('matchRoute', () => {
    it('应该匹配静态路由', () => {
      expect(RoutingUtils.matchRoute('/zh-CN/login', '/login')).toBe(true);
      expect(RoutingUtils.matchRoute('/zh-CN/solutions', '/solutions')).toBe(true);
    });

    it('应该匹配动态路由', () => {
      expect(RoutingUtils.matchRoute('/zh-CN/solutions/123', '/solutions/[id]')).toBe(true);
    });
  });

  describe('extractParams', () => {
    it('应该提取动态参数', () => {
      const params = RoutingUtils.extractParams('/zh-CN/solutions/123', '/solutions/[id]');
      expect(params).toEqual({ id: '123' });
    });

    it('应该返回空对象如果不匹配', () => {
      const params = RoutingUtils.extractParams('/zh-CN/login', '/solutions/[id]');
      expect(params).toEqual({});
    });
  });
});

describe('ROUTES常量', () => {
  it('应该包含所有路由定义', () => {
    expect(ROUTES.AUTH.LOGIN).toBe('/login');
    expect(ROUTES.BUSINESS.SOLUTIONS).toBe('/solutions');
    expect(ROUTES.CREATORS.DASHBOARD).toBe('/creators/dashboard');
    expect(ROUTES.ADMIN.DASHBOARD).toBe('/admin/dashboard');
  });
});
