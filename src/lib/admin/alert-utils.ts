/**
 * 预警工具函数
 * 定义预警规则和检测逻辑
 */

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  dismissed?: boolean;
}

export interface AlertRule {
  id: string;
  metric: string;
  level: AlertLevel;
  condition: (value: number, threshold: number) => boolean;
  threshold: number;
  title: string;
  message: (value: number, threshold: number) => string;
}

/**
 * 预警规则定义
 */
export const ALERT_RULES: AlertRule[] = [
  {
    id: 'pending_solutions_warning',
    metric: 'pendingSolutions',
    level: 'warning',
    condition: (value, threshold) => value > threshold && value <= threshold * 2,
    threshold: 50,
    title: '待审核方案积压警告',
    message: (value, threshold) => `待审核方案数量为 ${value}，超过警告阈值 ${threshold}。请及时处理。`,
  },
  {
    id: 'pending_solutions_critical',
    metric: 'pendingSolutions',
    level: 'critical',
    condition: (value, threshold) => value > threshold * 2,
    threshold: 50,
    title: '待审核方案积压严重',
    message: (value, threshold) => `待审核方案数量为 ${value}，严重超过阈值 ${threshold}。需要立即处理！`,
  },
  {
    id: 'user_growth_decline',
    metric: 'userGrowth',
    level: 'warning',
    condition: (value, threshold) => value < threshold,
    threshold: -10,
    title: '用户增长下降',
    message: (value, threshold) => `用户增长率为 ${value.toFixed(1)}%，低于警告阈值 ${threshold}%。`,
  },
  {
    id: 'review_time_exceeded',
    metric: 'avgReviewTime',
    level: 'warning',
    condition: (value, threshold) => value > threshold,
    threshold: 48,
    title: '审核时间过长',
    message: (value, threshold) => `平均审核时间为 ${value.toFixed(1)} 小时，超过阈值 ${threshold} 小时。`,
  },
];

/**
 * 检测预警
 */
export function detectAlerts(stats: {
  pendingSolutions?: number;
  userGrowth?: number;
  avgReviewTime?: number;
}): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  // 检测待审核方案积压
  if (stats.pendingSolutions !== undefined) {
    const rule = ALERT_RULES.find(r => r.metric === 'pendingSolutions');
    if (rule) {
      if (rule.condition(stats.pendingSolutions, rule.threshold)) {
        alerts.push({
          id: `${rule.id}_${now.getTime()}`,
          level: rule.level,
          title: rule.title,
          message: rule.message(stats.pendingSolutions, rule.threshold),
          metric: rule.metric,
          value: stats.pendingSolutions,
          threshold: rule.threshold,
          timestamp: now,
        });
      }
    }
  }

  // 检测用户增长下降
  if (stats.userGrowth !== undefined) {
    const rule = ALERT_RULES.find(r => r.metric === 'userGrowth');
    if (rule && rule.condition(stats.userGrowth, rule.threshold)) {
      alerts.push({
        id: `${rule.id}_${now.getTime()}`,
        level: rule.level,
        title: rule.title,
        message: rule.message(stats.userGrowth, rule.threshold),
        metric: rule.metric,
        value: stats.userGrowth,
        threshold: rule.threshold,
        timestamp: now,
      });
    }
  }

  // 检测审核时间过长
  if (stats.avgReviewTime !== undefined) {
    const rule = ALERT_RULES.find(r => r.metric === 'avgReviewTime');
    if (rule && rule.condition(stats.avgReviewTime, rule.threshold)) {
      alerts.push({
        id: `${rule.id}_${now.getTime()}`,
        level: rule.level,
        title: rule.title,
        message: rule.message(stats.avgReviewTime, rule.threshold),
        metric: rule.metric,
        value: stats.avgReviewTime,
        threshold: rule.threshold,
        timestamp: now,
      });
    }
  }

  return alerts;
}

/**
 * 获取预警级别颜色
 */
export function getAlertLevelColor(level: AlertLevel): string {
  switch (level) {
    case 'critical':
      return 'red';
    case 'warning':
      return 'yellow';
    case 'info':
      return 'blue';
    default:
      return 'gray';
  }
}

/**
 * 获取预警级别图标
 */
export function getAlertLevelIcon(level: AlertLevel): string {
  switch (level) {
    case 'critical':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '📢';
  }
}

