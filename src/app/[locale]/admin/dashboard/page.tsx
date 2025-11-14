'use client';

import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  AlertCircle,
  Calendar,
  BarChart3,
  Activity,
  Settings,
  Mail,
  Trash2,
  ArrowLeft,
  Home
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRouting } from '@/lib/routing';
import { useAuth } from '@/contexts/AuthContext';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { DefaultLayout } from '@/components/layout/DefaultLayout';


// 统计数据接口
interface DashboardStats {
  solutions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  users: {
    total: number;
    admins: number;
  };
  reviews: {
    totalReviews: number;
    avgReviewTime: number;
  };
  recentActivity: {
    newSolutions: number;
    newUsers: number;
    completedReviews: number;
  };
  growth: {
    solutionsGrowth: number;
    usersGrowth: number;
    reviewsGrowth: number;
  };
  categories: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  statusTrend: Array<{
    date: string;
    approved: number;
    rejected: number;
    pending: number;
  }>;
}

// 快速操作结果接口
interface QuickActionResult {
  success: boolean;
  message: string;
  data?: any;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { route, routes } = useRouting();
  const { signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'solutions' | 'users' | 'analytics'>('overview');
  const [timeRange, setTimeRange] = useState('30');
  
  // 快速操作状态
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchAction, setBatchAction] = useState<'approve' | 'reject'>('approve');
  const [batchNotes, setBatchNotes] = useState('');

