/**
 * 订单历史记录组件
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, RefreshCw, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface OrderHistoryEvent {
  id: string;
  orderId: string;
  eventType: 'CREATED' | 'STATUS_CHANGED' | 'PAYMENT_COMPLETED' | 'REFUNDED' | 'CANCELLED' | 'NOTE_ADDED';
  previousStatus?: string;
  newStatus?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
  createdBy?: string;
}

interface OrderHistoryProps {
  orderId: string;
}

export default function OrderHistory({ orderId }: OrderHistoryProps) {
  const [history, setHistory] = useState<OrderHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/orders/${orderId}/history`);
        const data = await response.json();

        if (data.success) {
          setHistory(data.data);
        } else {
          setError(data.message || '获取历史记录失败');
        }
      } catch (err) {
        console.error('获取历史记录失败:', err);
        setError('网络错误，请检查网络连接');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [orderId]);

  const getEventIcon = (eventType: OrderHistoryEvent['eventType']) => {
    switch (eventType) {
      case 'CREATED':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'STATUS_CHANGED':
        return <RefreshCw className="w-4 h-4 text-purple-600" />;
      case 'PAYMENT_COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'REFUNDED':
        return <RefreshCw className="w-4 h-4 text-orange-600" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'NOTE_ADDED':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            订单历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="sm" message="加载历史记录..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            订单历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorMessage error={error} />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            订单历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">暂无历史记录</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          订单历史
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((event, index) => (
            <div key={event.id} className="flex items-start">
              <div className="flex-shrink-0">
                {getEventIcon(event.eventType)}
                {index < history.length - 1 && (
                  <div className="w-0.5 h-8 bg-gray-300 ml-1.5 mt-1" />
                )}
              </div>
              <div className="ml-4 flex-1">
                <div className="text-sm font-medium text-gray-900">{event.description}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(event.createdAt).toLocaleString('zh-CN')}
                </div>
                {event.previousStatus && event.newStatus && (
                  <div className="text-xs text-gray-500 mt-1">
                    状态变更: {event.previousStatus} → {event.newStatus}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

