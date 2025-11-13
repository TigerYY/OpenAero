/**
 * 支付成功页面
 * 显示支付成功信息并提供后续操作
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouting } from '@/lib/routing';
import { CheckCircle, ArrowRight, Package, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DefaultLayout } from '@/components/layout/DefaultLayout';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const { route, routes } = useRouting();
  
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    // 从URL参数获取订单信息
    const orderIdParam = searchParams.get('orderId');
    const paymentIdParam = searchParams.get('paymentId');
    const amountParam = searchParams.get('amount');

    if (orderIdParam) setOrderId(orderIdParam);
    if (paymentIdParam) setPaymentId(paymentIdParam);
    if (amountParam) setAmount(parseFloat(amountParam));
  }, [searchParams]);

  return (
    <DefaultLayout>
      <div className="bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 min-h-[60vh]">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            {/* 成功图标 */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
            </div>

            {/* 成功标题 */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                {t('payment.paymentSuccess', { defaultValue: '支付成功！' })}
              </h1>
              <p className="text-lg text-gray-600">
                {t('payment.paymentSuccessDesc', {
                  defaultValue: '您的订单已成功支付，我们将尽快处理您的订单',
                })}
              </p>
            </div>

          {/* 订单信息卡片 */}
          {(orderId || paymentId || amount) && (
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
              {amount && (
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-gray-600 font-medium">
                    {t('payment.paidAmount', { defaultValue: '支付金额' })}:
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    {t('payment.currency', { defaultValue: '¥' })}
                    {amount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 后续操作 */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Link href={orderId ? route(routes.ORDERS.DETAIL.replace('[id]', orderId)) : route(routes.ORDERS.HOME)}>
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group">
                  <div className="flex items-center">
                    <Package className="w-6 h-6 text-gray-600 group-hover:text-blue-600 mr-3" />
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-blue-900">
                        {t('payment.viewOrder', { defaultValue: '查看订单' })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t('payment.viewOrderDesc', { defaultValue: '查看订单详情和物流信息' })}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href={route(routes.BUSINESS.SOLUTIONS)}>
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer group">
                  <div className="flex items-center">
                    <FileText className="w-6 h-6 text-gray-600 group-hover:text-green-600 mr-3" />
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-green-900">
                        {t('payment.continueShopping', { defaultValue: '继续购物' })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t('payment.continueShoppingDesc', { defaultValue: '浏览更多解决方案' })}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3">
              {orderId && (
                <Link href={route(routes.ORDERS.DETAIL.replace('[id]', orderId))} className="flex-1">
                  <Button className="w-full">
                    {t('payment.viewOrderDetails', { defaultValue: '查看订单详情' })}
                    <ArrowRight className="w-4 h-4 ml-2" />
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

          {/* 提示信息 */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {t('payment.successNote', {
                defaultValue:
                  '我们已收到您的支付，订单正在处理中。您将收到订单确认邮件，订单状态更新时我们也会及时通知您。',
              })}
            </p>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}

