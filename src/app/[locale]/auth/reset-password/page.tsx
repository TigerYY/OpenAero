'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { AuthLayout } from '@/components/layout/AuthLayout';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            重置密码
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            请输入您的新密码
          </p>
        </div>
        
        {token ? (
          <div className="text-center">
            <p className="text-green-600">重置令牌有效，可以设置新密码。</p>
            {/* 这里可以添加密码重置表单 */}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-red-600">无效的重置链接，请重新申请密码重置。</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div>加载中...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </AuthLayout>
  );
}

export default ResetPasswordPage;