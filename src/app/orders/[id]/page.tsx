'use client';

import { 
  ArrowLeft, 
  Calendar, 
  Package, 
  CreditCard, 
  User, 
  MapPin, 
  Download,
  FileText,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useState, useEffect } from 'react';
import { useRouting } from '@/lib/routing';

import PaymentRetry from '@/components/PaymentRetry';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';


interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  shippingAddress?: any;
  billingAddress?: any;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  solutions: Array<{
    id: string;
    title: string;
    description: string;
    price: number;
    quantity: number;
    subtotal: number;
    images: string[];
    tags: string[];
    creator: {
      id: string;
      displayName: string;
      avatar?: string;
      contactEmail?: string;
    };
    files: Array<{
      id: string;
      filename: string;
      originalName: string;
      fileType: string;
      fileSize: number;
      url: string;
    }>;
  }>;
  products: Array<{
    id: string;
    name: string;
    description: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    images: string[];
    category: {
      id: string;
      name: string;
    };
  }>;
  payments: Array<{
    id: string;
    method: string;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    externalId?: string;
    paidAt?: string;
    failureReason?: string;
    refundAmount?: number;
    refundedAt?: string;
    createdAt: string;
  }>;
  revenueShares: Array<{
    id: string;
    totalAmount: number;
    platformFee: number;
    creatorRevenue: number;
    status: string;
    settledAt?: string;
    withdrawnAt?: string;
    creator: {
      id: string;
      displayName: string;
      avatar?: string;
    };
    solution: {
      id: string;
      title: string;
    };
  }>;
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { route, routes } = useRouting();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryInfo, setRetryInfo] = useState<any>(null);



  // 获取订单详情
  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/orders/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data.data);
      } else if (response.status === 404) {
        setError('订单不存在');
        setTimeout(() => router.push(route(routes.ORDERS.HOME)), 2000);
      } else {
        setError('获取订单详情失败，请稍后重试');
      }
    } catch (error) {
      console.error('获取订单详情失败:', error);
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 处理支付重试
  const handlePaymentRetry = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // 重新获取订单详情
        await fetchOrderDetail();
        
        // 根据支付方式处理支付
        if (data.data.paymentUrl) {
          window.open(data.data.paymentUrl, '_blank');
        } else if (data.data.qrCode) {
          // 显示二维码支付
          console.log('二维码支付:', data.data.qrCode);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '支付重试失败');
      }
    } catch (error) {
      console.error('支付重试失败:', error);
      throw error; // 重新抛出错误，让PaymentRetry组件处理
    }
  };

  // 检查支付状态
  const handlePaymentStatusCheck = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/status`);
      if (response.ok) {
        // 重新获取订单详情
        await fetchOrderDetail();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '检查支付状态失败');
      }
    } catch (error) {
      console.error('检查支付状态失败:', error);
      throw error; // 重新抛出错误，让PaymentRetry组件处理
    }
  };

  // 获取支付重试信息
  const fetchPaymentRetryInfo = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/retry`);
      if (response.ok) {
        const data = await response.json();
        setRetryInfo(data.data.retryInfo);
      }
    } catch (error) {
      console.error('获取支付重试信息失败:', error);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchOrderDetail();
    }
  }, [params.id]);

  // 当订单有失败的支付时，获取重试信息
  useEffect(() => {
    if (order?.payments) {
      const failedPayment = order.payments.find(
        (payment: any) => payment.status === 'FAILED'
      );
      if (failedPayment) {
        fetchPaymentRetryInfo(failedPayment.id);
      }
    }
  }, [order]);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取文件图标
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    } else if (fileType.startsWith('video/')) {
      return <Video className="h-4 w-4" />;
    } else {
      return <FileText className="h-4 w-4" />;
    }
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
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="text-lg text-gray-600">加载订单详情中...</div>
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
            <Button onClick={fetchOrderDetail} variant="outline">
              重新加载
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link href={route('/orders')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回订单列表
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              订单详情
            </h1>
            <p className="text-gray-600 mt-2">
              订单号: {order.orderNumber || order.id.slice(0, 8)}
            </p>
          </div>
          <Badge className={getStatusColor(order.status)}>
            {getStatusText(order.status)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 主要内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 方案列表 */}
          {order.solutions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  购买的方案
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {order.solutions.map((solution) => (
                    <div key={solution.id} className="border rounded-lg p-6">
                      <div className="flex items-start space-x-4">
                        {solution.images.length > 0 && (
                          <img
                            src={solution.images[0]}
                            alt={solution.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {solution.title}
                          </h3>
                          <p className="text-gray-600 mb-3">{solution.description}</p>
                          
                          {/* 创作者信息 */}
                          <div className="flex items-center space-x-2 mb-3">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              创作者: {solution.creator.displayName}
                            </span>
                            {solution.creator.contactEmail && (
                              <span className="text-sm text-gray-500">
                                ({solution.creator.contactEmail})
                              </span>
                            )}
                          </div>

                          {/* 标签 */}
                          {solution.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {solution.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* 价格信息 */}
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              数量: {solution.quantity} × {formatCurrency(solution.price)}
                            </div>
                            <div className="text-lg font-semibold">
                              {formatCurrency(solution.subtotal)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 文件列表 */}
                      {solution.files.length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                          <h4 className="font-medium text-gray-900 mb-3">相关文件</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {solution.files.map((file) => (
                              <div key={file.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                {getFileIcon(file.fileType)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {file.originalName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(file.fileSize)}
                                  </p>
                                </div>
                                <Button size="sm" variant="outline" asChild>
                                  <a href={file.url} download target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 商品列表 */}
          {order.products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  购买的商品
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.products.map((product) => (
                    <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      {product.images.length > 0 && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-600">{product.description}</p>
                        <p className="text-xs text-gray-500">分类: {product.category.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm text-gray-600">
                            数量: {product.quantity} × {formatCurrency(product.unitPrice)}
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(product.totalPrice)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 支付记录 */}
          {order.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  支付记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.payments.map((payment) => (
                    <div key={payment.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getPaymentStatusColor(payment.status)}>
                            {payment.status === 'COMPLETED' ? '已支付' : 
                             payment.status === 'PENDING' ? '待支付' : 
                             payment.status === 'FAILED' ? '支付失败' : '已退款'}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {payment.method} · {payment.provider}
                          </span>
                        </div>
                        <div className="text-lg font-semibold">
                          {formatCurrency(payment.amount)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>创建时间: {formatDate(payment.createdAt)}</div>
                        {payment.paidAt && (
                          <div>支付时间: {formatDate(payment.paidAt)}</div>
                        )}
                        {payment.externalId && (
                          <div>交易号: {payment.externalId}</div>
                        )}
                        {payment.failureReason && (
                          <div className="text-red-600">失败原因: {payment.failureReason}</div>
                        )}
                        {payment.refundAmount && (
                          <div>
                            退款金额: {formatCurrency(payment.refundAmount)}
                            {payment.refundedAt && ` (${formatDate(payment.refundedAt)})`}
                          </div>
                        )}
                      </div>
                      
                      {/* 支付重试组件 */}
                          {payment.status === 'FAILED' && retryInfo && (
                            <div className="mt-4">
                              <PaymentRetry
                                payment={{
                                  id: payment.id,
                                  status: payment.status,
                                  amount: payment.amount,
                                  paymentMethod: payment.method,
                                  failureReason: payment.failureReason,
                                  createdAt: payment.createdAt
                                }}
                                retryInfo={retryInfo}
                                onRetry={() => handlePaymentRetry(payment.id)}
                                onStatusCheck={() => handlePaymentStatusCheck(payment.id)}
                              />
                            </div>
                          )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 订单摘要 */}
          <Card>
            <CardHeader>
              <CardTitle>订单摘要</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">创建时间</div>
                  <div className="font-medium">{formatDate(order.createdAt)}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">商品数量</div>
                  <div className="font-medium">
                    {order.solutions.length + order.products.length} 项
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />
              
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>订单总计</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 用户信息 */}
          <Card>
            <CardHeader>
              <CardTitle>用户信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                {order.user.avatar && (
                  <img
                    src={order.user.avatar}
                    alt={order.user.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <div className="font-medium">{order.user.name}</div>
                  <div className="text-sm text-gray-600">{order.user.email}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 地址信息 */}
          {(order.shippingAddress || order.billingAddress) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  地址信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.shippingAddress && (
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">收货地址</div>
                    <div className="text-sm text-gray-600">
                      {JSON.stringify(order.shippingAddress, null, 2)}
                    </div>
                  </div>
                )}
                
                {order.billingAddress && (
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">账单地址</div>
                    <div className="text-sm text-gray-600">
                      {JSON.stringify(order.billingAddress, null, 2)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 订单备注 */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>订单备注</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}