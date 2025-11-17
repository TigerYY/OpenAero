/**
 * 仪表板API缓存工具
 * 使用内存缓存优化API响应性能
 */

import { MemoryCache } from '@/lib/cache';

// 创建专用的缓存实例
const statsCache = new MemoryCache({
  ttl: 5 * 60 * 1000, // 5分钟
  maxSize: 10 * 1024 * 1024, // 10MB
  strategy: 'lru',
});

const chartsCache = new MemoryCache({
  ttl: 10 * 60 * 1000, // 10分钟
  maxSize: 20 * 1024 * 1024, // 20MB
  strategy: 'lru',
});

const activitiesCache = new MemoryCache({
  ttl: 30 * 1000, // 30秒（活动流需要更频繁更新）
  maxSize: 5 * 1024 * 1024, // 5MB
  strategy: 'lru',
});

const alertsCache = new MemoryCache({
  ttl: 60 * 1000, // 1分钟
  maxSize: 2 * 1024 * 1024, // 2MB
  strategy: 'lru',
});

/**
 * 生成缓存键
 */
function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  return `${prefix}:${sortedParams}`;
}

/**
 * 统计数据缓存
 */
export const dashboardCache = {
  // 获取统计数据
  async getStats(timeRange: number): Promise<any | null> {
    const key = generateCacheKey('dashboard:stats', { timeRange });
    return statsCache.get(key);
  },

  // 设置统计数据
  setStats(timeRange: number, data: any): void {
    const key = generateCacheKey('dashboard:stats', { timeRange });
    statsCache.set(key, data, { ttl: 5 * 60 * 1000 });
  },

  // 清除统计数据缓存
  clearStats(): void {
    // 使用clear方法清除所有缓存（简单实现）
    // 如果需要更细粒度的控制，可以扩展MemoryCache类
    statsCache.clear();
  },

  // 获取图表数据
  async getCharts(timeRange: number): Promise<any | null> {
    const key = generateCacheKey('dashboard:charts', { timeRange });
    return chartsCache.get(key);
  },

  // 设置图表数据
  setCharts(timeRange: number, data: any): void {
    const key = generateCacheKey('dashboard:charts', { timeRange });
    chartsCache.set(key, data, { ttl: 10 * 60 * 1000 });
  },

  // 清除图表数据缓存
  clearCharts(): void {
    chartsCache.clear();
  },

  // 获取活动流数据
  async getActivities(params: { page?: number; limit?: number; type?: string; days?: number }): Promise<any | null> {
    const key = generateCacheKey('dashboard:activities', params);
    return activitiesCache.get(key);
  },

  // 设置活动流数据
  setActivities(params: { page?: number; limit?: number; type?: string; days?: number }, data: any): void {
    const key = generateCacheKey('dashboard:activities', params);
    activitiesCache.set(key, data, { ttl: 30 * 1000 });
  },

  // 清除活动流数据缓存
  clearActivities(): void {
    activitiesCache.clear();
  },

  // 获取预警数据
  async getAlerts(timeRange?: number): Promise<any | null> {
    const key = generateCacheKey('dashboard:alerts', { timeRange: timeRange || 30 });
    return alertsCache.get(key);
  },

  // 设置预警数据
  setAlerts(timeRange: number | undefined, data: any): void {
    const key = generateCacheKey('dashboard:alerts', { timeRange: timeRange || 30 });
    alertsCache.set(key, data, { ttl: 60 * 1000 });
  },

  // 清除预警数据缓存
  clearAlerts(): void {
    alertsCache.clear();
  },

  // 清除所有仪表板缓存
  clearAll(): void {
    this.clearStats();
    this.clearCharts();
    this.clearActivities();
    this.clearAlerts();
  },

  // 获取缓存统计信息
  getStatsInfo() {
    return {
      stats: statsCache.getStats(),
      charts: chartsCache.getStats(),
      activities: activitiesCache.getStats(),
      alerts: alertsCache.getStats(),
    };
  },
};

