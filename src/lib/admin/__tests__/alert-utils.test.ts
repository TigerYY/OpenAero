/**
 * 预警工具函数测试
 */
import { checkAlerts, AlertLevel, Alert } from '../alert-utils';

describe('alert-utils', () => {
  describe('checkAlerts', () => {
    it('应该检测待审核方案积压预警', () => {
      const metrics = {
        pendingSolutions: 25, // 超过阈值20
        userGrowthRate: 5,
        avgReviewTime: 2,
      };

      const alerts = checkAlerts(metrics);
      const criticalAlert = alerts.find(a => a.metric === 'pending_solutions');

      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.level).toBe('critical');
      expect(criticalAlert?.value).toBe(25);
    });

    it('应该检测用户增长下降预警', () => {
      const metrics = {
        pendingSolutions: 10,
        userGrowthRate: -5, // 负增长
        avgReviewTime: 2,
      };

      const alerts = checkAlerts(metrics);
      const warningAlert = alerts.find(a => a.metric === 'user_growth');

      expect(warningAlert).toBeDefined();
      expect(warningAlert?.level).toBe('warning');
    });

    it('应该检测审核时间过长预警', () => {
      const metrics = {
        pendingSolutions: 10,
        userGrowthRate: 5,
        avgReviewTime: 50, // 超过阈值48小时
      };

      const alerts = checkAlerts(metrics);
      const warningAlert = alerts.find(a => a.metric === 'avg_review_time');

      expect(warningAlert).toBeDefined();
      expect(warningAlert?.level).toBe('warning');
    });

    it('应该在没有异常时返回空数组', () => {
      const metrics = {
        pendingSolutions: 10,
        userGrowthRate: 5,
        avgReviewTime: 24,
      };

      const alerts = checkAlerts(metrics);
      expect(alerts).toHaveLength(0);
    });

    it('应该生成正确的预警ID', () => {
      const metrics = {
        pendingSolutions: 25,
        userGrowthRate: -5,
        avgReviewTime: 50,
      };

      const alerts = checkAlerts(metrics);
      alerts.forEach(alert => {
        expect(alert.id).toBeDefined();
        expect(typeof alert.id).toBe('string');
      });
    });

    it('应该包含时间戳', () => {
      const metrics = {
        pendingSolutions: 25,
        userGrowthRate: 5,
        avgReviewTime: 2,
      };

      const alerts = checkAlerts(metrics);
      alerts.forEach(alert => {
        expect(alert.timestamp).toBeInstanceOf(Date);
      });
    });
  });
});

