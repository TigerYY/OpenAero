/* eslint-disable no-hardcoded-routes */
'use client';

import { SolutionFilters } from '@/types';

interface SearchFiltersProps {
  filters: SolutionFilters;
  onFilterChange: (filters: Partial<SolutionFilters>) => void;
}

const categories = [
  { value: '', label: '全部分类' },
  { value: 'cat1', label: 'FPV验证机' },
  { value: 'cat2', label: '安防巡检' },
  { value: 'cat3', label: '农业植保' },
  { value: 'cat4', label: '航拍摄影' },
  { value: 'cat5', label: '物流配送' },
  { value: 'cat6', label: '测绘航拍' },
  { value: 'cat7', label: '配送运输' },
];

// const sortOptions = [
//   { value: 'createdAt', label: '最新发布' },
//   { value: 'price', label: '价格' },
//   { value: 'rating', label: '评分' },
//   { value: 'name', label: '名称' },
// ];

export function SearchFilters({ filters, onFilterChange }: SearchFiltersProps) {

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      onFilterChange({ category: value });
    } else {
      onFilterChange({ category: undefined });
    }
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
      sortBy: sortBy as 'createdAt' | 'price' | 'rating' | 'name',
      sortOrder: sortOrder as 'asc' | 'desc',
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
    <div className="flex flex-wrap items-center gap-2.5">
      {/* 筛选选项 - 紧凑横向布局 */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        {/* 分类筛选 */}
        <div className="flex-shrink-0">
          <select
            value={filters.category || ''}
            onChange={handleCategoryChange}
            className="px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all text-sm min-w-[120px] text-gray-700 hover:border-gray-400"
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* 价格范围 */}
        <div className="flex-shrink-0">
          <div className="flex gap-1.5 items-center">
            <input
              type="number"
              placeholder="最低"
              value={filters.minPrice || ''}
              onChange={(e) => handlePriceChange('min', e.target.value)}
              className="w-20 px-2.5 py-2 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all text-sm placeholder:text-gray-400"
              min="0"
            />
            <span className="text-gray-400 text-xs">-</span>
            <input
              type="number"
              placeholder="最高"
              value={filters.maxPrice || ''}
              onChange={(e) => handlePriceChange('max', e.target.value)}
              className="w-20 px-2.5 py-2 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all text-sm placeholder:text-gray-400"
              min="0"
            />
          </div>
        </div>

        {/* 排序方式 */}
        <div className="flex-shrink-0">
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={handleSortChange}
            className="px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all text-sm min-w-[120px] text-gray-700 hover:border-gray-400"
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
        <div className="flex-shrink-0">
          <div className="flex gap-1.5">
            <button
              onClick={() => onFilterChange({ ...filters, minPrice: 0, maxPrice: 1000 })}
              className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                filters.minPrice === 0 && filters.maxPrice === 1000
                  ? 'bg-primary-500/10 border-primary-500/50 text-primary-700 shadow-sm'
                  : 'bg-white/80 backdrop-blur-sm border-gray-300/80 text-gray-700 hover:bg-white hover:border-gray-400 shadow-sm'
              }`}
            >
              1000元以下
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, minPrice: 1000, maxPrice: 5000 })}
              className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                filters.minPrice === 1000 && filters.maxPrice === 5000
                  ? 'bg-primary-500/10 border-primary-500/50 text-primary-700 shadow-sm'
                  : 'bg-white/80 backdrop-blur-sm border-gray-300/80 text-gray-700 hover:bg-white hover:border-gray-400 shadow-sm'
              }`}
            >
              1000-5000元
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, minPrice: 5000 })}
              className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                filters.minPrice === 5000 && !filters.maxPrice
                  ? 'bg-primary-500/10 border-primary-500/50 text-primary-700 shadow-sm'
                  : 'bg-white/80 backdrop-blur-sm border-gray-300/80 text-gray-700 hover:bg-white hover:border-gray-400 shadow-sm'
              }`}
            >
              5000元以上
            </button>
          </div>
        </div>
      </div>

      {/* 清除按钮 */}
      <div className="flex-shrink-0">
        <button
          onClick={clearFilters}
          className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap hover:bg-gray-100/50 rounded-lg"
        >
          清除筛选
        </button>
      </div>
    </div>
  );
}
