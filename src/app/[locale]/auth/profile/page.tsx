'use client';

import { AuthLayout } from '@/components/layout/AuthLayout';

function ProfileContent() {
  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            个人资料
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            管理您的账户信息
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-center text-gray-500">
            个人资料功能正在开发中...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthLayout>
      <ProfileContent />
    </AuthLayout>
  );
}