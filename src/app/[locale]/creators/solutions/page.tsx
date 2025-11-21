'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRouting } from '@/lib/routing';
import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * 创作者方案页面
 * 重定向到 dashboard 的 solutions 标签页
 */
export default function CreatorSolutionsPage() {
  const router = useRouter();
  const { route, routes } = useRouting();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 重定向到 dashboard 的 solutions 标签页
    const tab = searchParams?.get('tab') || 'solutions';
    router.replace(`${route(routes.CREATORS.DASHBOARD)}?tab=${tab}`);
  }, [router, route, routes, searchParams]);

  return (
    <ProtectedRoute>
      <DefaultLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
          <p className="text-gray-600 ml-2">正在跳转...</p>
        </div>
      </DefaultLayout>
    </ProtectedRoute>
  );
}

