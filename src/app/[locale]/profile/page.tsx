'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@/lib/auth-client';

interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const currentUser = AuthClient.getUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    setUser(currentUser);
  }, [router]);

  const handleLogout = () => {
    AuthClient.clearSession();
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          用户资料
        </h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              邮箱
            </label>
            <p className="mt-1 text-gray-900">{user.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              姓名
            </label>
            <p className="mt-1 text-gray-900">
              {user.firstName} {user.lastName}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              角色
            </label>
            <p className="mt-1 text-gray-900">{user.role}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              邮箱验证状态
            </label>
            <p className="mt-1 text-gray-900">
              {user.emailVerified ? '已验证' : '未验证'}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              注册时间
            </label>
            <p className="mt-1 text-gray-900">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="mt-6 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
          >
            退出登录
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}