'use client';

import { useEffect, useState } from 'react';

import { SearchFilters } from '@/components/business/SearchFilters';
import { SolutionCard } from '@/components/business/SolutionCard';
import { MainLayout } from '@/components/layout/MainLayout';
import { Pagination } from '@/components/ui/Pagination';
import { Solution, SolutionFilters } from '@/types';

interface SolutionsPageProps {
  params: {
    locale: string;
  };
}

export default function SolutionsPage({ params: { locale } }: SolutionsPageProps) {
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
  }, [pagination.page, filters]);

  const handleFiltersChange = (newFilters: SolutionFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  return (
    <MainLayout locale={locale}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              解决方案市场
            </h1>
            <p className="text-lg text-gray-600">
              发现和购买经过验证的无人机解决方案
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <SearchFilters
                filters={filters}
                onFilterChange={handleFiltersChange}
              />
            </div>

            <div className="lg:col-span-3">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 rounded-lg h-64"></div>
                    </div>
                  ))}
                </div>
              ) : solutions.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                    {solutions.map((solution) => (
                      <SolutionCard key={solution.id} solution={solution} />
                    ))}
                  </div>

                  {pagination.totalPages > 1 && (
                    <div className="flex justify-center">
                      <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    未找到匹配的解决方案
                  </h3>
                  <p className="text-gray-600">
                    尝试调整搜索条件或浏览所有解决方案
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
