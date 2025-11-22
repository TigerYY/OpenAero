/* eslint-disable no-hardcoded-routes */
'use client';

import { useEffect, useState } from 'react';

import { SearchFilters } from '@/components/business/SearchFilters';
import { SolutionCard } from '@/components/business/SolutionCard';
import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { Pagination } from '@/components/ui/Pagination';
import { Solution, SolutionFilters } from '@/types';

interface SolutionsPageProps {
  params: {
    locale: string;
  };
}

export default function SolutionsPage({ params: { locale: _locale } }: SolutionsPageProps) {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<SolutionFilters>({
    search: '',
    category: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const fetchSolutions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/solutions?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const result = await response.json();

      if (result.success && result.data) {
        // createPaginatedResponse 返回的数据结构是 { items, pagination }
        const items = result.data.items || [];
        const paginationData = result.data.pagination || {};
        
        setSolutions(items);
        setPagination({
          page: paginationData.page || 1,
          limit: paginationData.limit || 20,
          total: paginationData.total || 0,
          totalPages: paginationData.totalPages || 0,
        });
      } else {
        // 如果请求失败，确保 solutions 是空数组
        setSolutions([]);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching solutions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, [pagination.page, filters]);

  const handleFiltersChange = (newFilters: SolutionFilters) => {
    setFilters(newFilters);
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* 页面头部 - 紧凑设计 */}
        <div className="bg-gradient-to-br from-white via-gray-50/50 to-white border-b border-gray-200/60 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
          <div className="container mx-auto px-4 py-5">
            {/* 第一行：标题和搜索 - 更紧凑 */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
              {/* 左侧：标题和描述 */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    解决方案市场
                  </h1>
                  <p className="text-xs lg:text-sm text-gray-500 mt-0.5 hidden sm:block">
                    发现和购买经过验证的无人机解决方案
                  </p>
                </div>
              </div>
              
              {/* 右侧：搜索框 - 与标题更近 */}
              <div className="flex-1 lg:max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜索方案标题、描述..."
                    value={filters.search || ''}
                    onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all placeholder:text-gray-400 text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 结果统计 - 移到右侧 */}
              {!loading && (
                <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600 lg:flex-shrink-0">
                  <span className="font-semibold text-gray-900 whitespace-nowrap">
                    {pagination.total}
                  </span>
                  <span className="text-gray-400">个方案</span>
                  {pagination.totalPages > 1 && (
                    <>
                      <span className="text-gray-300 mx-1">•</span>
                      <span className="whitespace-nowrap text-gray-500">
                        {pagination.page}/{pagination.totalPages}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 第二行：筛选条件 */}
            <div className="flex items-center gap-2">
              <SearchFilters
                filters={filters}
                onFilterChange={handleFiltersChange}
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* 方案列表区域 */}
          <div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="aspect-video bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        <div className="flex justify-between items-center pt-3">
                          <div className="h-5 bg-gray-200 rounded w-16"></div>
                          <div className="h-8 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : solutions && solutions.length > 0 ? (
              <>
                {/* 方案网格 - 14寸屏幕每行5个 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                  {solutions.map((solution) => (
                    <SolutionCard key={solution.id} solution={solution} />
                  ))}
                </div>

                {/* 分页 */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  未找到匹配的解决方案
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  尝试调整搜索条件或筛选选项，或者浏览所有可用的解决方案
                </p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  清除所有筛选
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
