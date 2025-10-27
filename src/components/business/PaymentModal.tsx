'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

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
  paymentUrl: string;
  amount: number;
  currency: string;
  expiresAt: string;
  status: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  solutionId,
  amount,
  title,
  onPaymentSuccess
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'alipay' | 'wechat'>('alipay');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // 倒计时效果
  useEffect(() => {
    if (!currentOrder || remainingTime <= 0) return;

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          setCurrentOrder(null);
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
      try {
        const response = await fetch(`/api/payments/status/${currentOrder.orderId}`);
        const result = await response.json();
        
        if (result.success) {
          const { status, remainingTime: newRemainingTime } = result.data;
          
          if (status === 'paid') {
            setCurrentOrder(prev => prev ? { ...prev, status: 'paid' } : null);
            onPaymentSuccess?.(currentOrder.orderId);
            setTimeout(() => {
              onClose();
              setCurrentOrder(null);
            }, 2000);
          } else if (status === 'expired' || status === 'failed') {
            setCurrentOrder(null);
          } else {
            setRemainingTime(newRemainingTime);
          }
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    const statusTimer = setInterval(checkStatus, 3000); // 每3秒检查一次
    return () => clearInterval(statusTimer);
  }, [currentOrder, isCheckingStatus, onPaymentSuccess, onClose]);

  const createPaymentOrder = async () => {
    setIsCreatingOrder(true);
    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solutionId,
          amount,
          paymentMethod: selectedMethod
        }),
      });

      const result = await response.json();

      if (result.success) {
        const order = result.data;
        setCurrentOrder(order);
        
        // 计算剩余时间
        const expiresAt = new Date(order.expiresAt);
        const now = new Date();
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
        setRemainingTime(remaining);

        // 打开支付页面
        if (order.paymentUrl) {
          window.open(order.paymentUrl, '_blank');
        }
      } else {
        alert('创建订单失败：' + result.error);
      }
    } catch (error) {
      console.error('创建支付订单失败:', error);
      alert('创建订单失败，请稍后重试');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">支付订单</h2>
          <button
            onClick={() => {
              onClose();
              setCurrentOrder(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {!currentOrder ? (
          <>
            {/* 订单信息 */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">{title}</h3>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>商品金额</span>
                  <span>¥{amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold mt-2">
                  <span>应付金额</span>
                  <span className="text-red-600">¥{amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 支付方式选择 */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">选择支付方式</h4>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="alipay"
                    checked={selectedMethod === 'alipay'}
                    onChange={(e) => setSelectedMethod(e.target.value as 'alipay')}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded mr-3 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">支</span>
                    </div>
                    <span>支付宝</span>
                  </div>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wechat"
                    checked={selectedMethod === 'wechat'}
                    onChange={(e) => setSelectedMethod(e.target.value as 'wechat')}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-500 rounded mr-3 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">微</span>
                    </div>
                    <span>微信支付</span>
                  </div>
                </label>
              </div>
            </div>

            {/* 支付按钮 */}
            <Button
              onClick={createPaymentOrder}
              disabled={isCreatingOrder}
              className="w-full"
            >
              {isCreatingOrder ? '创建订单中...' : `立即支付 ¥${amount.toFixed(2)}`}
            </Button>
          </>
        ) : (
          <>
            {/* 支付状态 */}
            <div className="text-center">
              {currentOrder.status === 'pending' && (
                <>
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">等待支付</h3>
                    <p className="text-gray-600 mb-4">
                      请在新打开的页面完成支付
                    </p>
                    <div className="text-2xl font-mono text-red-600 mb-2">
                      {formatTime(remainingTime)}
                    </div>
                    <p className="text-sm text-gray-500">
                      订单将在上述时间后自动取消
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Button
                      onClick={() => window.open(currentOrder.paymentUrl, '_blank')}
                      className="w-full"
                    >
                      重新打开支付页面
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentOrder(null)}
                      className="w-full"
                    >
                      重新选择支付方式
                    </Button>
                  </div>
                </>
              )}

              {currentOrder.status === 'paid' && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-green-600 mb-2">支付成功</h3>
                  <p className="text-gray-600">
                    订单已完成支付，页面即将关闭
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}