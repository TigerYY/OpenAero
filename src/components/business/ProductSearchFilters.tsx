/* eslint-disable-next-line no-unused-expressions */
'use client';

import { useTranslations } from 'next-intl';

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

interface ProductSearchFiltersProps {
  filters: ProductFilters;
  categories?: Array<{ id: string; name: string; slug: string }>;
  onFilterChange: (filters: Partial<ProductFilters>) => void;
}

export function ProductSearchFilters({
  filters,
  categories = [],
  onFilterChange,
}: ProductSearchFiltersProps) {
  const t = useTranslations('shop.products.filters');
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
      sortBy: sortBy as ProductFilters['sortBy'],
      sortOrder: sortOrder as 'asc' | 'desc',
    });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
      featured: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  return (
    <div className='flex flex-wrap items-center gap-2.5'>
      {/* 筛选选项 - 紧凑横向布局 */}
      <div className='flex flex-wrap items-center gap-2.5 flex-1'>
        {/* 分类筛选 */}
        {categories.length > 0 && (
          <div className='flex-shrink-0'>
            <select
              value={filters.category || ''}
              onChange={handleCategoryChange}
              className='px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all text-sm min-w-[120px] text-gray-700 hover:border-gray-400'
            >
              <option value=''>{t('category.all')}</option>
              {categories.map(category => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 价格范围 */}
        <div className='flex-shrink-0'>
          <div className='flex gap-1.5 items-center'>
            <input
              type='number'
              placeholder={t('price.min')}
              value={filters.minPrice || ''}
              onChange={e => handlePriceChange('min', e.target.value)}
              className='w-20 px-2.5 py-2 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all text-sm placeholder:text-gray-400'
              min='0'
            />
            <span className='text-gray-400 text-xs'>-</span>
            <input
              type='number'
              placeholder={t('price.max')}
              value={filters.maxPrice || ''}
              onChange={e => handlePriceChange('max', e.target.value)}
              className='w-20 px-2.5 py-2 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all text-sm placeholder:text-gray-400'
              min='0'
            />
          </div>
        </div>

        {/* 排序方式 */}
        <div className='flex-shrink-0'>
          <select
            value={`${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`}
            onChange={handleSortChange}
            className='px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all text-sm min-w-[120px] text-gray-700 hover:border-gray-400'
          >
            <option value='createdAt-desc'>{t('sort.newest')}</option>
            <option value='price-asc'>{t('sort.priceAsc')}</option>
            <option value='price-desc'>{t('sort.priceDesc')}</option>
            <option value='rating-desc'>{t('sort.rating')}</option>
            <option value='salesCount-desc'>{t('sort.sales')}</option>
            <option value='name-asc'>{t('sort.nameAsc')}</option>
            <option value='name-desc'>{t('sort.nameDesc')}</option>
          </select>
        </div>

        {/* 快速筛选 */}
        <div className='flex-shrink-0'>
          <div className='flex gap-1.5'>
            <button
              onClick={() => onFilterChange({ ...filters, minPrice: 0, maxPrice: 1000 })}
              className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                filters.minPrice === 0 && filters.maxPrice === 1000
                  ? 'bg-primary-500/10 border-primary-500/50 text-primary-700 shadow-sm'
                  : 'bg-white/80 backdrop-blur-sm border-gray-300/80 text-gray-700 hover:bg-white hover:border-gray-400 shadow-sm'
              }`}
            >
              {t('price.min')} 1000
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
      <div className='flex-shrink-0'>
        <button
          onClick={clearFilters}
          className='px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap hover:bg-gray-100/50 rounded-lg'
        >
          {t('clear')}
        </button>
      </div>
    </div>
  );
}
