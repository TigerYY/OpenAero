/**
 * 订单退款组件
 */

'use client';

import { useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';

interface RefundInfo {
  refundId: string;
  orderId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  reason: string;
  createdAt: string;
}

interface OrderRefundProps {
  orderId: string;
  orderStatus: string;
  canRefund: boolean;
}

export default function OrderRefund({ orderId, orderStatus, canRefund }: OrderRefundProps) {
  const [refundInfo, setRefundInfo] = useState<RefundInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  // 获取退款信息
  const fetchRefundInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/orders/${orderId}/refund`);
      const data = await response.json();

      if (data.success && data.data) {
        setRefundInfo(data.data);
      }
    } catch (err) {
      console.error('获取退款信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 申请退款
  const handleRefundRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orders/${orderId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: refundReason,
          amount: refundAmount ? parseFloat(refundAmount) : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRefundInfo(data.data);
        setShowForm(false);
        setRefundReason('');
        setRefundAmount('');
      } else {
        setError(data.message || '申请退款失败');
      }
    } catch (err) {
      console.error('申请退款失败:', err);
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 如果订单状态允许退款，自动获取退款信息
  if (canRefund && !refundInfo && !loading) {
    fetchRefundInfo();
  }

  const statusConfig = {
    PENDING: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
    APPROVED: { label: '已批准', color: 'bg-blue-100 text-blue-800' },
    REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
    PROCESSING: { label: '处理中', color: 'bg-purple-100 text-purple-800' },
    COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-800' },
    FAILED: { label: '失败', color: 'bg-red-100 text-red-800' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <RefreshCw className="h-5 w-5 mr-2" />
          退款信息
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && !refundInfo && <LoadingSpinner size="sm" message="加载退款信息..." />}

        {error && <ErrorMessage error={error} className="mb-4" />}

        {refundInfo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">退款金额</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(refundInfo.amount)}
                </div>
              </div>
              <Badge className={statusConfig[refundInfo.status]?.color || 'bg-gray-100 text-gray-800'}>
                {statusConfig[refundInfo.status]?.label || refundInfo.status}
              </Badge>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">退款原因</div>
              <div className="text-sm text-gray-900 mt-1">{refundInfo.reason}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">申请时间</div>
              <div className="text-sm text-gray-600 mt-1">
                {new Date(refundInfo.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>
        ) : canRefund && !showForm ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              如果订单需要退款，请填写退款申请。
            </div>
            <Button onClick={() => setShowForm(true)} variant="outline">
              申请退款
            </Button>
          </div>
        ) : canRefund && showForm ? (
          <form onSubmit={handleRefundRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                退款原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                required
                placeholder="请详细说明退款原因..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                退款金额（留空为全额退款）
              </label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="留空为全额退款"
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !refundReason}>
                {loading ? <LoadingSpinner size="sm" /> : '提交申请'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setRefundReason('');
                  setRefundAmount('');
                }}
              >
                取消
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-sm text-gray-500">
            该订单不支持退款或已退款
          </div>
        )}
      </CardContent>
    </Card>
  );
}

