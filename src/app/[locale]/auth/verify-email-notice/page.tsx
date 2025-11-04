'use client';

import Link from 'next/link';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { useRouting } from '@/lib/routing';

function VerifyEmailNoticeContent() {
  const { route, routes } = useRouting();
  
  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            请验证您的邮箱
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            我们已向您的邮箱发送了验证邮件。请检查您的收件箱并点击邮件中的验证链接来激活您的账户。
          </p>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-500">
              如果您没有收到邮件，请检查垃圾邮件文件夹或
              <Link
                href={route(routes.AUTH.REGISTER)}
                className="font-medium text-indigo-600 hover:text-indigo-500 ml-1"
              >
                重新发送验证邮件
              </Link>
            </p>
            <div>
              <Link
                href={route(routes.AUTH.LOGIN)}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                返回登录页面
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailNoticePage() {
  return (
    <AuthLayout>
      <VerifyEmailNoticeContent />
    </AuthLayout>
  );
}