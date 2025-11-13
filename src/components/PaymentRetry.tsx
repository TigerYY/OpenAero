/**
 * 支付重试组件
 * 支持支付失败后的重试功能，包含重试次数限制和状态检查
 */

'use client';

import { 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle,
  CreditCard,
  Smartphone,
  Building
} from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface PaymentRetryProps {
  payment: {
    id: string;
    status: string;
    amount: number;
    paymentMethod: string;
    failureReason?: string;
    createdAt: string;
  };
  retryInfo: {
    canRetry: boolean;
    failedCount: number;
    maxRetries: number;
    remainingRetries: number;
  };
  onRetry: (paymentId: string) => Promise<void>;
  onStatusCheck: (paymentId: string) => Promise<void>;
}

export default function PaymentRetry({ 
  payment, 
  retryInfo, 
  onRetry, 
  onStatusCheck 
}: PaymentRetryProps) {
  const t = useTranslations();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return `${t('payment.currency', { defaultValue: '¥' })}${amount.toFixed(2)}`;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // 获取支付方式图标
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'ALIPAY':
        return <Smartphone className="h-4 w-4" />;
      case 'WECHAT_PAY':
        return <Smartphone className="h-4 w-4" />;
      case 'CREDIT_CARD':
        return <CreditCard className="h-4 w-4" />;
      case 'BANK_TRANSFER':
        return <Building className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  // 获取支付方式名称
  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'ALIPAY':
        return t('payment.alipay', { defaultValue: '支付宝' });
      case 'WECHAT_PAY':
        return t('payment.wechatPay', { defaultValue: '微信支付' });
      case 'CREDIT_CARD':
        return t('payment.creditCard', { defaultValue: '信用卡' });
      case 'BANK_TRANSFER':
        return t('payment.bankTransfer', { defaultValue: '银行转账' });
      case 'PAYPAL':
        return t('payment.paypal', { defaultValue: 'PayPal' });
      default:
        return method;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return t('payment.status.completed', { defaultValue: '支付成功' });
      case 'PENDING':
        return t('payment.status.pending', { defaultValue: '待支付' });
      case 'PROCESSING':
        return t('payment.status.processing', { defaultValue: '处理中' });
      case 'FAILED':
        return t('payment.status.failed', { defaultValue: '支付失败' });
      case 'CANCELLED':
        return t('payment.status.cancelled', { defaultValue: '已取消' });
      default:
        return status;
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'PROCESSING':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // 处理重试
  const handleRetry = async () => {
    if (!retryInfo.canRetry || isRetrying) return;

    try {
      setIsRetrying(true);
      setError(null);
      setSuccess(null);
      
      await onRetry(payment.id);
      setSuccess(t('payment.retryInitiated', { defaultValue: '支付重试已发起，请完成支付' }));
    } catch (error) {
      console.error('支付重试失败:', error);
      setError(t('payment.retryFailed', { defaultValue: '支付重试失败，请稍后再试' }));
    } finally {
      setIsRetrying(false);
    }
  };

  // 处理状态检查
  const handleStatusCheck = async () => {
    if (isChecking) return;

    try {
      setIsChecking(true);
      setError(null);
      setSuccess(null);
      
      await onStatusCheck(payment.id);
      setSuccess(t('payment.statusUpdated', { defaultValue: '支付状态已更新' }));
    } catch (error) {
      console.error('状态检查失败:', error);
      setError(t('payment.statusCheckFailed', { defaultValue: '状态检查失败，请稍后再试' }));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon(payment.status)}
          <span>{t('payment.paymentStatus', { defaultValue: '支付状态' })}</span>
          <Badge className={getStatusColor(payment.status)}>
            {getStatusText(payment.status)}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 支付信息 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">{t('payment.amount', { defaultValue: '支付金额' })}</div>
            <div className="font-semibold text-lg">{formatCurrency(payment.amount)}</div>
          </div>
          <div>
            <div className="text-gray-600">{t('payment.method', { defaultValue: '支付方式' })}</div>
            <div className="flex items-center space-x-2">
              {getPaymentMethodIcon(payment.paymentMethod)}
              <span className="font-medium">{getPaymentMethodName(payment.paymentMethod)}</span>
            </div>
          </div>
          <div>
            <div className="text-gray-600">{t('payment.createdAt', { defaultValue: '创建时间' })}</div>
            <div className="font-medium">{formatDate(payment.createdAt)}</div>
          </div>
          <div>
            <div className="text-gray-600">{t('payment.paymentId', { defaultValue: '支付ID' })}</div>
            <div className="font-mono text-xs">{payment.id.slice(0, 8)}...</div>
          </div>
        </div>

        {/* 失败原因 */}
        {payment.status === 'FAILED' && payment.failureReason && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-red-800">
                  {t('payment.failureReason', { defaultValue: '支付失败原因' })}
                </div>
                <div className="text-sm text-red-700 mt-1">{payment.failureReason}</div>
              </div>
            </div>
          </div>
        )}

        {/* 重试信息 */}
        {payment.status === 'FAILED' && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                {t('payment.failedCount', { defaultValue: '失败次数' })}: {retryInfo.failedCount} / {retryInfo.maxRetries}
              </div>
              <div>
                {t('payment.remainingRetries', { defaultValue: '剩余重试次数' })}: {retryInfo.remainingRetries}
              </div>
            </div>
          </div>
        )}

        {/* 错误和成功提示 */}
        {error && <ErrorMessage error={error} className="mb-2" />}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-700">{success}</div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex space-x-3 pt-2">
          {/* 重试按钮 */}
          {retryInfo.canRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1"
            >
              {isRetrying ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">{t('payment.retrying', { defaultValue: '重试中...' })}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('payment.retryPayment', { defaultValue: '重新支付' })}
                </>
              )}
            </Button>
          )}

          {/* 状态检查按钮 */}
          {(payment.status === 'PENDING' || payment.status === 'PROCESSING') && (
            <Button
              variant="outline"
              onClick={handleStatusCheck}
              disabled={isChecking}
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">{t('payment.checking', { defaultValue: '检查中...' })}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('payment.checkStatus', { defaultValue: '检查状态' })}
                </>
              )}
            </Button>
          )}
        </div>

        {/* 提示信息 */}
        {!retryInfo.canRetry && payment.status === 'FAILED' && (
          <div className="text-sm text-gray-600 text-center py-2">
            {retryInfo.remainingRetries === 0 ? 
              t('payment.maxRetriesReached', { defaultValue: '已达到最大重试次数，请联系客服处理' }) : 
              t('payment.retryNotAvailable', { defaultValue: '当前不支持重试，请稍后再试' })
            }
          </div>
        )}

        {payment.status === 'COMPLETED' && (
          <div className="text-sm text-green-600 text-center py-2 flex items-center justify-center space-x-1">
            <CheckCircle className="h-4 w-4" />
            <span>{t('payment.completed', { defaultValue: '支付已完成' })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}