'use client';

import { useState } from 'react';
import { SolutionFilters } from '@/types';

interface SearchFiltersProps {
  filters: SolutionFilters;
  onFilterChange: (filters: Partial<SolutionFilters>) => void;
}

const categories = [
  { value: '', label: '全部分类' },
  { value: 'fpv', label: 'FPV验证机' },
  { value: 'security', label: '安防巡检' },
  { value: 'agriculture', label: '农业植保' },
  { value: 'logistics', label: '物流配送' },
  { value: 'mapping', label: '测绘航拍' },
  { value: 'delivery', label: '配送运输' },
];

const sortOptions = [
  { value: 'createdAt', label: '最新发布' },
  { value: 'price', label: '价格' },
  { value: 'rating', label: '评分' },
  { value: 'name', label: '名称' },
];

export function SearchFilters({ filters, onFilterChange }: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ category: e.target.value || undefined });
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    onFilterChange({
      [type === 'min' ? 'minPrice' : 'maxPrice']: numValue,
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [sortBy, sortOrder] = e.target.value.split('-');
    onFilterChange({
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* 搜索栏 */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索解决方案..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              className="input w-full pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-secondary-400"
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
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            筛选
          </button>
          
          <button
            onClick={clearFilters}
            className="btn-ghost text-secondary-600"
          >
            清除
          </button>
        </div>
      </div>

      {/* 筛选选项 */}
      {showFilters && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 分类筛选 */}
            <div>
              <label className="label block mb-2">分类</label>
              <select
                value={filters.category || ''}
                onChange={handleCategoryChange}
                className="input"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 价格范围 */}
            <div>
              <label className="label block mb-2">价格范围</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="最低价"
                  value={filters.minPrice || ''}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                  className="input flex-1"
                  min="0"
                />
                <span className="flex items-center text-secondary-500">-</span>
                <input
                  type="number"
                  placeholder="最高价"
                  value={filters.maxPrice || ''}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                  className="input flex-1"
                  min="0"
                />
              </div>
            </div>

            {/* 排序方式 */}
            <div>
              <label className="label block mb-2">排序方式</label>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={handleSortChange}
                className="input"
              >
                <option value="createdAt-desc">最新发布</option>
                <option value="price-asc">价格从低到高</option>
                <option value="price-desc">价格从高到低</option>
                <option value="rating-desc">评分最高</option>
                <option value="name-asc">名称A-Z</option>
                <option value="name-desc">名称Z-A</option>
              </select>
            </div>

            {/* 快速筛选 */}
            <div>
              <label className="label block mb-2">快速筛选</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onFilterChange({ minPrice: 0, maxPrice: 1000 })}
                  className="px-3 py-1 text-xs bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200"
                >
                  1000元以下
                </button>
                <button
                  onClick={() => onFilterChange({ minPrice: 1000, maxPrice: 5000 })}
                  className="px-3 py-1 text-xs bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200"
                >
                  1000-5000元
                </button>
                <button
                  onClick={() => onFilterChange({ minPrice: 5000 })}
                  className="px-3 py-1 text-xs bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200"
                >
                  5000元以上
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
