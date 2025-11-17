'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  dismissed?: boolean;
}

interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

interface AlertPanelProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // 秒
}

const ALERT_ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const ALERT_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
};

export function AlertPanel({ 
  className = '',
  autoRefresh = true,
  refreshInterval = 60 
}: AlertPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAlerts();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/dashboard/alerts');
      const result = await response.json();

      if (result.success && result.data) {
        // 过滤已关闭的预警
        const activeAlerts = result.data.alerts.filter(
          (alert: Alert) => !dismissedIds.has(alert.id)
        );
        setAlerts(activeAlerts);
        setSummary(result.data.summary);
      } else {
        setError(result.error || '获取预警失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取预警失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (alertId: string) => {
    setDismissedIds((prev) => new Set([...prev, alertId]));
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  if (loading && alerts.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center text-red-600">
          <p>加载预警失败: {error}</p>
          <Button onClick={fetchAlerts} className="mt-2" size="sm">
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 按级别排序：critical > warning > info
  const sortedAlerts = [...alerts].sort((a, b) => {
    const levelOrder = { critical: 3, warning: 2, info: 1 };
    return levelOrder[b.level] - levelOrder[a.level];
  });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>系统预警</CardTitle>
          {summary && (
            <div className="flex items-center gap-2">
              {summary.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  严重: {summary.critical}
                </Badge>
              )}
              {summary.warning > 0 && (
                <Badge variant="warning" className="text-xs">
                  警告: {summary.warning}
                </Badge>
              )}
              {summary.info > 0 && (
                <Badge variant="info" className="text-xs">
                  信息: {summary.info}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedAlerts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>当前没有预警</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAlerts.map((alert) => {
              const Icon = ALERT_ICONS[alert.level];
              const colorClass = ALERT_COLORS[alert.level];

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-2 ${colorClass} transition-all`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-1">{alert.title}</h4>
                        <p className="text-sm opacity-90">{alert.message}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs opacity-75">
                          <span>当前值: {alert.value}</span>
                          <span>•</span>
                          <span>阈值: {alert.threshold}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDismiss(alert.id)}
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

