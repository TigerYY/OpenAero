'use client';

import { useState, useEffect } from 'react';

import { MainLayout } from '@/components/layout/MainLayout';
import { SolutionCard } from '@/components/business/SolutionCard';
import { SearchFilters } from '@/components/business/SearchFilters';
import { Pagination } from '@/components/ui/Pagination';
import { Solution, SolutionFilters } from '@/types';

export default function SolutionsPage() {
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
    minPrice: undefined,
    maxPrice: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const fetchSolutions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.search) params.append('q', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/solutions?${params}`);
      const result = await response.json();

      if (result.success) {
        setSolutions(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Error fetching solutions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, [filters, pagination.page]);

  const handleFilterChange = (newFilters: Partial<SolutionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-secondary-50">
        <div className="container py-8">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
              解决方案市场
            </h1>
            <p className="text-xl text-secondary-600">
              发现经过专业认证的无人机核心套件，为您的项目找到完美解决方案
            </p>
          </div>

          {/* 搜索和筛选 */}
          <div className="mb-8">
            <SearchFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* 结果统计 */}
          <div className="mb-6">
            <p className="text-secondary-600">
              找到 <span className="font-semibold text-primary-600">{pagination.total}</span> 个解决方案
            </p>
          </div>

          {/* 解决方案列表 */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm animate-pulse">
                  <div className="aspect-video bg-secondary-200 rounded-t-xl"></div>
                  <div className="p-6">
                    <div className="h-4 bg-secondary-200 rounded mb-2"></div>
                    <div className="h-4 bg-secondary-200 rounded mb-4 w-3/4"></div>
                    <div className="h-6 bg-secondary-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : solutions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {solutions.map((solution) => (
                  <SolutionCard key={solution.id} solution={solution} />
                ))}
              </div>

              {/* 分页 */}
              {pagination.totalPages > 1 && (
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                没有找到解决方案
              </h3>
              <p className="text-secondary-600 mb-6">
                尝试调整搜索条件或浏览其他分类
              </p>
              <button
                onClick={() => setFilters({})}
                className="btn-primary"
              >
                清除筛选条件
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
