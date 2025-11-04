'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { AuthLayout } from '@/components/layout/AuthLayout';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            邮箱验证
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            正在验证您的邮箱地址...
          </p>
        </div>
        
        {token ? (
          <div className="text-center">
            <p className="text-green-600">验证令牌有效，正在验证您的邮箱。</p>
            {/* 这里可以添加邮箱验证逻辑 */}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-red-600">无效的验证链接，请重新申请邮箱验证。</p>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyEmailPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div>加载中...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </AuthLayout>
  );
}

export default VerifyEmailPage;