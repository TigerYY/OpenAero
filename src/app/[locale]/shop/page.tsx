'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { 
  Search, 
  ShoppingCart, 
  Star, 
  TrendingUp, 
  Package, 
  Tag, 
  Filter,
  Grid,
  List,
  Heart,
  Eye,
  ArrowRight,
  Zap,
  Gift,
  Truck,
  Shield,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  shortDesc?: string;
  price: number;
  originalPrice?: number;
  images: string[];
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
  inventory?: {
    available: number;
  };
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount: number;
}

export default function ShopPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // 获取推荐商品
  const fetchFeaturedProducts = async () => {
    try {
      const response = await fetch('/api/products?featured=true&limit=8');
      if (!response.ok) throw new Error('获取推荐商品失败');

      const data = await response.json();
      setFeaturedProducts(data.products);
    } catch (error) {
      console.error('获取推荐商品失败:', error);
      toast.error('获取推荐商品失败');
    }
  };

  // 获取商品分类
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories?limit=8');
      if (!response.ok) throw new Error('获取分类失败');

      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('获取分类失败:', error);
      toast.error('获取分类失败');
    }
  };

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      window.location.href = `/${locale}/shop/products?search=${encodeURIComponent(searchTerm)}`;
    }
  };

  // 获取商品评分星星
  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }

    return <div className="flex items-center gap-1">{stars}</div>;
  };

  // 获取库存状态
  const getStockStatus = (inventory?: Product['inventory']) => {
    if (!inventory || inventory.available === 0) {
      return { status: 'out-of-stock', label: '缺货', color: 'text-red-600' };
    } else if (inventory.available <= 10) {
      return { status: 'low-stock', label: '库存不足', color: 'text-orange-600' };
    } else {
      return { status: 'in-stock', label: '有库存', color: 'text-green-600' };
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFeaturedProducts(), fetchCategories()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return (
    <MainLayout locale="zh-CN">
      <div className="min-h-screen bg-gray-50">
        {/* 英雄区域 */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                OpenAero 商城
              </h1>
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                发现优质航空产品，享受专业服务体验
              </p>
              
              {/* 搜索栏 */}
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="搜索商品、品牌、型号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-4 text-lg bg-white text-gray-900 border-0 rounded-full shadow-lg"
                  />
                  <Button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full px-6"
                  >
                    搜索
                  </Button>
                </div>
              </form>

              {/* 特色标签 */}
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Zap className="h-4 w-4 mr-1" />
                  快速发货
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Shield className="h-4 w-4 mr-1" />
                  品质保证
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Truck className="h-4 w-4 mr-1" />
                  全球配送
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Gift className="h-4 w-4 mr-1" />
                  专业服务
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* 商品分类 */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">商品分类</h2>
              <p className="text-gray-600 text-lg">浏览我们的产品类别，找到您需要的商品</p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">加载中...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/${locale}/shop/products?category=${category.slug}`}
                    className="group"
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 hover:border-blue-200">
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <Package className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {category.productCount} 个商品
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            <div className="text-center mt-8">
              <Link href={`/${locale}/shop/products`}>
                <Button variant="outline" className="flex items-center gap-2">
                  查看所有分类
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 推荐商品 */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">推荐商品</h2>
              <p className="text-gray-600 text-lg">精选优质商品，为您推荐最佳选择</p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">加载中...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.inventory);
                  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
                  const discountPercent = hasDiscount 
                    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
                    : 0;

                  return (
                    <Link key={product.id} href={`/${locale}/shop/products/${product.slug}`} className="group">
                      <Card className="h-full hover:shadow-xl transition-all duration-300 border hover:border-blue-200">
                        <div className="relative">
                          {product.images.length > 0 && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          {hasDiscount && (
                            <Badge className="absolute top-2 left-2 bg-red-500 text-white">
                              -{discountPercent}%
                            </Badge>
                          )}
                          {product.isFeatured && (
                            <Badge className="absolute top-2 right-2 bg-yellow-500 text-white">
                              <Star className="h-3 w-3 mr-1" />
                              推荐
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="mb-2">
                            <Badge variant="outline" className="text-xs">
                              {product.category.name}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </h3>
                          {product.shortDesc && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {product.shortDesc}
                            </p>
                          )}
                          
                          {/* 评分和统计 */}
                          <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
                            {product.rating && (
                              <div className="flex items-center gap-1">
                                {renderStars(product.rating)}
                                <span>({product.reviewCount})</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {product.salesCount}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {product.viewCount}
                            </div>
                          </div>

                          {/* 价格 */}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-lg font-bold text-red-600">
                                {formatCurrency(product.price)}
                              </span>
                              {hasDiscount && (
                                <span className="text-sm text-gray-500 line-through ml-2">
                                  {formatCurrency(product.originalPrice!)}
                                </span>
                              )}
                            </div>
                            <span className={`text-xs ${stockStatus.color}`}>
                              {stockStatus.label}
                            </span>
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex gap-2">
                            <Button 
                              className="flex-1" 
                              disabled={stockStatus.status === 'out-of-stock'}
                            >
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              {stockStatus.status === 'out-of-stock' ? '缺货' : '加入购物车'}
                            </Button>
                            <Button variant="outline" size="sm">
                              <Heart className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="text-center mt-8">
              <Link href="/shop/products">
                <Button className="flex items-center gap-2">
                  查看更多商品
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 服务特色 */}
        <section className="py-16 bg-gray-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">服务保障</h2>
              <p className="text-gray-600 text-lg">专业的服务团队，为您提供全方位保障</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">快速配送</h3>
                <p className="text-gray-600 text-sm">全球快速配送，确保商品及时到达</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">品质保证</h3>
                <p className="text-gray-600 text-sm">严格质量控制，确保商品品质</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                  <Gift className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">专业服务</h3>
                <p className="text-gray-600 text-sm">专业技术支持，贴心售后服务</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                  <Zap className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">快速响应</h3>
                <p className="text-gray-600 text-sm">24小时客服支持，快速响应需求</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}