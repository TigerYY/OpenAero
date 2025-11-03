'use client';

import { Calendar, Package, CreditCard, Search, Filter, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';


interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  solutions: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
    subtotal: number;
    images: string[];
    creator: {
      displayName: string;
      avatar?: string;
    };
  }>;
  products: Array<{
    id: string;
    name: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    images: string[];
  }>;
  payment: {
    method: string;
    status: string;
    amount: number;
    paidAt?: string;
  } | null;
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<OrdersResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // 获取订单列表
  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.data.orders);
        setPagination(data.data.pagination);
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
    if (session) {
      fetchOrders(currentPage);
    }
  }, [session, currentPage, statusFilter]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800';
      case 'SHIPPED':
        return 'bg-indigo-100 text-indigo-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '待确认';
      case 'CONFIRMED':
        return '已确认';
      case 'PROCESSING':
        return '处理中';
      case 'SHIPPED':
        return '已发货';
      case 'DELIVERED':
        return '已送达';
      case 'CANCELLED':
        return '已取消';
      case 'REFUNDED':
        return '已退款';
      default:
        return status;
    }
  };

  // 获取支付状态颜色
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 过滤订单
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(searchLower) ||
      order.solutions.some(solution => 
        solution.title.toLowerCase().includes(searchLower) ||
        solution.creator.displayName.toLowerCase().includes(searchLower)
      ) ||
      order.products.some(product => 
        product.name.toLowerCase().includes(searchLower)
      )
    );
  });

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="text-lg text-gray-600">加载订单列表中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-4">{error}</div>
            <Button onClick={() => fetchOrders(currentPage)} variant="outline">
              重新加载
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">我的订单</h1>
        <p className="text-gray-600">管理您的所有订单和购买记录</p>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索订单号、方案名称或创作者..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="订单状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部状态</SelectItem>
                  <SelectItem value="PENDING">待确认</SelectItem>
                  <SelectItem value="CONFIRMED">已确认</SelectItem>
                  <SelectItem value="PROCESSING">处理中</SelectItem>
                  <SelectItem value="SHIPPED">已发货</SelectItem>
                  <SelectItem value="DELIVERED">已送达</SelectItem>
                  <SelectItem value="CANCELLED">已取消</SelectItem>
                  <SelectItem value="REFUNDED">已退款</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <div className="space-y-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <CardTitle className="text-lg">
                        订单号: {order.orderNumber || order.id.slice(0, 8)}
                      </CardTitle>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(order.createdAt)}
                        </div>
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-1" />
                          {order.solutions.length + order.products.length} 项商品
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                    {order.payment && (
                      <Badge className={getPaymentStatusColor(order.payment.status)}>
                        <CreditCard className="h-3 w-3 mr-1" />
                        {order.payment.status === 'COMPLETED' ? '已支付' : 
                         order.payment.status === 'PENDING' ? '待支付' : '支付失败'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* 方案列表 */}
                {order.solutions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">方案</h4>
                    <div className="space-y-3">
                      {order.solutions.map((solution) => (
                        <div key={solution.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          {solution.images.length > 0 && (
                            <img
                              src={solution.images[0]}
                              alt={solution.title}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{solution.title}</h5>
                            <p className="text-sm text-gray-500">
                              创作者: {solution.creator.displayName}
                            </p>
                            <div className="flex items-center space-x-4 mt-1 text-sm">
                              <span>数量: {solution.quantity}</span>
                              <span>单价: {formatCurrency(solution.price)}</span>
                              <span className="font-medium">小计: {formatCurrency(solution.subtotal)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 商品列表 */}
                {order.products.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">商品</h4>
                    <div className="space-y-3">
                      {order.products.map((product) => (
                        <div key={product.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          {product.images.length > 0 && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{product.name}</h5>
                            <div className="flex items-center space-x-4 mt-1 text-sm">
                              <span>数量: {product.quantity}</span>
                              <span>单价: {formatCurrency(product.unitPrice)}</span>
                              <span className="font-medium">小计: {formatCurrency(product.totalPrice)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 订单总计和操作 */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-lg font-semibold">
                    总计: {formatCurrency(order.total)}
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        查看详情
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无订单</h3>
              <p className="text-gray-500 mb-4">您还没有任何订单记录</p>
              <Link href="/solutions">
                <Button>
                  浏览方案
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 分页 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={!pagination.hasPrevPage}
          >
            上一页
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}