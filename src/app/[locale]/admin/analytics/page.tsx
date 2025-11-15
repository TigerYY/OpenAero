'use client';

import { 
  Users, 
  FileText, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Progress from '@/components/ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { AdminLayout } from '@/components/layout/AdminLayout';


interface StatsOverview {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  solutions: {
    total: number;
    published: number;
    pending: number;
    approvalRate: number;
  };
  orders: {
    total: number;
    completed: number;
    pending: number;
    revenue: number;
  };
  reviews: {
    total: number;
    average: number;
    recent: number;
  };
}

interface ChartData {
  date: string;
  users: number;
  solutions: number;
  orders: number;
  revenue: number;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      
      // 模拟API调用 - 实际应该调用真实的API
      const mockStats: StatsOverview = {
        users: {
          total: 1250,
          active: 890,
          new: 45,
          growth: 12.5
        },
        solutions: {
          total: 320,
          published: 280,
          pending: 25,
          approvalRate: 87.5
        },
        orders: {
          total: 1580,
          completed: 1420,
          pending: 85,
          revenue: 245600
        },
        reviews: {
          total: 890,
          average: 4.3,
          recent: 23
        }
      };

      const mockChartData: ChartData[] = [
        { date: '2024-01', users: 120, solutions: 15, orders: 8, revenue: 5000 },
        { date: '2024-02', users: 180, solutions: 22, orders: 12, revenue: 7200 },
        { date: '2024-03', users: 250, solutions: 28, orders: 18, revenue: 9800 },
        { date: '2024-04', users: 320, solutions: 35, orders: 25, revenue: 12500 },
        { date: '2024-05', users: 420, solutions: 42, orders: 32, revenue: 15600 },
        { date: '2024-06', users: 520, solutions: 48, orders: 38, revenue: 18900 },
      ];
      
      // Generate additional data points if needed
       const additionalData = Array.from({ length: Math.max(0, 30 - mockChartData.length) }, (_, i) => {
         const date = new Date();
         date.setDate(date.getDate() - (29 - i - mockChartData.length));
         return {
           date: date.toISOString().split('T')[0],
           users: Math.floor(Math.random() * 100) + 50,
           solutions: Math.floor(Math.random() * 20) + 5,
           orders: Math.floor(Math.random() * 15) + 3,
           revenue: Math.floor(Math.random() * 5000) + 1000,
         };
       });
       
       const finalChartData = [...mockChartData, ...additionalData];

      setStats(mockStats);
      setChartData(finalChartData);
      
    } catch (error) {
      console.error('获取分析数据失败:', error);
      toast.error('获取分析数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportData = async (format: 'csv' | 'pdf') => {
    try {
      toast.success(`正在导出${format.toUpperCase()}格式数据...`);
      // 实际应该调用导出API
    } catch (error) {
      toast.error('导出失败');
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>加载分析数据中...</span>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">运营分析</h1>
          <p className="text-muted-foreground mt-2">
            平台关键业务指标和数据分析
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalyticsData()}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            导出CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            导出PDF
          </Button>
        </div>
      </div>

      {/* 时间范围选择 */}
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">时间范围:</span>
        <div className="flex space-x-1">
          {[
            { value: '7', label: '7天' },
            { value: '30', label: '30天' },
            { value: '90', label: '90天' },
            { value: '365', label: '1年' }
          ].map((period) => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period.value)}
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 关键指标卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 用户统计 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总用户数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>活跃用户: {stats.users.active}</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.users.growth > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(stats.users.growth)}%
                </Badge>
              </div>
              <Progress value={(stats.users.active / stats.users.total) * 100} className="mt-2" />
            </CardContent>
          </Card>

          {/* 方案统计 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总方案数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.solutions.total}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>已发布: {stats.solutions.published}</span>
                <span>待审核: {stats.solutions.pending}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">审核通过率</span>
                <span className="text-xs font-medium">{stats.solutions.approvalRate}%</span>
              </div>
              <Progress value={stats.solutions.approvalRate} className="mt-1" />
            </CardContent>
          </Card>

          {/* 订单统计 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总订单数</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orders.total.toLocaleString()}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>已完成: {stats.orders.completed}</span>
                <span>处理中: {stats.orders.pending}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">完成率</span>
                <span className="text-xs font-medium">
                  {((stats.orders.completed / stats.orders.total) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(stats.orders.completed / stats.orders.total) * 100} 
                className="mt-1" 
              />
            </CardContent>
          </Card>

          {/* 收入统计 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总收入</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{stats.orders.revenue.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                平均订单价值: ¥{(stats.orders.revenue / stats.orders.completed).toFixed(0)}
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs text-green-500">较上月增长 15.2%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 详细分析标签页 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            总览
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            用户分析
          </TabsTrigger>
          <TabsTrigger value="solutions">
            <FileText className="h-4 w-4 mr-2" />
            方案分析
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            订单分析
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <DollarSign className="h-4 w-4 mr-2" />
            收入分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>趋势分析</CardTitle>
                <CardDescription>
                  过去{selectedPeriod}天的关键指标趋势
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>图表组件待集成</p>
                    <p className="text-sm">可使用 Recharts 或 Chart.js</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>分布分析</CardTitle>
                <CardDescription>
                  各类别数据分布情况
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>饼图组件待集成</p>
                    <p className="text-sm">显示各状态分布比例</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>用户增长趋势</CardTitle>
              <CardDescription>
                用户注册和活跃度变化
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>用户分析图表</p>
                  <p className="text-sm">显示注册趋势、活跃度等</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solutions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>方案发布趋势</CardTitle>
              <CardDescription>
                方案创建和审核情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>方案分析图表</p>
                  <p className="text-sm">显示发布趋势、分类分布等</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>订单处理趋势</CardTitle>
              <CardDescription>
                订单创建和完成情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>订单分析图表</p>
                  <p className="text-sm">显示订单趋势、状态分布等</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>收入增长趋势</CardTitle>
              <CardDescription>
                收入变化和预测分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>收入分析图表</p>
                  <p className="text-sm">显示收入趋势、预测等</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}