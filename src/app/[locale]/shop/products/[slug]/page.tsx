'use client';
import { useRouting } from '@/lib/routing';

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
  Zap,
  Award,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { formatCurrency, formatDate } from '@/lib/utils';

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
  const t = useTranslations();
  const locale = useLocale();
  const { route } = useRouting();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // 获取商品详情
  const fetchProduct = async () => {
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
      setProduct(data.product);
    } catch (error) {
      console.error('获取商品详情失败:', error);
      toast.error(error instanceof Error ? error.message : '获取商品详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加到购物车
  const handleAddToCart = () => {
    if (!product) return;
    
    // TODO: 实现添加到购物车逻辑
    toast.success(`已将 ${quantity} 个 ${product.name} 添加到购物车`);
  };

  // 立即购买
  const handleBuyNow = () => {
    if (!product) return;
    
    // TODO: 实现立即购买逻辑
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
      lg: 'h-5 w-5'
    };
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`} />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className={`${sizeClasses[size]} fill-yellow-400/50 text-yellow-400`} />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className={`${sizeClasses[size]} text-gray-300`} />);
    }

    return <div className="flex items-center gap-1">{stars}</div>;
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
  }, [slug]);

  if (loading) {
    return (
      <MainLayout locale="zh-CN">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout locale="zh-CN">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">商品不存在</h2>
            <p className="text-gray-600 mb-4">您访问的商品可能已下架或不存在</p>
            <Link href={route('/shop/products')}>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                返回商品列表
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const stockStatus = getStockStatus();
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <MainLayout locale="zh-CN">
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* 面包屑导航 */}
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <Link href={`/${locale}/shop`} className="hover:text-blue-600">商城</Link>
            <span>/</span>
            <Link href={`/${locale}/shop/products`} className="hover:text-blue-600">商品</Link>
            <span>/</span>
            <Link href={`/${locale}/shop/products?category=${product.category.slug}`} className="hover:text-blue-600">
              {product.category.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* 商品图片 */}
            <div className="space-y-4">
              <div className="relative bg-white rounded-lg overflow-hidden shadow-sm">
                {product.images.length > 0 && (
                  <img
                    src={product.images[selectedImageIndex]}
                    alt={product.name}
                    className="w-full h-96 object-cover"
                  />
                )}
                {hasDiscount && (
                  <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                    -{discountPercent}%
                  </Badge>
                )}
                {product.isFeatured && (
                  <Badge className="absolute top-4 right-4 bg-yellow-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    推荐
                  </Badge>
                )}
                
                {/* 图片导航 */}
                {product.images.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80"
                      onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                      disabled={selectedImageIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80"
                      onClick={() => setSelectedImageIndex(Math.min(product.images.length - 1, selectedImageIndex + 1))}
                      disabled={selectedImageIndex === product.images.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              
              {/* 缩略图 */}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
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
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 商品信息 */}
            <div className="space-y-6">
              <div>
                <Badge variant="outline" className="mb-2">
                  {product.category.name}
                </Badge>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                {product.shortDesc && (
                  <p className="text-gray-600 text-lg">{product.shortDesc}</p>
                )}
              </div>

              {/* 评分和统计 */}
              <div className="flex items-center gap-6">
                {product.rating && (
                  <div className="flex items-center gap-2">
                    {renderStars(product.rating, 'lg')}
                    <span className="text-lg font-medium">{product.rating}</span>
                    <span className="text-gray-500">({product.reviewCount} 评价)</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>销量 {product.salesCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>浏览 {product.viewCount}</span>
                  </div>
                </div>
              </div>

              {/* 价格 */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-red-600">
                    {formatCurrency(product.price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-xl text-gray-500 line-through">
                      {formatCurrency(product.originalPrice!)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`font-medium ${
                    stockStatus.status === 'in-stock' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stockStatus.label}
                  </span>
                  {stockStatus.status === 'in-stock' && (
                    <span className="text-gray-500">库存 {stockStatus.available} 件</span>
                  )}
                </div>
              </div>

              {/* 商品属性 */}
              <div className="space-y-3">
                {product.brand && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 w-16">品牌:</span>
                    <span className="font-medium">{product.brand}</span>
                  </div>
                )}
                {product.model && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 w-16">型号:</span>
                    <span className="font-medium">{product.model}</span>
                  </div>
                )}
                {product.sku && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 w-16">SKU:</span>
                    <span className="font-medium">{product.sku}</span>
                  </div>
                )}
                {product.color && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 w-16">颜色:</span>
                    <span className="font-medium">{product.color}</span>
                  </div>
                )}
                {product.material && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 w-16">材质:</span>
                    <span className="font-medium">{product.material}</span>
                  </div>
                )}
              </div>

              {/* 数量选择 */}
              <div className="flex items-center gap-4">
                <span className="text-gray-600">数量:</span>
                <div className="flex items-center border border-gray-300 rounded">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 min-w-[60px] text-center">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.min(stockStatus.available, quantity + 1))}
                    disabled={quantity >= stockStatus.available}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={handleAddToCart}
                    disabled={stockStatus.status !== 'in-stock'}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    加入购物车
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleToggleWishlist}
                    className={isWishlisted ? 'text-red-600 border-red-600' : ''}
                  >
                    <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="outline" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="default"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={handleBuyNow}
                  disabled={stockStatus.status !== 'in-stock'}
                >
                  立即购买
                </Button>
              </div>

              {/* 服务保障 */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <Truck className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <div className="text-xs text-gray-600">免费配送</div>
                </div>
                <div className="text-center">
                  <Shield className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <div className="text-xs text-gray-600">品质保证</div>
                </div>
                <div className="text-center">
                  <RotateCcw className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                  <div className="text-xs text-gray-600">7天退换</div>
                </div>
              </div>
            </div>
          </div>

          {/* 详细信息标签页 */}
          <Card className="mb-12">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="description">商品详情</TabsTrigger>
                <TabsTrigger value="specifications">规格参数</TabsTrigger>
                <TabsTrigger value="reviews">用户评价 ({product.reviewCount})</TabsTrigger>
                <TabsTrigger value="shipping">配送说明</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="p-6">
                <div className="prose max-w-none">
                  {product.description ? (
                    <div dangerouslySetInnerHTML={{ __html: product.description }} />
                  ) : (
                    <p className="text-gray-600">暂无详细描述</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="specifications" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">基本参数</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {product.brand && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">品牌</span>
                        <span>{product.brand}</span>
                      </div>
                    )}
                    {product.model && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">型号</span>
                        <span>{product.model}</span>
                      </div>
                    )}
                    {product.weight && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">重量</span>
                        <span>{product.weight}kg</span>
                      </div>
                    )}
                    {product.dimensions && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">尺寸</span>
                        <span>
                          {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} cm
                        </span>
                      </div>
                    )}
                    {product.color && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">颜色</span>
                        <span>{product.color}</span>
                      </div>
                    )}
                    {product.material && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">材质</span>
                        <span>{product.material}</span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="reviews" className="p-6">
                <div className="space-y-6">
                  {product.reviews.length > 0 ? (
                    product.reviews.map((review) => (
                      <div key={review.id} className="border-b pb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {review.user.avatar ? (
                              <img
                                src={review.user.avatar}
                                alt={`${review.user.firstName} ${review.user.lastName}`}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium">
                                {review.user.firstName.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">
                                {review.user.firstName} {review.user.lastName}
                              </span>
                              {renderStars(review.rating)}
                              <span className="text-sm text-gray-500">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-gray-700 mb-2">{review.comment}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <button className="flex items-center gap-1 hover:text-blue-600">
                                <ThumbsUp className="h-3 w-3" />
                                有用 ({review.helpful})
                              </button>
                              <button className="flex items-center gap-1 hover:text-blue-600">
                                <ThumbsDown className="h-3 w-3" />
                                无用 ({review.notHelpful})
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">暂无用户评价</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="shipping" className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">配送信息</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-blue-600" />
                        <span>全国包邮，部分偏远地区除外</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-green-600" />
                        <span>48小时内发货，3-7个工作日送达</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-purple-600" />
                        <span>支持货到付款，安全可靠</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">售后服务</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-yellow-600" />
                        <span>7天无理由退换货</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-green-600" />
                        <span>1年质量保证</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-blue-600" />
                        <span>24小时客服支持</span>
                      </div>
                    </div>
                  </div>
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {product.relatedProducts.map((relatedProduct) => (
                    <Link key={relatedProduct.id} href={`/shop/products/${relatedProduct.slug}`} className="group">
                      <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                        <div className="relative">
                          {relatedProduct.images.length > 0 && (
                            <img
                              src={relatedProduct.images[0]}
                              alt={relatedProduct.name}
                              className="w-full h-40 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          {relatedProduct.originalPrice && relatedProduct.originalPrice > relatedProduct.price && (
                            <Badge className="absolute top-2 left-2 bg-red-500 text-white">
                              -{Math.round(((relatedProduct.originalPrice - relatedProduct.price) / relatedProduct.originalPrice) * 100)}%
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {relatedProduct.name}
                          </h3>
                          
                          {relatedProduct.rating && (
                            <div className="flex items-center gap-1 mb-2">
                              {renderStars(relatedProduct.rating, 'sm')}
                              <span className="text-xs text-gray-500">({relatedProduct.reviewCount})</span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-red-600">
                                {formatCurrency(relatedProduct.price)}
                              </span>
                              {relatedProduct.originalPrice && relatedProduct.originalPrice > relatedProduct.price && (
                                <span className="text-sm text-gray-500 line-through ml-2">
                                  {formatCurrency(relatedProduct.originalPrice)}
                                </span>
                              )}
                            </div>
                            <span className={`text-xs ${relatedProduct.inStock ? 'text-green-600' : 'text-red-600'}`}>
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
    </MainLayout>
  );
}