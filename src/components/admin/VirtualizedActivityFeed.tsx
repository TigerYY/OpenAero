/**
 * 虚拟滚动活动流组件
 * 优化大量活动数据的渲染性能
 */
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  UserPlus, 
  FileText, 
  CheckCircle, 
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type ActivityType = 'user_registration' | 'solution_submission' | 'review_completion' | 'order_creation';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface VirtualizedActivityFeedProps {
  activities: Activity[];
  itemHeight?: number; // 每个活动项的高度（像素）
  overscan?: number; // 额外渲染的项目数（用于平滑滚动）
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
  solution_submission: 'bg-green-100 text-green-800',
  review_completion: 'bg-purple-100 text-purple-800',
  order_creation: 'bg-orange-100 text-orange-800',
};

export function VirtualizedActivityFeed({
  activities,
  itemHeight = 80,
  overscan = 5,
  className = '',
}: VirtualizedActivityFeedProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // 监听容器高度变化
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(
      activities.length,
      startIndex + visibleCount + overscan * 2
    );

    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, overscan, activities.length]);

  // 获取可见的活动项
  const visibleActivities = useMemo(() => {
    return activities.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [activities, visibleRange]);

  // 处理滚动
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalHeight = activities.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>实时活动流</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-auto"
          style={{ height: '600px' }}
        >
          {/* 虚拟滚动容器 */}
          <div style={{ height: totalHeight, position: 'relative' }}>
            {/* 可见项目容器 */}
            <div
              style={{
                transform: `translateY(${offsetY}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
              }}
            >
              {visibleActivities.map((activity, index) => {
                const Icon = ACTIVITY_ICONS[activity.type];
                const colorClass = ACTIVITY_COLORS[activity.type];

                return (
                  <div
                    key={activity.id}
                    style={{ height: itemHeight }}
                    className="flex items-center gap-3 p-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {activity.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {activity.description}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatTime(activity.timestamp)}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.type.replace('_', ' ')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

