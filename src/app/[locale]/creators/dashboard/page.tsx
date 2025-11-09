'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    activeProducts: 0,
    totalSales: 0,
    pendingOrders: 0
  });
  const [loading, setLoading] = useState(true);

  // 检查用户权限
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      // 未登录用户重定向到登录页面
      router.push('/auth/login?callbackUrl=/creators/dashboard');
      return;
    }

    // 检查用户是否是创作者
    if (session.user.role !== 'CREATOR') {
      // 非创作者用户重定向到申请页面
      router.push('/creators/apply');
      return;
    }

    // 获取仪表板数据
    fetchDashboardData();
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    try {
      // 这里应该调用API获取创作者仪表板数据
      // 暂时使用模拟数据
      setDashboardData({
        totalRevenue: 12500,
        activeProducts: 8,
        totalSales: 156,
        pendingOrders: 3
      });
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载仪表板...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // 重定向中
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">创作者仪表板</h1>
          <p className="mt-2 text-sm text-gray-600">
            欢迎回来，{session.user.name}！这里是您的创作管理中心。
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">总收益</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">¥{dashboardData.totalRevenue.toLocaleString()}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">活跃产品</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{dashboardData.activeProducts}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">总销量</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{dashboardData.totalSales}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">待处理订单</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{dashboardData.pendingOrders}</dd>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">产品管理</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/creators/products')}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
                >
                  查看我的产品
                </button>
                <button
                  onClick={() => router.push('/creators/products/new')}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md"
                >
                  创建新产品
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">订单管理</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/creators/orders')}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
                >
                  查看所有订单
                </button>
                <button
                  onClick={() => router.push('/creators/orders/pending')}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md"
                >
                  处理待发货订单
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">数据分析</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/creators/analytics')}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md"
                >
                  查看销售分析
                </button>
                <button
                  onClick={() => router.push('/creators/reports')}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md"
                >
                  生成收益报告
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 最近活动 */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">最近活动</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">新产品 "FPV竞速无人机" 已上架</span>
                </div>
                <span className="text-sm text-gray-500">2小时前</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">收到新订单 #ORD-2024-001</span>
                </div>
                <span className="text-sm text-gray-500">5小时前</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">产品 "农业植保方案" 收到新评价</span>
                </div>
                <span className="text-sm text-gray-500">1天前</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}