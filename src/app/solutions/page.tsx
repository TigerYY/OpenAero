'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AdvancedSearch from '@/components/business/AdvancedSearch';

interface Solution {
  id: string;
  title: string;
  description: string;
  author: string;
  price: number;
  rating: number;
  downloads: number;
  tags: string[];
  category: string;
  image: string;
  createdAt: string;
  difficulty?: string;
  language?: string;
}

interface SearchFilters {
  query: string;
  category: string;
  priceRange: [number, number];
  rating: number;
  sortBy: string;
  tags: string[];
  author: string;
  dateRange: string;
  difficulty: string;
  language: string;
}

function SolutionsContent() {
  const searchParams = useSearchParams();
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Partial<SearchFilters>>({});

  useEffect(() => {
    if (!searchParams) return;
    
    // 从 URL 参数初始化搜索状态
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const sort = searchParams.get('sort') || 'newest';
    
    setSearchQuery(query);
    setSelectedCategory(category);
    setSortBy(sort);
    
    // 设置活跃的筛选器
    const filters: Partial<SearchFilters> = {};
    if (query) filters.query = query;
    if (category) filters.category = category;
    if (sort !== 'newest') filters.sortBy = sort;
    
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (minPrice || maxPrice) {
      filters.priceRange = [
        minPrice ? parseInt(minPrice) : 0,
        maxPrice ? parseInt(maxPrice) : 1000
      ];
    }
    
    const rating = searchParams.get('rating');
    if (rating) filters.rating = parseInt(rating);
    
    const tags = searchParams.get('tags');
    if (tags) filters.tags = tags.split(',');
    
    const author = searchParams.get('author');
    if (author) filters.author = author;
    
    const dateRange = searchParams.get('dateRange');
    if (dateRange) filters.dateRange = dateRange;
    
    const difficulty = searchParams.get('difficulty');
    if (difficulty) filters.difficulty = difficulty;
    
    const language = searchParams.get('language');
    if (language) filters.language = language;
    
    setActiveFilters(filters);
    
    fetchSolutions();
  }, [searchParams]);

  const fetchSolutions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchParams) {
        searchParams.forEach((value, key) => {
          params.append(key, value);
        });
      }
      
      const response = await fetch(`/api/solutions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // 转换API数据格式为前端期望的格式
        const apiSolutions = data.data?.solutions || [];
        const transformedSolutions = apiSolutions.map((solution: any) => ({
          id: solution.id,
          title: solution.title,
          description: solution.description,
          author: solution.creatorName,
          price: solution.price,
          rating: 4.5, // 默认评分，后续可从API获取
          downloads: solution.downloadCount || 0,
          tags: Array.isArray(solution.tags) ? solution.tags : JSON.parse(solution.tags || '[]'),
          category: solution.category,
          image: Array.isArray(solution.images) ? solution.images[0] : JSON.parse(solution.images || '[]')[0] || '/images/placeholder.jpg',
          createdAt: solution.createdAt,
          difficulty: 'intermediate', // 默认难度，后续可从API获取
          language: 'javascript' // 默认语言，后续可从API获取
        }));
        setSolutions(transformedSolutions);
      }
    } catch (error) {
      console.error('获取解决方案失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedSearch = (filters: SearchFilters) => {
    setActiveFilters(filters);
    fetchSolutions();
  };

  const clearFilter = (filterKey: keyof SearchFilters) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterKey];
    setActiveFilters(newFilters);
    
    // 更新 URL
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 0) {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, value.toString());
        }
      }
    });
    
    window.history.pushState({}, '', `/solutions?${params.toString()}`);
    fetchSolutions();
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('newest');
    window.history.pushState({}, '', '/solutions');
    fetchSolutions();
  };

  const filteredSolutions = solutions.filter(solution => {
    if (searchQuery && !solution.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !solution.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !solution.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }
    return true;
  });

  const categories = [
    { id: '', name: '全部分类' },
    { id: 'react', name: 'React' },
    { id: 'vue', name: 'Vue.js' },
    { id: 'nodejs', name: 'Node.js' },
    { id: 'python', name: 'Python' },
    { id: 'ui', name: 'UI 设计' },
    { id: 'mobile', name: '移动开发' },
    { id: 'backend', name: '后端开发' },
    { id: 'devops', name: 'DevOps' }
  ];

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部搜索区域 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">解决方案</h1>
              <p className="text-gray-600 mt-1">发现优质的开发解决方案</p>
            </div>
            
            {/* 搜索框 */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索解决方案..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <button
                  onClick={() => setShowAdvancedSearch(true)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="高级搜索"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* 活跃筛选器显示 */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">活跃筛选器:</span>
              {Object.entries(activeFilters).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                
                let displayValue: string = '';
                if (Array.isArray(value)) {
                  displayValue = value.join(', ');
                } else if (key === 'priceRange' && Array.isArray(value)) {
                  displayValue = `¥${value[0]} - ¥${value[1]}`;
                } else if (key === 'rating') {
                  displayValue = `${value}星及以上`;
                } else {
                  displayValue = value.toString();
                }
                
                return (
                  <span
                    key={key}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {key === 'query' ? '关键词' : 
                     key === 'category' ? '分类' :
                     key === 'priceRange' ? '价格' :
                     key === 'rating' ? '评分' :
                     key === 'sortBy' ? '排序' :
                     key === 'tags' ? '标签' :
                     key === 'author' ? '作者' :
                     key === 'dateRange' ? '时间' :
                     key === 'difficulty' ? '难度' :
                     key === 'language' ? '语言' : key}: {displayValue}
                    <button
                      onClick={() => clearFilter(key as keyof SearchFilters)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                清除所有筛选器
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 筛选和排序栏 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* 分类筛选 */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* 排序选择 */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">排序:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">最新发布</option>
                <option value="oldest">最早发布</option>
                <option value="price-low">价格从低到高</option>
                <option value="price-high">价格从高到低</option>
                <option value="rating">评分最高</option>
                <option value="downloads">下载最多</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 解决方案列表 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredSolutions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20a7.962 7.962 0 01-6-2.709M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到解决方案</h3>
            <p className="mt-1 text-sm text-gray-500">尝试调整搜索条件或筛选器</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSolutions.map((solution) => (
              <div key={solution.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        <Link href={`/solutions/${solution.id}`} className="hover:text-blue-600">
                          {solution.title}
                        </Link>
                      </h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {solution.description}
                      </p>
                    </div>
                  </div>

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {solution.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {solution.tags.length > 3 && (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{solution.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* 作者和评分 */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>by {solution.author}</span>
                    <div className="flex items-center">
                      <div className="flex text-yellow-400 mr-1">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3 h-3 ${i < solution.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                      </div>
                      <span>({solution.rating})</span>
                    </div>
                  </div>

                  {/* 价格和下载量 */}
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-blue-600">
                      {solution.price === 0 ? '免费' : `¥${solution.price}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {solution.downloads} 下载
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 高级搜索模态框 */}
      <AdvancedSearch
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={handleAdvancedSearch}
      />
    </div>
  );
}

export default function SolutionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在加载解决方案...</p>
          </div>
        </div>
      </div>
    }>
      <SolutionsContent />
    </Suspense>
  );
}
