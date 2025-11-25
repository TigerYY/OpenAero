'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { ProductCard } from '@/components/business/ProductCard';
import { ProductSearchFilters } from '@/components/business/ProductSearchFilters';
import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { Pagination } from '@/components/ui/Pagination';
import logger from '@/lib/logger';

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
  brand?: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  inStock: boolean;
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productCount: number;
}

interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sortBy?: 'createdAt' | 'price' | 'rating' | 'salesCount' | 'name' | 'reviewCount';
  sortOrder?: 'asc' | 'desc';
}

export default function ProductsPage() {
  const t = useTranslations('shop.products');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('categorySlug', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.inStock) params.append('inStock', 'true');
      if (filters.featured) params.append('isFeatured', 'true');
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/products?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const result = await response.json();

      if (result.success && result.data) {
        setProducts(result.data.products || []);
        setPagination({
          page: result.data.pagination?.page || 1,
          limit: result.data.pagination?.limit || 20,
          total: result.data.pagination?.total || 0,
          totalPages: result.data.pagination?.pages || 0,
        });
      } else {
        setProducts([]);
      }
    } catch (error) {
      logger.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      if (data.success && data.data) {
        setCategories(data.data.categories || []);
      }
    } catch (error) {
      logger.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleFiltersChange = (newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <DefaultLayout>
      <div className='min-h-screen bg-gradient-to-b from-gray-50 to-white'>
        {/* 页面头部 - 紧凑设计 */}
        <div className='bg-gradient-to-br from-white via-gray-50/50 to-white border-b border-gray-200/60 sticky top-0 z-10 shadow-sm backdrop-blur-sm'>
          <div className='container mx-auto px-4 py-5'>
            {/* 第一行：标题和搜索 - 更紧凑 */}
            <div className='flex flex-col lg:flex-row lg:items-center gap-3 mb-4'>
              {/* 左侧：标题和描述 */}
              <div className='flex items-center gap-4 flex-shrink-0'>
                <div>
                  <h1 className='text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent'>
                    {t('title')}
                  </h1>
                  <p className='text-xs lg:text-sm text-gray-500 mt-0.5 hidden sm:block'>
                    {t('subtitle') || '发现和购买优质商品'}
                  </p>
                </div>
              </div>

              {/* 右侧：搜索框 - 与标题更近 */}
              <div className='flex-1 lg:max-w-md'>
                <div className='relative'>
                  <input
                    type='text'
                    placeholder={t('searchPlaceholder') || '搜索商品...'}
                    value={filters.search || ''}
                    onChange={e => handleFiltersChange({ search: e.target.value })}
                    className='w-full pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all placeholder:text-gray-400 text-sm'
                  />
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <svg
                      className='h-4 w-4 text-gray-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 结果统计 - 移到右侧 */}
              {!loading && (
                <div className='flex items-center gap-2 text-xs lg:text-sm text-gray-600 lg:flex-shrink-0'>
                  <span className='font-semibold text-gray-900 whitespace-nowrap'>
                    {pagination.total}
                  </span>
                  <span className='text-gray-400'>个商品</span>
                  {pagination.totalPages > 1 && (
                    <>
                      <span className='text-gray-300 mx-1'>•</span>
                      <span className='whitespace-nowrap text-gray-500'>
                        {pagination.page}/{pagination.totalPages}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 第二行：筛选条件 */}
            <div className='flex items-center gap-2'>
              <ProductSearchFilters
                filters={filters}
                categories={categories}
                onFilterChange={handleFiltersChange}
              />
            </div>
          </div>
        </div>

        <div className='container mx-auto px-4 py-8'>
          {/* 商品列表区域 */}
          <div>
            {loading ? (
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'>
                {[...Array(10)].map((_, i) => (
                  <div key={i} className='animate-pulse'>
                    <div className='bg-white rounded-xl shadow-sm overflow-hidden'>
                      <div className='aspect-video bg-gray-200'></div>
                      <div className='p-4 space-y-3'>
                        <div className='h-3 bg-gray-200 rounded w-3/4'></div>
                        <div className='h-3 bg-gray-200 rounded w-full'></div>
                        <div className='h-3 bg-gray-200 rounded w-5/6'></div>
                        <div className='flex justify-between items-center pt-3'>
                          <div className='h-5 bg-gray-200 rounded w-16'></div>
                          <div className='h-8 bg-gray-200 rounded w-20'></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <>
                {/* 商品网格 - 14寸屏幕每行5个 */}
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8'>
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* 分页 */}
                {pagination.totalPages > 1 && (
                  <div className='flex justify-center mt-8'>
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className='text-center py-16 bg-white rounded-xl shadow-sm'>
                <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6'>
                  <svg
                    className='w-10 h-10 text-gray-400'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                    />
                  </svg>
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>未找到商品</h3>
                <p className='text-gray-600 mb-6 max-w-md mx-auto'>
                  请尝试调整筛选条件或搜索关键词
                </p>
                <button
                  onClick={clearFilters}
                  className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors'
                >
                  清除筛选
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
