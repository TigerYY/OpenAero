/**
 * 支付模态框组件
 * 支持支付宝和微信支付，包含支付状态实时更新
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, CreditCard, Smartphone, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { getLocalizedErrorMessage } from '@/lib/error-messages';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  solutionId: string;
  amount: number;
  title: string;
  onPaymentSuccess?: (orderId: string) => void;
}

interface PaymentOrder {
  orderId: string;
  paymentId: string;
  paymentUrl: string;
  amount: number;
  currency: string;
  expiresAt: string;
  status: string;
}

type PaymentMethod = 'alipay' | 'wechat';

export default function PaymentModal({
  isOpen,
  onClose,
  solutionId,
  amount,
  title,
  onPaymentSuccess,
}: PaymentModalProps) {
  const t = useTranslations();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('alipay');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setCurrentOrder(null);
      setError(null);
      setRemainingTime(0);
      setIsCreatingOrder(false);
      setIsCheckingStatus(false);
    }
  }, [isOpen]);

  // 倒计时效果
  useEffect(() => {
    if (!currentOrder || remainingTime <= 0) return;

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          setCurrentOrder(null);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentOrder, remainingTime]);

  // 定期检查支付状态
  useEffect(() => {
    if (!currentOrder || currentOrder.status !== 'pending') return;

    const checkStatus = async () => {
      if (isCheckingStatus) return;

      setIsCheckingStatus(true);
      setError(null);
      try {
        const response = await fetch(`/api/payments/${currentOrder.paymentId}/status`);
        const result = await response.json();

        if (result.success) {
          const payment = result.data;
          const status = payment.status.toLowerCase();

          if (status === 'completed') {
            setCurrentOrder((prev) => (prev ? { ...prev, status: 'paid' } : null));
            onPaymentSuccess?.(currentOrder.orderId);
            setTimeout(() => {
              onClose();
              setCurrentOrder(null);
            }, 2000);
          } else if (status === 'failed' || status === 'cancelled') {
            setCurrentOrder(null);
            setError(
              t('payment.paymentFailed', {
                defaultValue: '支付失败，请重试',
              })
            );
          } else if (status === 'expired') {
            setCurrentOrder(null);
            setError(
              t('payment.paymentExpired', {
                defaultValue: '支付已过期，请重新创建订单',
              })
            );
          }
        } else {
          // 如果查询失败，不显示错误，继续轮询
          console.error('检查支付状态失败:', result.message);
        }
      } catch (err) {
        console.error('检查支付状态异常:', err);
        // 不显示错误，继续轮询
      } finally {
        setIsCheckingStatus(false);
      }
    };

    const statusTimer = setInterval(checkStatus, 3000); // 每3秒检查一次
    return () => clearInterval(statusTimer);
  }, [currentOrder, isCheckingStatus, onPaymentSuccess, onClose, t]);

  const createPaymentOrder = async () => {
    setIsCreatingOrder(true);
    setError(null);
    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solutionId,
          amount,
          paymentMethod: selectedMethod === 'alipay' ? 'ALIPAY' : 'WECHAT_PAY',
        }),
      });

      const result = await response.json();

      if (result.success) {
        const order = result.data;
        setCurrentOrder({
          orderId: order.orderId,
          paymentId: order.paymentId,
          paymentUrl: order.paymentUrl,
          amount: order.amount,
          currency: order.currency || 'CNY',
          expiresAt: order.expiresAt,
          status: order.status || 'pending',
        });

        // 计算剩余时间
        const expiresAt = new Date(order.expiresAt);
        const now = new Date();
        const remaining = Math.max(
          0,
          Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
        );
        setRemainingTime(remaining);

        // 打开支付页面
        if (order.paymentUrl) {
          window.open(order.paymentUrl, '_blank');
        }
      } else {
        setError(
          result.message ||
            getLocalizedErrorMessage(result.error || '创建订单失败', 'zh-CN')
        );
      }
    } catch (err) {
      console.error('创建支付订单失败:', err);
      setError(
        getLocalizedErrorMessage(
          err,
          'zh-CN'
        ) || t('payment.createOrderFailed', { defaultValue: '创建订单失败，请稍后重试' })
      );
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (currentOrder && currentOrder.status === 'pending') {
      // 如果正在支付中，确认关闭
      if (
        !confirm(
          t('payment.confirmClose', {
            defaultValue: '支付尚未完成，确定要关闭吗？',
          })
        )
      ) {
        return;
      }
    }
    onClose();
    setCurrentOrder(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto animate-in fade-in zoom-in duration-200">
        {/* 头部 */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('payment.title', { defaultValue: '支付订单' })}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label={t('common.close', { defaultValue: '关闭' })}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4">
              <ErrorMessage error={error} showRetry={false} />
            </div>
          )}

          {!currentOrder ? (
            <>
              {/* 订单信息 */}
              <div className="mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">{title}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{t('payment.productAmount', { defaultValue: '商品金额' })}</span>
                      <span className="font-medium">
                        {t('payment.currency', { defaultValue: '¥' })}
                        {amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-blue-200">
                      <span>{t('payment.totalAmount', { defaultValue: '应付金额' })}</span>
                      <span className="text-red-600">
                        {t('payment.currency', { defaultValue: '¥' })}
                        {amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 支付方式选择 */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 text-gray-900">
                  {t('payment.selectMethod', { defaultValue: '选择支付方式' })}
                </h4>
                <div className="space-y-3">
                  <label
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedMethod === 'alipay'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="alipay"
                      checked={selectedMethod === 'alipay'}
                      onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
                      className="mr-4 w-4 h-4 text-blue-600"
                    />
                    <div className="flex items-center flex-1">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg mr-3 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">支</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {t('payment.alipay', { defaultValue: '支付宝' })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('payment.alipayDesc', { defaultValue: '支持支付宝账户支付' })}
                        </div>
                      </div>
                    </div>
                  </label>
                  <label
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedMethod === 'wechat'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="wechat"
                      checked={selectedMethod === 'wechat'}
                      onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
                      className="mr-4 w-4 h-4 text-green-600"
                    />
                    <div className="flex items-center flex-1">
                      <div className="w-10 h-10 bg-green-500 rounded-lg mr-3 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">微</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {t('payment.wechatPay', { defaultValue: '微信支付' })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('payment.wechatPayDesc', { defaultValue: '支持微信支付' })}
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 支付按钮 */}
              <Button
                onClick={createPaymentOrder}
                disabled={isCreatingOrder}
                className="w-full py-3 text-base font-semibold"
              >
                {isCreatingOrder ? (
                  <LoadingSpinner size="sm" message={t('payment.creating', { defaultValue: '创建订单中...' })} />
                ) : (
                  `${t('payment.payNow', { defaultValue: '立即支付' })} ${t('payment.currency', { defaultValue: '¥' })}${amount.toFixed(2)}`
                )}
              </Button>
            </>
          ) : (
            <>
              {/* 支付状态 */}
              <div className="text-center">
                {currentOrder.status === 'pending' && (
                  <>
                    <div className="mb-6">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Clock className="w-10 h-10 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {t('payment.waitingPayment', { defaultValue: '等待支付' })}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {t('payment.paymentInstruction', {
                          defaultValue: '请在新打开的页面完成支付',
                        })}
                      </p>
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                        <div className="text-3xl font-mono text-red-600 mb-1">
                          {formatTime(remainingTime)}
                        </div>
                        <p className="text-sm text-red-600">
                          {t('payment.expiresIn', {
                            defaultValue: '订单将在上述时间后自动取消',
                          })}
                        </p>
                      </div>
                      {isCheckingStatus && (
                        <div className="text-sm text-gray-500 mb-4">
                          {t('payment.checkingStatus', { defaultValue: '正在检查支付状态...' })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={() => window.open(currentOrder.paymentUrl, '_blank')}
                        className="w-full"
                      >
                        {t('payment.reopenPaymentPage', { defaultValue: '重新打开支付页面' })}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentOrder(null);
                          setError(null);
                        }}
                        className="w-full"
                      >
                        {t('payment.reselectMethod', { defaultValue: '重新选择支付方式' })}
                      </Button>
                    </div>
                  </>
                )}

                {currentOrder.status === 'paid' && (
                  <>
                    <div className="mb-6">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-green-600 mb-2">
                        {t('payment.paymentSuccess', { defaultValue: '支付成功' })}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {t('payment.paymentSuccessDesc', {
                          defaultValue: '订单已完成支付，页面即将关闭',
                        })}
                      </p>
                    </div>
                  </>
                )}

                {currentOrder.status === 'failed' && (
                  <>
                    <div className="mb-6">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-10 h-10 text-red-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-red-600 mb-2">
                        {t('payment.paymentFailed', { defaultValue: '支付失败' })}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {t('payment.paymentFailedDesc', {
                          defaultValue: '支付未完成，请重试',
                        })}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setCurrentOrder(null);
                        setError(null);
                      }}
                      className="w-full"
                    >
                      {t('payment.retry', { defaultValue: '重试' })}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
