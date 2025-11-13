'use client';

import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Download,
  RefreshCw,
  Search,
  Filter,
  FileDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRouting } from '@/lib/routing';
import { OrderStatus } from '@prisma/client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

import { formatCurrency, formatDate } from '@/lib/utils';

// 订单接口
interface Order {
  id: string;
  userId: string;
  orderNumber: string | null;
  status: OrderStatus;
  total: number | string;
  createdAt: string;
  updatedAt: string;
  orderSolutions: Array<{
    id: string;
    quantity: number;
    price: number | string;
    subtotal: number | string;
    solution: {
      id: string;
      title: string;
      images: string[];
    };
  }>;
  paymentTransactions?: Array<{
    id: string;
    paymentMethod: string;
    amount: number | string;
    status: string;
    createdAt: string;
  }>;
}

// API响应接口
interface OrdersResponse {
  success: boolean;
  data: Order[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const { route, routes } = useRouting();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');



  // 获取订单列表
  const fetchOrders = async (page = 1, status?: OrderStatus | 'all', search?: string) => {
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

      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/api/orders?${params}`);
      const data: OrdersResponse = await response.json();
      
      if (data.success) {
        setOrders(data.data);
        if (data.pagination) {
          setPagination({
            page: data.pagination.page,
            limit: data.pagination.limit,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages,
          });
        }
      } else {
        setError(data.message || '获取订单列表失败，请稍后重试');
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(pagination.page, activeTab === 'all' ? undefined : activeTab, searchQuery);
  }, [activeTab, searchQuery]);

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 处理导出
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: pagination.total.toString(),
      });

      if (activeTab !== 'all') {
        params.append('status', activeTab);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/orders/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('导出订单失败，请稍后重试');
      }
    } catch (error) {
      console.error('导出订单失败:', error);
      setError('导出订单失败，请检查网络连接');
    }
  };

  // 获取状态徽章样式
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: any }> = {
      PENDING: { label: '待处理', variant: 'secondary', icon: Clock },
      CONFIRMED: { label: '已确认', variant: 'default', icon: CheckCircle },
      PROCESSING: { label: '处理中', variant: 'default', icon: RefreshCw },
      SHIPPED: { label: '已发货', variant: 'default', icon: Package },
      DELIVERED: { label: '已送达', variant: 'default', icon: CheckCircle },
      CANCELLED: { label: '已取消', variant: 'destructive', icon: XCircle },
      REFUNDED: { label: '已退款', variant: 'secondary', icon: RefreshCw },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' as const, icon: Package };
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
    fetchOrders(newPage, activeTab === 'all' ? undefined : activeTab, searchQuery);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">我的订单</h1>
            <p className="text-gray-600">查看和管理您的订单记录</p>
          </div>
          {orders.length > 0 && (
            <Button onClick={handleExport} variant="outline">
              <FileDown className="w-4 h-4 mr-2" />
              导出订单
            </Button>
          )}
        </div>

        {/* 搜索和筛选 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="搜索订单号或备注..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">
                <Search className="w-4 h-4 mr-2" />
                搜索
              </Button>
              {searchQuery && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                >
                  清除
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {error && <ErrorMessage error={error} className="mb-6" />}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" message="加载订单列表..." />
        </div>
      ) : (

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="PENDING">待处理</TabsTrigger>
            <TabsTrigger value="CONFIRMED">已确认</TabsTrigger>
            <TabsTrigger value="PROCESSING">处理中</TabsTrigger>
            <TabsTrigger value="SHIPPED">已发货</TabsTrigger>
            <TabsTrigger value="DELIVERED">已送达</TabsTrigger>
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
                  <Button onClick={() => router.push(route(routes.BUSINESS.SOLUTIONS))}>
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
                          {formatCurrency(Number(order.total))}
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
                            <p className="text-sm text-gray-500">
                              数量: {orderSolution.quantity} × {formatCurrency(Number(orderSolution.price))}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(route(routes.ORDERS.DETAIL, { id: order.id }))}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              查看详情
                            </Button>
                            {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
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
      )}
    </div>
  );
}