'use client';
import { useRouting } from '@/lib/routing';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordRedirect() {
  const { route, routes } = useRouting();
  const router = useRouter();
  
  useEffect(() => {
    // 重定向到带语言前缀的忘记密码页面
    router.replace(route('/zh-CN/forgot-password'));
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">正在跳转...</p>
      </div>
    </div>
  );
}
