/**
 * 订单物流跟踪组件
 */

'use client';

import { useState, useEffect } from 'react';
import { Package, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface TrackingInfo {
  trackingNumber?: string;
  carrier?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'exception';
  events: TrackingEvent[];
  estimatedDelivery?: string;
  currentLocation?: string;
}

interface TrackingEvent {
  timestamp: string;
  location?: string;
  status: string;
  description: string;
  operator?: string;
}

interface OrderTrackingProps {
  orderId: string;
}

export default function OrderTracking({ orderId }: OrderTrackingProps) {
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/orders/${orderId}/tracking`);
        const data = await response.json();

        if (data.success) {
          setTrackingInfo(data.data);
        } else {
          setError(data.message || '获取物流信息失败');
        }
      } catch (err) {
        console.error('获取物流信息失败:', err);
        setError('网络错误，请检查网络连接');
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
  }, [orderId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            物流跟踪
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="sm" message="加载物流信息..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            物流跟踪
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorMessage error={error} />
        </CardContent>
      </Card>
    );
  }

  if (!trackingInfo) {
    return null;
  }

  const statusConfig = {
    pending: { label: '待发货', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    in_transit: { label: '运输中', color: 'bg-blue-100 text-blue-800', icon: Package },
    delivered: { label: '已送达', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    exception: { label: '异常', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  };

  const config = statusConfig[trackingInfo.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            物流跟踪
          </div>
          <Badge className={config.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trackingInfo.trackingNumber && (
            <div>
              <span className="text-sm font-medium text-gray-700">物流单号：</span>
              <span className="text-sm text-gray-900">{trackingInfo.trackingNumber}</span>
            </div>
          )}

          {trackingInfo.carrier && (
            <div>
              <span className="text-sm font-medium text-gray-700">承运商：</span>
              <span className="text-sm text-gray-900">{trackingInfo.carrier}</span>
            </div>
          )}

          {trackingInfo.currentLocation && (
            <div>
              <span className="text-sm font-medium text-gray-700">当前位置：</span>
              <span className="text-sm text-gray-900">{trackingInfo.currentLocation}</span>
            </div>
          )}

          {trackingInfo.estimatedDelivery && (
            <div>
              <span className="text-sm font-medium text-gray-700">预计送达：</span>
              <span className="text-sm text-gray-900">
                {new Date(trackingInfo.estimatedDelivery).toLocaleString('zh-CN')}
              </span>
            </div>
          )}

          {trackingInfo.events.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">物流轨迹</h4>
              <div className="space-y-4">
                {trackingInfo.events.map((event, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5" />
                      {index < trackingInfo.events.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-300 ml-0.5" />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="text-sm font-medium text-gray-900">{event.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(event.timestamp).toLocaleString('zh-CN')}
                      </div>
                      {event.location && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

