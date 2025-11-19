'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  UserPlus, 
  FileText, 
  CheckCircle, 
  ShoppingCart,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

// 活动类型
type ActivityType = 'user_registration' | 'solution_submission' | 'review_completion' | 'order_creation';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    userId?: string;
    solutionId?: string;
    orderId?: string;
    decision?: string;
    category?: string;
    [key: string]: any;
  };
}

interface ActivityFeedProps {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // 秒
  className?: string;
}

const ACTIVITY_ICONS = {
  user_registration: UserPlus,
  solution_submission: FileText,
  review_completion: CheckCircle,
  order_creation: ShoppingCart,
};

const ACTIVITY_COLORS = {
  user_registration: 'bg-blue-100 text-blue-800',
  solution_submission: 'bg-purple-100 text-purple-800',
  review_completion: 'bg-green-100 text-green-800',
  order_creation: 'bg-orange-100 text-orange-800',
};

export function ActivityFeed({ 
  limit = 20, 
  autoRefresh = true,
  refreshInterval = 30,
  className = '' 
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');
  const [page, setPage] = useState(1);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        days: '30',
      });
      
      if (filterType !== 'all') {
        params.append('type', filterType);
      }

      const response = await fetch(`/api/admin/dashboard/activities?${params}`, {
        credentials: 'include', // 确保发送 cookies
      });
      const result = await response.json();

      if (result.success && result.data) {
        setActivities(result.data.activities || []);
      } else {
        setError(result.error || '获取活动流失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取活动流失败');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchActivities();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchActivities]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center text-red-600">
          <p>加载活动流失败: {error}</p>
          <Button onClick={fetchActivities} className="mt-2" size="sm">
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>实时活动流</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as ActivityType | 'all');
                setPage(1);
              }}
            >
              <option value="all">全部</option>
              <option value="user_registration">用户注册</option>
              <option value="solution_submission">方案提交</option>
              <option value="review_completion">审核完成</option>
              <option value="order_creation">订单创建</option>
            </Select>
            <Button
              onClick={fetchActivities}
              variant="ghost"
              size="icon"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && activities.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>暂无活动记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = ACTIVITY_ICONS[activity.type];
              const colorClass = ACTIVITY_COLORS[activity.type];

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {activity.title}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{activity.description}</p>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activity.metadata.decision && (
                          <Badge
                            variant={
                              activity.metadata.decision === 'APPROVED'
                                ? 'success'
                                : activity.metadata.decision === 'REJECTED'
                                ? 'destructive'
                                : 'warning'
                            }
                            className="text-xs"
                          >
                            {activity.metadata.decision === 'APPROVED'
                              ? '已批准'
                              : activity.metadata.decision === 'REJECTED'
                              ? '已拒绝'
                              : '待修改'}
                          </Badge>
                        )}
                        {activity.metadata.category && (
                          <Badge variant="outline" className="text-xs">
                            {activity.metadata.category}
                          </Badge>
                        )}
                      </div>
                    )}
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

