/**
 * 认证错误页面
 * 显示友好的错误信息和重试选项
 */

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouting } from '@/lib/routing';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const locale = useLocale() as 'zh-CN' | 'en-US';
  const { route, routes } = useRouting();
  
  const errorMessage = searchParams.get('message') || searchParams.get('error');
  const errorType = searchParams.get('type') || 'error';

  useEffect(() => {
    // 如果5秒后用户没有操作，自动跳转到登录页
    const timer = setTimeout(() => {
      router.push(route(routes.AUTH.LOGIN));
    }, 5000);

    return () => clearTimeout(timer);
  }, [router, route, routes]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-600">
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('errors.generic', { defaultValue: '发生错误' })}
          </h2>
        </div>

        {errorMessage && (
          <ErrorMessage
            error={errorMessage}
            type={errorType as 'error' | 'warning' | 'info'}
            showRetry={true}
            onRetry={() => router.back()}
          />
        )}

        <div className="space-y-4">
          <div>
            <Link
              href={route(routes.AUTH.LOGIN)}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('auth.login', { defaultValue: '返回登录' })}
            </Link>
          </div>

          <div>
            <button
              onClick={() => router.back()}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common.back', { defaultValue: '返回上一页' })}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500">
          {t('common.autoRedirect', { defaultValue: '5秒后自动跳转到登录页面' })}
        </p>
      </div>
    </div>
  );
}

