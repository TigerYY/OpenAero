'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

// 订单状态类型
type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

// 订单接口
interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  orderSolutions: Array<{
    id: string;
    quantity: number;
    price: number;
    solution: {
      id: string;
      title: string;
      description: string;
      price: number;
      creator: {
        id: string;
        name: string;
      };
    };
  }>;
}

// API响应接口
interface OrdersResponse {
  data: {
    orders: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function OrdersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [activeTab, setActiveTab] = useState<'all' | OrderStatus>('all');

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, user, authLoading, router]);

  // 获取订单列表
  const fetchOrders = async (page = 1, status?: OrderStatus | 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (status && status !== 'all') {
        params.append('status', status);
      }

      const response = await fetch(`/api/orders?${params}`);
      if (response.ok) {
        const data: OrdersResponse = await response.json();
        setOrders(data.data.orders);
        setPagination({
          page: data.data.page,
          limit: data.data.limit,
          total: data.data.total,
          totalPages: data.data.totalPages,
        });
      } else {
        setError('获取订单列表失败，请稍后重试');
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchOrders(pagination.page, activeTab === 'all' ? undefined : activeTab);
    }
  }, [isAuthenticated, user, activeTab]);

  // 获取状态徽章样式
  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      PENDING: { label: '待付款', variant: 'secondary' as const, icon: Clock },
      PAID: { label: '已付款', variant: 'default' as const, icon: CheckCircle },
      PROCESSING: { label: '处理中', variant: 'default' as const, icon: RefreshCw },
      COMPLETED: { label: '已完成', variant: 'default' as const, icon: CheckCircle },
      CANCELLED: { label: '已取消', variant: 'destructive' as const, icon: XCircle },
      REFUNDED: { label: '已退款', variant: 'secondary' as const, icon: RefreshCw },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // 处理标签页切换
  const handleTabChange = (value: string) => {
    const newTab = value as 'all' | OrderStatus;
    setActiveTab(newTab);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchOrders(newPage, activeTab === 'all' ? undefined : activeTab);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">我的订单</h1>
        <p className="text-gray-600">查看和管理您的订单记录</p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="PENDING">待付款</TabsTrigger>
          <TabsTrigger value="PAID">已付款</TabsTrigger>
          <TabsTrigger value="PROCESSING">处理中</TabsTrigger>
          <TabsTrigger value="COMPLETED">已完成</TabsTrigger>
          <TabsTrigger value="CANCELLED">已取消</TabsTrigger>
          <TabsTrigger value="REFUNDED">已退款</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无订单</h3>
                  <p className="text-gray-500 mb-6">您还没有任何订单记录</p>
                  <Button onClick={() => router.push('/solutions')}>
                    浏览解决方案
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {orders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <CardTitle className="text-lg">订单号: {order.orderNumber}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            下单时间: {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(order.status)}
                        <span className="text-lg font-semibold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {order.orderSolutions.map((orderSolution) => (
                        <div key={orderSolution.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {orderSolution.solution.title}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              创作者: {orderSolution.solution.creator.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              数量: {orderSolution.quantity} × {formatCurrency(orderSolution.price)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              查看详情
                            </Button>
                            {order.status === 'COMPLETED' && (
                              <Button variant="outline" size="sm">
                                <Download className="w-4 h-4 mr-1" />
                                下载
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* 分页 */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    上一页
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    第 {pagination.page} 页，共 {pagination.totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}