  useEffect(() => {
    loadDashboardStats();
  }, [timeRange]);

  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/dashboard/stats?timeRange=${timeRange}`, {
        credentials: 'include', // 使用 cookies 认证
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '获取统计数据失败' }));
        throw new Error(errorData.error || '获取统计数据失败');
      }

      const responseData = await response.json();
      // API 返回格式: { success: true, data: {...} }
      if (responseData.success && responseData.data) {
        setStats(responseData.data);
      } else {
        // 兼容旧格式（直接返回数据）
        setStats(responseData);
      }
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '加载数据失败，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 快速操作函数
  const handleQuickAction = async (action: string, params?: any) => {
    setQuickActionLoading(action);
    try {
      const response = await fetch('/api/admin/dashboard/quick-actions', {
        method: 'POST',
        credentials: 'include', // 使用 cookies 认证
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...params,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '操作失败' }));
        throw new Error(errorData.error || '操作失败');
      }

      const result: QuickActionResult = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        
        // 如果是导出操作，处理下载
        if ((action.startsWith('export') || action.includes('export')) && result.data) {
          const exportData = result.data.data || result.data;
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${action}-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
        // 刷新数据
        loadDashboardStats();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('快速操作失败:', error);
      const errorMessage = error instanceof Error ? error.message : '操作失败，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setQuickActionLoading(null);
    }
  };

  // 批量审核操作
  const handleBatchReview = async () => {
    if (!batchNotes.trim()) {
      toast.error('请填写审核备注');
      return;
    }

    const action = batchAction === 'approve' ? 'approve_all_pending' : 'reject_all_pending';
    await handleQuickAction(action, {
      reason: batchNotes,
    });

    setShowBatchDialog(false);
    setBatchNotes('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (growth < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <DefaultLayout>
        <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="bg-gray-50">
        {/* 头部 */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <Link
                  href={route(routes.BUSINESS.HOME)}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                  title="返回首页"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  <span className="text-sm">返回首页</span>
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">管理员仪表盘</h1>
                  <p className="text-gray-600">OpenAero 平台管理中心</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* 时间范围选择 */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">时间范围:</span>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1"
                  >
                    <option value="7">最近7天</option>
                    <option value="30">最近30天</option>
                    <option value="90">最近90天</option>
                  </select>
                </div>
                <Button onClick={loadDashboardStats} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新数据
                </Button>
              </div>
            </div>
          </div>
        </div>

      {/* 导航标签 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="solutions">方案管理</TabsTrigger>
            <Link 
              href={route(routes.ADMIN.USERS)} 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-background hover:text-foreground"
            >
              用户管理
            </Link>
            <TabsTrigger value="analytics">数据分析</TabsTrigger>
          </TabsList>

          {/* 概览标签页 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 统计卡片 */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 方案总数 */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">方案总数</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.solutions.total.toLocaleString()}</div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      {getGrowthIcon(stats.growth.solutionsGrowth)}
                      <span className={getGrowthColor(stats.growth.solutionsGrowth)}>
                        {stats.growth.solutionsGrowth > 0 ? '+' : ''}{stats.growth.solutionsGrowth}%
                      </span>
                      <span>vs 上期</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 待审核方案 */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">待审核方案</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{stats.solutions.pending}</div>
                    <div className="text-xs text-muted-foreground">
                      平均审核时间: {stats.reviews.avgReviewTime}小时
                    </div>
                  </CardContent>
                </Card>

                {/* 用户总数 */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">用户总数</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      {getGrowthIcon(stats.growth.usersGrowth)}
                      <span className={getGrowthColor(stats.growth.usersGrowth)}>
                        {stats.growth.usersGrowth > 0 ? '+' : ''}{stats.growth.usersGrowth}%
                      </span>
                      <span>vs 上期</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 审核完成数 */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">审核完成数</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.reviews.totalReviews.toLocaleString()}</div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      {getGrowthIcon(stats.growth.reviewsGrowth)}
                      <span className={getGrowthColor(stats.growth.reviewsGrowth)}>
                        {stats.growth.reviewsGrowth > 0 ? '+' : ''}{stats.growth.reviewsGrowth}%
                      </span>
                      <span>vs 上期</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 快速操作区域 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  快速操作
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 批量审核 */}
                  <Button
                    onClick={() => setShowBatchDialog(true)}
                    disabled={quickActionLoading === 'approve_all_pending' || quickActionLoading === 'reject_all_pending'}
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <CheckCircle className="h-6 w-6" />
                    <span>批量审核</span>
                  </Button>

                  {/* 导出方案数据 */}
                  <Button
                    onClick={() => handleQuickAction('export_solutions', { status: 'APPROVED' })}
                    disabled={quickActionLoading === 'export_solutions'}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <Download className="h-6 w-6" />
                    <span>导出方案</span>
                  </Button>

                  {/* 导出用户数据 */}
                  <Button
                    onClick={() => handleQuickAction('export_users')}
                    disabled={quickActionLoading === 'export_users'}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <Users className="h-6 w-6" />
                    <span>导出用户</span>
                  </Button>

                  {/* 清理旧记录 */}
                  <Button
                    onClick={() => handleQuickAction('clear_old_reviews', { days: 90 })}
                    disabled={quickActionLoading === 'clear_old_reviews'}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <Trash2 className="h-6 w-6" />
                    <span>清理记录</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 分类统计 */}
            {stats && stats.categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>方案分类分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.categories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500" style={{
                            backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                          }}></div>
                          <span className="text-sm font-medium">{category.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{category.count}</span>
                          <Badge variant="secondary">{category.percentage.toFixed(1)}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 方案管理标签页 */}
          <TabsContent value="solutions" className="space-y-6">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      已批准方案
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{stats.solutions.approved}</div>
                    <p className="text-sm text-gray-600 mt-2">
                      占总数的 {((stats.solutions.approved / stats.solutions.total) * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                      待审核方案
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600">{stats.solutions.pending}</div>
                    <p className="text-sm text-gray-600 mt-2">
                      需要及时处理
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <XCircle className="h-5 w-5 mr-2 text-red-600" />
                      已拒绝方案
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">{stats.solutions.rejected}</div>
                    <p className="text-sm text-gray-600 mt-2">
                      占总数的 {((stats.solutions.rejected / stats.solutions.total) * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 状态趋势图占位符 */}
            <Card>
              <CardHeader>
                <CardTitle>审核状态趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>趋势图表组件</p>
                    <p className="text-sm">显示审核状态随时间的变化</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 用户管理标签页 - 已移除，改为直接链接到用户管理页面 */}

          {/* 数据分析标签页 */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>增长趋势分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>增长趋势图表</p>
                      <p className="text-sm">显示各项指标的增长情况</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>活动热力图</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>活动热力图</p>
                      <p className="text-sm">显示用户活动分布</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 批量审核对话框 */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量审核待审核方案</DialogTitle>
            <DialogDescription>
              选择审核操作并填写审核备注，将对所有待审核方案执行相同操作。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="action">审核操作</Label>
              <select
                id="action"
                value={batchAction}
                onChange={(e) => setBatchAction(e.target.value as 'approve' | 'reject')}
                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="approve">批准</option>
                <option value="reject">拒绝</option>
              </select>
            </div>
            <div>
              <Label htmlFor="notes">审核备注</Label>
              <Textarea
                id="notes"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                placeholder="请填写审核备注..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleBatchReview}
              disabled={(quickActionLoading === 'approve_all_pending' || quickActionLoading === 'reject_all_pending') || !batchNotes.trim()}
            >
              {(quickActionLoading === 'approve_all_pending' || quickActionLoading === 'reject_all_pending') ? '处理中...' : '确认审核'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DefaultLayout>
  );
}