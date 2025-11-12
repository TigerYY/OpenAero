'use client';
import { useRouting } from '@/lib/routing';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterRedirect() {
  const { route, routes } = useRouting();
  const router = useRouter();
  
  useEffect(() => {
    // 重定向到带语言前缀的注册页面
    router.replace(route('/zh-CN/register'));
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">正在跳转到注册页面...</p>
      </div>
    </div>
  );
}
