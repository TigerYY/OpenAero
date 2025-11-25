'use client';

import {
  ShoppingCart,
  Star,
  Heart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  Plus,
  Minus,
  Eye,
  TrendingUp,
  Package,
  ArrowLeft,
  RefreshCw,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useRouting } from '@/lib/routing';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ProductComponent {
  id: string;
  category: string;
  name: string;
  specification: string;
  unitPrice: number;
  sortOrder: number;
}

interface ProductQuotationInfo {
  priceNotes: string[];
  features: string[];
  support: string[];
  service: string[];
  delivery: string[];
  payment: string[];
  validityDays: number;
  validityStartDate?: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDesc?: string;
  sku: string;
  brand?: string;
  model?: string;
  price: number;
  originalPrice?: number;
  images: string[];
  videos: string[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  color?: string;
  material?: string;
  rating?: number;
  reviewCount: number;
  salesCount: number;
  viewCount: number;
  isFeatured: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  solution?: {
    id: string;
    title: string;
    status: string;
  };
  components?: ProductComponent[];
  quotationInfo?: ProductQuotationInfo | null;
  reviews: Review[];
  relatedProducts: RelatedProduct[];
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  helpful: number;
  notHelpful: number;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  images: string[];
  rating?: number;
  reviewCount: number;
  inStock: boolean;
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { route, routes } = useRouting();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // 获取商品详情
  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('商品不存在');
        }
        throw new Error('获取商品详情失败');
      }

      const data = await response.json();
      // 支持统一响应格式和旧格式
      if (data.success && data.data) {
        setProduct(data.data.product || data.data);
      } else if (data.product) {
        setProduct(data.product);
      } else {
        setProduct(data);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('获取商品详情失败:', error);
      }
      toast.error(error instanceof Error ? error.message : '获取商品详情失败');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // 添加到购物车
  const handleAddToCart = () => {
    if (!product) return;

    // TODO: 实现添加到购物车逻辑（需要集成购物车Context）
    // addToCart({ id: product.id, name: product.name, price: product.price, quantity });
    toast.success(`已将 ${quantity} 个 ${product.name} 添加到购物车`);
  };

  // 立即购买
  const handleBuyNow = () => {
    if (!product) return;

    // TODO: 实现立即购买逻辑（需要先添加到购物车，然后跳转到结算页面）
    // addToCart({ id: product.id, name: product.name, price: product.price, quantity });
    // router.push(route(routes.ORDERS.HOME));
    toast.success('正在跳转到结算页面...');
  };

  // 添加到收藏
  const handleToggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? '已从收藏中移除' : '已添加到收藏');
  };

  // 分享商品
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.shortDesc,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('链接已复制到剪贴板');
    }
  };

  // 获取商品评分星星
  const renderStars = (rating?: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    if (!rating) return null;

    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`} />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star key='half' className={`${sizeClasses[size]} fill-yellow-400/50 text-yellow-400`} />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className={`${sizeClasses[size]} text-gray-300`} />);
    }

    return <div className='flex items-center gap-1'>{stars}</div>;
  };

  // 获取库存状态
  const getStockStatus = () => {
    // TODO: 从实际库存数据获取
    return { status: 'in-stock', label: '有库存', available: 50 };
  };

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug, fetchProduct]);

  if (loading) {
    return (
      <DefaultLayout>
        <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
          <div className='text-center'>
            <RefreshCw className='h-8 w-8 animate-spin text-blue-600 mx-auto mb-4' />
            <p className='text-gray-600'>加载中...</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (!product) {
    return (
      <DefaultLayout>
        <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
          <div className='text-center'>
            <Package className='h-16 w-16 text-gray-400 mx-auto mb-4' />
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>商品不存在</h2>
            <p className='text-gray-600 mb-4'>您访问的商品可能已下架或不存在</p>
            <Link href={route(routes.BUSINESS.SHOP)}>
              <Button
                variant='ghost'
                size='sm'
                className='flex items-center gap-2 text-gray-600 hover:text-gray-900'
              >
                <ArrowLeft className='h-4 w-4' />
                返回商品列表
              </Button>
            </Link>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  const stockStatus = getStockStatus();
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <DefaultLayout>
      <div className='min-h-screen bg-gray-50'>
        <div className='container mx-auto px-4 py-8'>
          {/* 面包屑导航 */}
          <nav className='flex items-center gap-2 text-sm text-gray-600 mb-6'>
            <Link href={route('/shop')} className='hover:text-blue-600'>
              商城
            </Link>
            <span>/</span>
            <Link href={route(routes.BUSINESS.SHOP)} className='hover:text-blue-600'>
              商品
            </Link>
            <span>/</span>
            <Link
              href={route(routes.BUSINESS.SHOP) + `?category=${product.category.slug}`}
              className='hover:text-blue-600'
            >
              {product.category.name}
            </Link>
            <span>/</span>
            <span className='text-gray-900'>{product.name}</span>
          </nav>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12'>
            {/* 商品图片 */}
            <div className='space-y-4'>
              <div className='relative bg-white rounded-lg overflow-hidden shadow-sm'>
                {product.images.length > 0 && (
                  <img
                    src={product.images[selectedImageIndex]}
                    alt={product.name}
                    className='w-full h-96 object-cover'
                  />
                )}
                {hasDiscount && (
                  <Badge className='absolute top-4 left-4 bg-red-500 text-white'>
                    -{discountPercent}%
                  </Badge>
                )}
                {product.isFeatured && (
                  <Badge className='absolute top-4 right-4 bg-yellow-500 text-white'>
                    <Star className='h-3 w-3 mr-1' />
                    推荐
                  </Badge>
                )}

                {/* 图片导航 */}
                {product.images.length > 1 && (
                  <>
                    <Button
                      variant='outline'
                      size='sm'
                      className='absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80'
                      onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                      disabled={selectedImageIndex === 0}
                    >
                      <ChevronLeft className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80'
                      onClick={() =>
                        setSelectedImageIndex(
                          Math.min(product.images.length - 1, selectedImageIndex + 1)
                        )
                      }
                      disabled={selectedImageIndex === product.images.length - 1}
                    >
                      <ChevronRight className='h-4 w-4' />
                    </Button>
                  </>
                )}
              </div>

              {/* 缩略图 */}
              {product.images.length > 1 && (
                <div className='flex gap-2 overflow-x-auto'>
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                        selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className='w-full h-full object-cover'
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 商品信息 */}
            <div className='space-y-6'>
              <div>
                <Badge variant='outline' className='mb-2'>
                  {product.category.name}
                </Badge>
                <h1 className='text-3xl font-bold text-gray-900 mb-2'>{product.name}</h1>
                {product.shortDesc && <p className='text-gray-600 text-lg'>{product.shortDesc}</p>}
              </div>

              {/* 评分和统计 */}
              <div className='flex items-center gap-6'>
                {product.rating && (
                  <div className='flex items-center gap-2'>
                    {renderStars(product.rating, 'lg')}
                    <span className='text-lg font-medium'>{product.rating}</span>
                    <span className='text-gray-500'>({product.reviewCount} 评价)</span>
                  </div>
                )}
                <div className='flex items-center gap-4 text-sm text-gray-500'>
                  <div className='flex items-center gap-1'>
                    <TrendingUp className='h-4 w-4' />
                    <span>销量 {product.salesCount}</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Eye className='h-4 w-4' />
                    <span>浏览 {product.viewCount}</span>
                  </div>
                </div>
              </div>

              {/* 价格 */}
              <div className='space-y-2'>
                <div className='flex items-baseline gap-3'>
                  <span className='text-3xl font-bold text-red-600'>
                    {formatCurrency(product.price)}
                  </span>
                  {hasDiscount && (
                    <span className='text-xl text-gray-500 line-through'>
                      {formatCurrency(product.originalPrice!)}
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-4 text-sm'>
                  <span
                    className={`font-medium ${
                      stockStatus.status === 'in-stock' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stockStatus.label}
                  </span>
                  {stockStatus.status === 'in-stock' && (
                    <span className='text-gray-500'>库存 {stockStatus.available} 件</span>
                  )}
                </div>
              </div>

              {/* 商品属性 */}
              <div className='space-y-3'>
                {product.brand && (
                  <div className='flex items-center gap-3'>
                    <span className='text-gray-600 w-16'>品牌:</span>
                    <span className='font-medium'>{product.brand}</span>
                  </div>
                )}
                {product.model && (
                  <div className='flex items-center gap-3'>
                    <span className='text-gray-600 w-16'>型号:</span>
                    <span className='font-medium'>{product.model}</span>
                  </div>
                )}
                {product.sku && (
                  <div className='flex items-center gap-3'>
                    <span className='text-gray-600 w-16'>SKU:</span>
                    <span className='font-medium'>{product.sku}</span>
                  </div>
                )}
                {product.color && (
                  <div className='flex items-center gap-3'>
                    <span className='text-gray-600 w-16'>颜色:</span>
                    <span className='font-medium'>{product.color}</span>
                  </div>
                )}
                {product.material && (
                  <div className='flex items-center gap-3'>
                    <span className='text-gray-600 w-16'>材质:</span>
                    <span className='font-medium'>{product.material}</span>
                  </div>
                )}
              </div>

              {/* 数量选择 */}
              <div className='flex items-center gap-4'>
                <span className='text-gray-600'>数量:</span>
                <div className='flex items-center border border-gray-300 rounded'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className='h-4 w-4' />
                  </Button>
                  <span className='px-4 py-2 min-w-[60px] text-center'>{quantity}</span>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setQuantity(Math.min(stockStatus.available, quantity + 1))}
                    disabled={quantity >= stockStatus.available}
                  >
                    <Plus className='h-4 w-4' />
                  </Button>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className='space-y-3'>
                <div className='flex gap-3'>
                  <Button
                    className='flex-1'
                    onClick={handleAddToCart}
                    disabled={stockStatus.status !== 'in-stock'}
                  >
                    <ShoppingCart className='h-4 w-4 mr-2' />
                    加入购物车
                  </Button>
                  <Button
                    variant='outline'
                    onClick={handleToggleWishlist}
                    className={isWishlisted ? 'text-red-600 border-red-600' : ''}
                  >
                    <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant='outline' onClick={handleShare}>
                    <Share2 className='h-4 w-4' />
                  </Button>
                </div>
                <Button
                  variant='default'
                  className='w-full bg-orange-600 hover:bg-orange-700'
                  onClick={handleBuyNow}
                  disabled={stockStatus.status !== 'in-stock'}
                >
                  立即购买
                </Button>
              </div>

              {/* 服务保障 */}
              <div className='grid grid-cols-3 gap-4 pt-4 border-t'>
                <div className='text-center'>
                  <Truck className='h-6 w-6 text-blue-600 mx-auto mb-1' />
                  <div className='text-xs text-gray-600'>免费配送</div>
                </div>
                <div className='text-center'>
                  <Shield className='h-6 w-6 text-green-600 mx-auto mb-1' />
                  <div className='text-xs text-gray-600'>品质保证</div>
                </div>
                <div className='text-center'>
                  <RotateCcw className='h-6 w-6 text-purple-600 mx-auto mb-1' />
                  <div className='text-xs text-gray-600'>7天退换</div>
                </div>
              </div>
            </div>
          </div>

          {/* 详细信息标签页 */}
          <Card className='mb-12'>
            <Tabs defaultValue='components' className='w-full'>
              <TabsList className='grid w-full grid-cols-5'>
                <TabsTrigger value='components'>配置清单</TabsTrigger>
                <TabsTrigger value='description'>商品详情</TabsTrigger>
                <TabsTrigger value='specifications'>规格参数</TabsTrigger>
                <TabsTrigger value='reviews'>用户评价 ({product.reviewCount})</TabsTrigger>
                <TabsTrigger value='quotation'>报价说明</TabsTrigger>
              </TabsList>

              <TabsContent value='components' className='p-6'>
                {product.components && product.components.length > 0 ? (
                  <div className='space-y-6'>
                    <div className='flex items-center justify-between mb-4'>
                      <h3 className='text-xl font-bold text-gray-900'>产品配置清单</h3>
                      <div className='text-lg font-semibold text-primary-600'>
                        配置总价: {formatCurrency(product.price)}
                      </div>
                    </div>
                    <div className='overflow-x-auto'>
                      <table className='w-full border-collapse'>
                        <thead>
                          <tr className='bg-gradient-to-r from-gray-800 to-gray-700 text-white'>
                            <th
                              className='px-4 py-3 text-left text-sm font-semibold'
                              style={{ width: '18%' }}
                            >
                              部件分类
                            </th>
                            <th
                              className='px-4 py-3 text-left text-sm font-semibold'
                              style={{ width: '15%' }}
                            >
                              部件名称
                            </th>
                            <th
                              className='px-4 py-3 text-left text-sm font-semibold'
                              style={{ width: '52%' }}
                            >
                              规格说明
                            </th>
                            <th
                              className='px-4 py-3 text-right text-sm font-semibold'
                              style={{ width: '15%' }}
                            >
                              单价（元）
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.components.map((component, index) => {
                            const categoryChanged =
                              index === 0 ||
                              product.components![index - 1].category !== component.category;
                            return (
                              <tr
                                key={component.id}
                                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                              >
                                <td className='px-4 py-3 text-sm font-semibold text-blue-600'>
                                  {categoryChanged ? component.category : ''}
                                </td>
                                <td className='px-4 py-3 text-sm text-gray-900'>
                                  {component.name}
                                </td>
                                <td className='px-4 py-3 text-sm text-gray-700'>
                                  {component.specification}
                                </td>
                                <td className='px-4 py-3 text-sm text-right font-semibold text-red-600'>
                                  {component.unitPrice > 0
                                    ? formatCurrency(component.unitPrice)
                                    : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className='bg-gray-100 font-bold'>
                            <td colSpan={3} className='px-4 py-3 text-right text-gray-900'>
                              配置总价：
                            </td>
                            <td className='px-4 py-3 text-right text-lg text-red-600'>
                              {formatCurrency(product.price)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>暂无配置清单信息</div>
                )}
              </TabsContent>

              <TabsContent value='description' className='p-6'>
                <div className='prose max-w-none'>
                  {product.description ? (
                    <div dangerouslySetInnerHTML={{ __html: product.description }} />
                  ) : (
                    <p className='text-gray-600'>暂无详细描述</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value='specifications' className='p-6'>
                <div className='space-y-4'>
                  <h3 className='text-lg font-semibold'>基本参数</h3>
                  <div className='grid grid-cols-2 gap-4'>
                    {product.brand && (
                      <div className='flex justify-between py-2 border-b'>
                        <span className='text-gray-600'>品牌</span>
                        <span>{product.brand}</span>
                      </div>
                    )}
                    {product.model && (
                      <div className='flex justify-between py-2 border-b'>
                        <span className='text-gray-600'>型号</span>
                        <span>{product.model}</span>
                      </div>
                    )}
                    {product.weight && (
                      <div className='flex justify-between py-2 border-b'>
                        <span className='text-gray-600'>重量</span>
                        <span>{product.weight}kg</span>
                      </div>
                    )}
                    {product.dimensions && (
                      <div className='flex justify-between py-2 border-b'>
                        <span className='text-gray-600'>尺寸</span>
                        <span>
                          {product.dimensions.length} × {product.dimensions.width} ×{' '}
                          {product.dimensions.height} cm
                        </span>
                      </div>
                    )}
                    {product.color && (
                      <div className='flex justify-between py-2 border-b'>
                        <span className='text-gray-600'>颜色</span>
                        <span>{product.color}</span>
                      </div>
                    )}
                    {product.material && (
                      <div className='flex justify-between py-2 border-b'>
                        <span className='text-gray-600'>材质</span>
                        <span>{product.material}</span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='reviews' className='p-6'>
                <div className='space-y-6'>
                  {product.reviews.length > 0 ? (
                    product.reviews.map(review => (
                      <div key={review.id} className='border-b pb-4'>
                        <div className='flex items-start gap-4'>
                          <div className='w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center'>
                            {review.user.avatar ? (
                              <img
                                src={review.user.avatar}
                                alt={`${review.user.firstName} ${review.user.lastName}`}
                                className='w-full h-full rounded-full object-cover'
                              />
                            ) : (
                              <span className='text-sm font-medium'>
                                {review.user.firstName.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className='flex-1'>
                            <div className='flex items-center gap-2 mb-2'>
                              <span className='font-medium'>
                                {review.user.firstName} {review.user.lastName}
                              </span>
                              {renderStars(review.rating)}
                              <span className='text-sm text-gray-500'>
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                            {review.comment && (
                              <p className='text-gray-700 mb-2'>{review.comment}</p>
                            )}
                            <div className='flex items-center gap-4 text-sm text-gray-500'>
                              <button className='flex items-center gap-1 hover:text-blue-600'>
                                <ThumbsUp className='h-3 w-3' />
                                有用 ({review.helpful})
                              </button>
                              <button className='flex items-center gap-1 hover:text-blue-600'>
                                <ThumbsDown className='h-3 w-3' />
                                无用 ({review.notHelpful})
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className='text-center py-8'>
                      <MessageCircle className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                      <p className='text-gray-600'>暂无用户评价</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value='quotation' className='p-6'>
                {product.quotationInfo ? (
                  <div className='space-y-8'>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                      {/* 价格说明 */}
                      {product.quotationInfo.priceNotes &&
                        product.quotationInfo.priceNotes.length > 0 && (
                          <div className='bg-white border border-gray-200 rounded-lg p-6 shadow-sm'>
                            <h3 className='text-lg font-bold text-gray-900 mb-4 flex items-center gap-2'>
                              <span className='text-2xl'>💰</span>
                              价格说明
                            </h3>
                            <ul className='space-y-2'>
                              {product.quotationInfo.priceNotes.map((note, index) => (
                                <li
                                  key={index}
                                  className='text-sm text-gray-700 flex items-start gap-2'
                                >
                                  <span className='text-primary-600 font-bold mt-1'>✓</span>
                                  <span>{note}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* 产品特点 */}
                      {product.quotationInfo.features &&
                        product.quotationInfo.features.length > 0 && (
                          <div className='bg-white border border-gray-200 rounded-lg p-6 shadow-sm'>
                            <h3 className='text-lg font-bold text-gray-900 mb-4 flex items-center gap-2'>
                              <span className='text-2xl'>⭐</span>
                              产品特点
                            </h3>
                            <ul className='space-y-2'>
                              {product.quotationInfo.features.map((feature, index) => (
                                <li
                                  key={index}
                                  className='text-sm text-gray-700 flex items-start gap-2'
                                >
                                  <span className='text-primary-600 font-bold mt-1'>✓</span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* 技术支持 */}
                      {product.quotationInfo.support &&
                        product.quotationInfo.support.length > 0 && (
                          <div className='bg-white border border-gray-200 rounded-lg p-6 shadow-sm'>
                            <h3 className='text-lg font-bold text-gray-900 mb-4 flex items-center gap-2'>
                              <span className='text-2xl'>🛠️</span>
                              技术支持
                            </h3>
                            <ul className='space-y-2'>
                              {product.quotationInfo.support.map((item, index) => (
                                <li
                                  key={index}
                                  className='text-sm text-gray-700 flex items-start gap-2'
                                >
                                  <span className='text-primary-600 font-bold mt-1'>✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* 售后服务 */}
                      {product.quotationInfo.service &&
                        product.quotationInfo.service.length > 0 && (
                          <div className='bg-white border border-gray-200 rounded-lg p-6 shadow-sm'>
                            <h3 className='text-lg font-bold text-gray-900 mb-4 flex items-center gap-2'>
                              <span className='text-2xl'>🔧</span>
                              售后服务
                            </h3>
                            <ul className='space-y-2'>
                              {product.quotationInfo.service.map((item, index) => (
                                <li
                                  key={index}
                                  className='text-sm text-gray-700 flex items-start gap-2'
                                >
                                  <span className='text-primary-600 font-bold mt-1'>✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* 交付周期 */}
                      {product.quotationInfo.delivery &&
                        product.quotationInfo.delivery.length > 0 && (
                          <div className='bg-white border border-gray-200 rounded-lg p-6 shadow-sm'>
                            <h3 className='text-lg font-bold text-gray-900 mb-4 flex items-center gap-2'>
                              <span className='text-2xl'>🚚</span>
                              交付周期
                            </h3>
                            <ul className='space-y-2'>
                              {product.quotationInfo.delivery.map((item, index) => (
                                <li
                                  key={index}
                                  className='text-sm text-gray-700 flex items-start gap-2'
                                >
                                  <span className='text-primary-600 font-bold mt-1'>✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* 付款方式 */}
                      {product.quotationInfo.payment &&
                        product.quotationInfo.payment.length > 0 && (
                          <div className='bg-white border border-gray-200 rounded-lg p-6 shadow-sm'>
                            <h3 className='text-lg font-bold text-gray-900 mb-4 flex items-center gap-2'>
                              <span className='text-2xl'>💳</span>
                              付款方式
                            </h3>
                            <ul className='space-y-2'>
                              {product.quotationInfo.payment.map((item, index) => (
                                <li
                                  key={index}
                                  className='text-sm text-gray-700 flex items-start gap-2'
                                >
                                  <span className='text-primary-600 font-bold mt-1'>✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>

                    {/* 报价有效期 */}
                    {product.quotationInfo.validityStartDate && (
                      <div className='mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                        <p className='text-sm text-gray-700'>
                          <span className='font-semibold'>报价有效期：</span>
                          {product.quotationInfo.validityDays}天（自{' '}
                          {new Date(product.quotationInfo.validityStartDate).toLocaleDateString(
                            'zh-CN'
                          )}{' '}
                          起）
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>暂无报价说明信息</div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* 相关商品 */}
          {product.relatedProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>相关商品</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                  {product.relatedProducts.map(relatedProduct => (
                    <Link
                      key={relatedProduct.id}
                      href={route(
                        routes.BUSINESS.PRODUCT_DETAIL.replace('[slug]', relatedProduct.slug)
                      )}
                      className='group'
                    >
                      <Card className='h-full hover:shadow-lg transition-shadow duration-300'>
                        <div className='relative'>
                          {relatedProduct.images.length > 0 && (
                            <img
                              src={relatedProduct.images[0]}
                              alt={relatedProduct.name}
                              className='w-full h-40 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300'
                            />
                          )}
                          {relatedProduct.originalPrice &&
                            relatedProduct.originalPrice > relatedProduct.price && (
                              <Badge className='absolute top-2 left-2 bg-red-500 text-white'>
                                -
                                {Math.round(
                                  ((relatedProduct.originalPrice - relatedProduct.price) /
                                    relatedProduct.originalPrice) *
                                    100
                                )}
                                %
                              </Badge>
                            )}
                        </div>
                        <CardContent className='p-4'>
                          <h3 className='font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors'>
                            {relatedProduct.name}
                          </h3>

                          {relatedProduct.rating && (
                            <div className='flex items-center gap-1 mb-2'>
                              {renderStars(relatedProduct.rating, 'sm')}
                              <span className='text-xs text-gray-500'>
                                ({relatedProduct.reviewCount})
                              </span>
                            </div>
                          )}

                          <div className='flex items-center justify-between'>
                            <div>
                              <span className='font-bold text-red-600'>
                                {formatCurrency(relatedProduct.price)}
                              </span>
                              {relatedProduct.originalPrice &&
                                relatedProduct.originalPrice > relatedProduct.price && (
                                  <span className='text-sm text-gray-500 line-through ml-2'>
                                    {formatCurrency(relatedProduct.originalPrice)}
                                  </span>
                                )}
                            </div>
                            <span
                              className={`text-xs ${relatedProduct.inStock ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {relatedProduct.inStock ? '有库存' : '缺货'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
}
