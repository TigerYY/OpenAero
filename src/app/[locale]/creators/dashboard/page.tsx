'use client';
import { useRouting } from '@/lib/routing';

import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  ShoppingCart,
  Eye,
  Star,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';


import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

import { formatCurrency, formatDate } from '@/lib/utils';


interface CreatorStats {
  totalSolutions: number;
  publishedSolutions: number;
  draftSolutions: number;
  pendingSolutions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  monthlyOrders: number;
  totalViews: number;
  averageRating: number;
  totalDownloads?: number;
  totalReviews?: number;
}

interface RecentSolution {
  id: string;
  title: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  downloadCount?: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  solutionTitle?: string;
  amount?: number;
  solutions: Array<{
    id: string;
    title: string;
    price: number;
  }>;
}

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { route } = useRouting();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [recentSolutions, setRecentSolutions] = useState<RecentSolution[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 获取统计数据
      const statsResponse = await fetch('/api/creators/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // 获取最近的方案
      const solutionsResponse = await fetch('/api/creators/dashboard/recent-solutions');
      if (solutionsResponse.ok) {
        const solutionsData = await solutionsResponse.json();
        setRecentSolutions(solutionsData.data);
      }

      // 获取最近的订单
      const ordersResponse = await fetch('/api/creators/dashboard/recent-orders');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setRecentOrders(ordersData.data);
      }
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return '已发布';
      case 'PENDING': return '审核中';
      case 'DRAFT': return '草稿';
      case 'REJECTED': return '已拒绝';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">创作者仪表板</h1>
          <p className="mt-2 text-sm text-gray-600">
            这里是您的创作管理中心。
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
                  onClick={() => router.push(route('/creators/products'))}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
                >
                  查看我的产品
                </button>
                <button
                  onClick={() => router.push(route('/creators/products/new'))}
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
                  onClick={() => router.push(route('/creators/orders'))}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
                >
                  查看所有订单
                </button>
                <button
                  onClick={() => router.push(route('/creators/orders/pending'))}
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
                  onClick={() => router.push(route('/creators/analytics'))}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md"
                >
                  查看销售分析
                </button>
                <button
                  onClick={() => router.push(route('/creators/reports'))}
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