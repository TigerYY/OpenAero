'use client';

import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Calendar,
  Settings,
  Trash2,
  UserCheck
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
import { Textarea } from '@/components/ui/Textarea';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DashboardCharts } from '@/components/admin/DashboardCharts';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { AlertPanel } from '@/components/admin/AlertPanel';
import { ExportDialog, ExportParams } from '@/components/admin/ExportDialog';


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
  const { session, loading: authLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  
  // 快速操作状态
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchAction, setBatchAction] = useState<'approve' | 'reject'>('approve');
  const [batchNotes, setBatchNotes] = useState('');

  // 申请管理状态
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(60); // 秒 - 调整为60秒，减少刷新频率
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'solutions' | 'users'>('solutions');

  // 在页面加载时同步 session 到 cookies
  useEffect(() => {
    if (!authLoading && session?.access_token) {
      // 同步 session 到 cookies，以便服务器端 API 可以读取
      fetch('/api/auth/sync-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
        }),
      }).catch((error) => {
        console.warn('同步 session 到 cookies 失败:', error);
      });
    }
  }, [authLoading, session]);

  // 检查认证状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // 用户未登录，重定向到登录页面
      router.push('/zh-CN/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    // 只有在用户已认证时才加载数据
    if (!authLoading && isAuthenticated) {
      loadDashboardStats();
      loadPendingApplicationsCount();
      setLastRefreshTime(new Date());
    }
  }, [timeRange, authLoading, isAuthenticated]);

  // 自动刷新机制
  useEffect(() => {
    if (!autoRefresh || authLoading || !isAuthenticated) return;

    const interval = setInterval(() => {
      if (isAuthenticated) {
        loadDashboardStats();
        loadPendingApplicationsCount();
        setLastRefreshTime(new Date());
      }
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, authLoading, isAuthenticated]);

  // 获取待审核申请数量
  const loadPendingApplicationsCount = async () => {
    try {
      const response = await fetch('/api/admin/applications?status=PENDING', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // API 返回分页数据: { items: [...], pagination: {...} }
          const applications = result.data?.items || result.data || [];
          setPendingApplicationsCount(Array.isArray(applications) ? applications.length : 0);
        }
      }
    } catch (error) {
      console.error('获取待审核申请数量失败:', error);
    }
  };

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
        setLastRefreshTime(new Date());
      } else {
        // 兼容旧格式（直接返回数据）
        setStats(responseData);
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '加载数据失败，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 处理导出
  const handleExport = async (params: ExportParams) => {
    try {
      const action = params.type === 'solutions' ? 'export_solutions' : 'export_users';
      await handleQuickAction(action, {
        format: params.format,
        ...params.filters,
      });
    } catch (error) {
      console.error('导出失败:', error);
      throw error;
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

  // 骨架屏组件
  const SkeletonCard = () => (
    <Card>
      <CardHeader>
        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      </CardContent>
    </Card>
  );

  // 如果正在加载认证状态，显示加载中
  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">正在验证身份...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // 如果用户未认证，显示重定向提示（useEffect 会处理重定向）
  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600">正在重定向到登录页面...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-gray-50 min-h-screen">
        {/* 简洁的页面头部 */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
                <p className="text-gray-600 mt-1">平台数据概览和快速操作</p>
              </div>
              <div className="flex items-center space-x-4">
                {/* 时间范围选择 */}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1.5"
                  >
                    <option value="7">最近7天</option>
                    <option value="30">最近30天</option>
                    <option value="90">最近90天</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded"
                    />
                    自动刷新
                  </label>
                  <Button 
                    onClick={() => {
                      loadDashboardStats();
                      loadPendingApplicationsCount();
                      setLastRefreshTime(new Date());
                    }} 
                    variant="outline" 
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    刷新数据
                  </Button>
                  {lastRefreshTime && (
                    <span className="text-xs text-gray-500">
                      {lastRefreshTime.toLocaleTimeString('zh-CN')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* 内容区域 - 移除Tabs，使用简单的分区展示 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* 加载状态 - 骨架屏 */}
        {loading && !stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

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

            {/* 待审核申请卡片 */}
            {pendingApplicationsCount > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-yellow-800">
                    <UserCheck className="h-5 w-5 mr-2" />
                    待审核创作者申请
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-yellow-700">{pendingApplicationsCount}</p>
                    <p className="text-sm text-yellow-600 mt-1">个创作者申请等待审核</p>
                  </div>
                  <Link href={route(routes.ADMIN.APPLICATIONS)}>
                    <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                      立即审核
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

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
                    onClick={() => {
                      setExportType('solutions');
                      setShowExportDialog(true);
                    }}
                    disabled={quickActionLoading === 'export_solutions'}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <Download className="h-6 w-6" />
                    <span>导出方案</span>
                  </Button>

                  {/* 导出用户数据 */}
                  <Button
                    onClick={() => {
                      setExportType('users');
                      setShowExportDialog(true);
                    }}
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

            {/* 预警面板 */}
            {!loading && (
              <AlertPanel 
                className="col-span-full"
                autoRefresh={autoRefresh}
                refreshInterval={refreshInterval}
              />
            )}

            {/* 图表区域 */}
            {!loading && (
              <div className="col-span-full">
                <DashboardCharts timeRange={parseInt(timeRange)} />
              </div>
            )}

            {/* 活动流和分类统计 - 并排显示 */}
            {!loading && (
              <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 活动流 */}
                <ActivityFeed 
                  limit={10}
                  autoRefresh={autoRefresh}
                  refreshInterval={refreshInterval}
                />

                {/* 分类统计 */}
                {stats && stats.categories.length > 0 ? (
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
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      <p>暂无分类数据</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
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

      {/* 导出对话框 */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        exportType={exportType}
        onExport={handleExport}
      />
    </AdminLayout>
  );
}