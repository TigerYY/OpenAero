/**
 * 支付失败页面
 * 显示支付失败信息并提供重试选项
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouting } from '@/lib/routing';
import { XCircle, RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { DefaultLayout } from '@/components/layout/DefaultLayout';

export default function PaymentFailurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const { route, routes } = useRouting();
  
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // 从URL参数获取订单信息
    const orderIdParam = searchParams.get('orderId');
    const paymentIdParam = searchParams.get('paymentId');
    const errorParam = searchParams.get('error');

    if (orderIdParam) setOrderId(orderIdParam);
    if (paymentIdParam) setPaymentId(paymentIdParam);
    if (errorParam) setErrorMessage(decodeURIComponent(errorParam));
  }, [searchParams]);

  const handleRetry = async () => {
    if (!orderId) return;

    setIsRetrying(true);
    try {
      // 跳转到订单详情页面，用户可以重新支付
      router.push(route(routes.ORDERS.DETAIL.replace('[id]', orderId)));
    } catch (error) {
      console.error('重试支付失败:', error);
      setIsRetrying(false);
    }
  };

  return (
    <DefaultLayout>
      <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 min-h-[60vh]">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* 失败图标 */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
              <XCircle className="w-16 h-16 text-red-600" />
            </div>
          </div>

          {/* 失败标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {t('payment.paymentFailed', { defaultValue: '支付失败' })}
            </h1>
            <p className="text-lg text-gray-600">
              {t('payment.paymentFailedDesc', {
                defaultValue: '很抱歉，您的支付未能完成',
              })}
            </p>
          </div>

          {/* 错误信息 */}
          {errorMessage && (
            <div className="mb-6">
              <ErrorMessage
                error={errorMessage}
                type="error"
                showIcon={true}
              />
            </div>
          )}

          {/* 订单信息 */}
          {(orderId || paymentId) && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-3">
              {orderId && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    {t('payment.orderId', { defaultValue: '订单号' })}:
                  </span>
                  <span className="font-mono font-semibold text-gray-900">{orderId}</span>
                </div>
              )}
              {paymentId && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    {t('payment.paymentId', { defaultValue: '支付单号' })}:
                  </span>
                  <span className="font-mono text-sm text-gray-700">{paymentId}</span>
                </div>
              )}
            </div>
          )}

          {/* 可能的原因 */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">
              {t('payment.possibleReasons', { defaultValue: '可能的原因' })}:
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <AlertCircle className="w-5 h-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  {t('payment.reason1', {
                    defaultValue: '支付超时，请重新尝试支付',
                  })}
                </span>
              </li>
              <li className="flex items-start">
                <AlertCircle className="w-5 h-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  {t('payment.reason2', {
                    defaultValue: '账户余额不足或支付方式受限',
                  })}
                </span>
              </li>
              <li className="flex items-start">
                <AlertCircle className="w-5 h-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  {t('payment.reason3', {
                    defaultValue: '网络连接问题，请检查网络后重试',
                  })}
                </span>
              </li>
            </ul>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-4">
            {orderId && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t('payment.retrying', { defaultValue: '重试中...' })}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('payment.retryPayment', { defaultValue: '重新支付' })}
                  </>
                )}
              </Button>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              {orderId && (
                <Link href={route(routes.ORDERS.DETAIL.replace('[id]', orderId))} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('payment.viewOrder', { defaultValue: '查看订单' })}
                  </Button>
                </Link>
              )}
              <Link href={route(routes.BUSINESS.HOME)} className="flex-1">
                <Button variant="outline" className="w-full">
                  {t('payment.backToHome', { defaultValue: '返回首页' })}
                </Button>
              </Link>
            </div>
          </div>

          {/* 帮助信息 */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              {t('payment.helpNote', {
                defaultValue:
                  '如果问题持续存在，请联系客服或查看订单详情页面获取更多帮助。您的订单已保存，可以稍后重新支付。',
              })}
            </p>
          </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}

