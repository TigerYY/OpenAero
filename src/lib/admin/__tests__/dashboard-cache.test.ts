/**
 * 仪表板缓存工具测试
 */
import { dashboardCache } from '../dashboard-cache';

describe('dashboard-cache', () => {
  beforeEach(() => {
    // 清除所有缓存
    dashboardCache.clearAll();
  });

  describe('统计数据缓存', () => {
    it('应该设置和获取统计数据', async () => {
      const testData = { success: true, data: { total: 100 } };
      dashboardCache.setStats(30, testData);

      const cached = await dashboardCache.getStats(30);
      expect(cached).toEqual(testData);
    });

    it('应该清除统计数据缓存', async () => {
      dashboardCache.setStats(30, { data: 'test' });
      dashboardCache.clearStats();

      const cached = await dashboardCache.getStats(30);
      expect(cached).toBeNull();
    });
  });

  describe('图表数据缓存', () => {
    it('应该设置和获取图表数据', async () => {
      const testData = { success: true, data: { trends: [] } };
      dashboardCache.setCharts(30, testData);

      const cached = await dashboardCache.getCharts(30);
      expect(cached).toEqual(testData);
    });

    it('应该根据时间范围区分缓存', async () => {
      dashboardCache.setCharts(30, { data: '30days' });
      dashboardCache.setCharts(60, { data: '60days' });

      expect(await dashboardCache.getCharts(30)).toEqual({ data: '30days' });
      expect(await dashboardCache.getCharts(60)).toEqual({ data: '60days' });
    });
  });

  describe('活动流缓存', () => {
    it('应该设置和获取活动流数据', async () => {
      const testData = { success: true, data: { activities: [] } };
      const params = { page: 1, limit: 20, type: 'all', days: 30 };
      
      dashboardCache.setActivities(params, testData);
      const cached = await dashboardCache.getActivities(params);
      
      expect(cached).toEqual(testData);
    });
  });

  describe('预警数据缓存', () => {
    it('应该设置和获取预警数据', async () => {
      const testData = { success: true, data: { alerts: [] } };
      dashboardCache.setAlerts(30, testData);

      const cached = await dashboardCache.getAlerts(30);
      expect(cached).toEqual(testData);
    });
  });

  describe('清除所有缓存', () => {
    it('应该清除所有类型的缓存', async () => {
      dashboardCache.setStats(30, { data: 'stats' });
      dashboardCache.setCharts(30, { data: 'charts' });
      dashboardCache.setActivities({ page: 1, limit: 20 }, { data: 'activities' });
      dashboardCache.setAlerts(30, { data: 'alerts' });

      dashboardCache.clearAll();

      expect(await dashboardCache.getStats(30)).toBeNull();
      expect(await dashboardCache.getCharts(30)).toBeNull();
      expect(await dashboardCache.getActivities({ page: 1, limit: 20 })).toBeNull();
      expect(await dashboardCache.getAlerts(30)).toBeNull();
    });
  });
});

