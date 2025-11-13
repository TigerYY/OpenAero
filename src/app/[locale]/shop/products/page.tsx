'use client';

import { 
  Search, 
  ShoppingCart, 
  Star, 
  TrendingUp, 
  Eye,
  Grid,
  List,
  Heart,
  SlidersHorizontal,
  RefreshCw,
  Package,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';


import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DefaultLayout } from '@/components/layout/DefaultLayout';
import logger from '@/lib/logger';
import { formatCurrency } from '@/lib/utils';

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
  productCount: number;
}

interface FilterState {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  featured: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [filters, setFilters] = useState<FilterState>({
    search: searchParams?.get('search') || '',
    category: searchParams?.get('category') || '',
    minPrice: searchParams?.get('minPrice') || '',
    maxPrice: searchParams?.get('maxPrice') || '',
    inStock: searchParams?.get('inStock') === 'true',
    featured: searchParams?.get('featured') === 'true',
    sortBy: searchParams?.get('sortBy') || 'createdAt',
    sortOrder: (searchParams?.get('sortOrder') as 'asc' | 'desc') || 'desc',
  });

  // 获取商品列表
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.minPrice && { minPrice: filters.minPrice }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
        ...(filters.inStock && { inStock: 'true' }),
        ...(filters.featured && { featured: 'true' }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('获取商品列表失败');

      const data = await response.json();
      setProducts(data.products);
      setTotalPages(data.pagination.pages);
      setTotalProducts(data.pagination.total);
    } catch (error) {
      logger.error('获取商品列表失败:', error);
      toast.error('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  // 获取商品分类
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (!response.ok) throw new Error('获取分类失败');

      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      logger.error('获取分类失败:', error);
      toast.error('获取分类失败');
    }
  };

  // 更新URL参数
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '' && value !== false) {
        params.set(key, value.toString());
      }
    });

    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }

    const newURL = `/shop/products${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(newURL, { scroll: false });
  }, [filters, currentPage, router]);

  // 处理筛选器变化
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // 清除筛选器
  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      inStock: false,
      featured: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setCurrentPage(1);
  };

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
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

  // 渲染商品卡片
  const renderProductCard = (product: Product) => {
    const stockStatus = getStockStatus(product.inventory);
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount 
      ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
      : 0;

    if (viewMode === 'list') {
      return (
        <Card key={product.id} className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Link href={`/shop/products/${product.slug}`} className="flex-shrink-0">
                {product.images.length > 0 && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
              </Link>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge variant="outline" className="text-xs mb-2">
                      {product.category.name}
                    </Badge>
                    <Link href={`/shop/products/${product.slug}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    {product.shortDesc && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {product.shortDesc}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(product.price)}
                    </div>
                    {hasDiscount && (
                      <div className="text-sm text-gray-500 line-through">
                        {formatCurrency(product.originalPrice!)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
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
                    <span className={stockStatus.color}>
                      {stockStatus.label}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      disabled={stockStatus.status === 'out-of-stock'}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      {stockStatus.status === 'out-of-stock' ? '缺货' : '加入购物车'}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Link key={product.id} href={`/shop/products/${product.slug}`} className="group">
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
                onClick={(e) => e.preventDefault()}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                {stockStatus.status === 'out-of-stock' ? '缺货' : '加入购物车'}
              </Button>
              <Button variant="outline" size="sm" onClick={(e) => e.preventDefault()}>
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    updateURL();
  }, [updateURL]);

  return (
    <DefaultLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* 页面标题和搜索 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">商品列表</h1>
            
            {/* 搜索栏 */}
            <form onSubmit={handleSearch} className="max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="搜索商品、品牌、型号..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 pr-4"
                />
                <Button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  size="sm"
                >
                  搜索
                </Button>
              </div>
            </form>
          </div>

          <div className="flex gap-8">
            {/* 侧边栏筛选器 */}
            <div className={`w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <Card className="sticky top-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">筛选条件</h3>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4" />
                      清除
                    </Button>
                  </div>

                  {/* 分类筛选 */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">商品分类</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="category"
                          value=""
                          checked={filters.category === ''}
                          onChange={(e) => handleFilterChange('category', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">全部分类</span>
                      </label>
                      {categories.map((category) => (
                        <label key={category.id} className="flex items-center">
                          <input
                            type="radio"
                            name="category"
                            value={category.slug}
                            checked={filters.category === category.slug}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-sm">{category.name}</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            ({category.productCount})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 价格筛选 */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">价格范围</h4>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="最低价"
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                        className="text-sm"
                      />
                      <span className="text-gray-500 self-center">-</span>
                      <Input
                        type="number"
                        placeholder="最高价"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* 其他筛选 */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">其他条件</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.inStock}
                          onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">仅显示有库存</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.featured}
                          onChange={(e) => handleFilterChange('featured', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">仅显示推荐商品</span>
                      </label>
                    </div>
                  </div>

                  {/* 排序 */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">排序方式</h4>
                    <select
                      value={`${filters.sortBy}-${filters.sortOrder}`}
                      onChange={(e) => {
                        const [sortBy, sortOrder] = e.target.value.split('-');
                        handleFilterChange('sortBy', sortBy);
                        handleFilterChange('sortOrder', sortOrder);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="createdAt-desc">最新发布</option>
                      <option value="price-asc">价格从低到高</option>
                      <option value="price-desc">价格从高到低</option>
                      <option value="salesCount-desc">销量最高</option>
                      <option value="viewCount-desc">浏览最多</option>
                      <option value="rating-desc">评分最高</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 主内容区域 */}
            <div className="flex-1">
              {/* 工具栏 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    筛选
                  </Button>
                  <span className="text-sm text-gray-600">
                    共找到 {totalProducts} 个商品
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 商品列表 */}
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">加载中...</span>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">没有找到商品</h3>
                  <p className="text-gray-600 mb-4">尝试调整筛选条件或搜索关键词</p>
                  <Button onClick={clearFilters}>清除筛选条件</Button>
                </div>
              ) : (
                <>
                  <div className={
                    viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                      : 'space-y-4'
                  }>
                    {products.map(renderProductCard)}
                  </div>

                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        上一页
                      </Button>
                      <span className="text-sm text-gray-600">
                        第 {currentPage} 页，共 {totalPages} 页
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        下一页
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}