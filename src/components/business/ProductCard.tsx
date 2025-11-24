/* eslint-disable-next-line no-unused-expressions */
'use client';

import { Star, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useRouting } from '@/lib/routing';
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
  isFeatured: boolean;
  brand?: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  inStock: boolean;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { route } = useRouting();

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    // TODO: 实现收藏功能
  };

  return (
    <div
      className='bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer h-full flex flex-col'
      onClick={() => {
        window.location.href = route(`/shop/products/${product.slug}`);
      }}
    >
      {/* 图片区域 */}
      <div className='aspect-video bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden'>
        {product.images && product.images.length > 0 && product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='text-6xl opacity-20'>🛒</div>
          </div>
        )}

        {/* 渐变遮罩 */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>

        {/* 状态标签 */}
        <div className='absolute top-2 right-2 flex flex-col gap-1.5 items-end z-10'>
          {product.isFeatured && (
            <span className='px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-400/90 text-yellow-900 backdrop-blur-sm flex items-center gap-0.5 shadow-sm'>
              <Star className='w-2.5 h-2.5 fill-current' />
              推荐
            </span>
          )}
          {!product.inStock && (
            <span className='px-2 py-1 rounded-full text-[10px] font-semibold bg-red-500/90 text-white backdrop-blur-sm shadow-sm'>
              缺货
            </span>
          )}
        </div>

        {/* 收藏按钮 */}
        <button
          onClick={handleFavorite}
          className='absolute top-2 left-2 p-1.5 bg-white/90 hover:bg-white rounded-full transition-all duration-200 shadow-sm z-10 backdrop-blur-sm'
          aria-label='收藏'
        >
          <svg
            className={`w-4 h-4 transition-all duration-200 ${isFavorite ? 'text-red-500 fill-current scale-110' : 'text-gray-400 hover:text-red-400'}`}
            fill={isFavorite ? 'currentColor' : 'none'}
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
            />
          </svg>
        </button>
      </div>

      {/* 内容区域 */}
      <div className='p-4 flex-1 flex flex-col'>
        {/* 分类标签 */}
        <div className='mb-2'>
          <span className='inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded'>
            {product.category.name}
          </span>
        </div>

        {/* 标题 */}
        <h3 className='text-sm font-bold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-primary-600 transition-colors leading-tight'>
          {product.name}
        </h3>

        {/* 描述 */}
        {product.shortDesc && (
          <p className='text-xs text-gray-600 mb-3 line-clamp-2 flex-1 leading-relaxed'>
            {product.shortDesc}
          </p>
        )}

        {/* 品牌标签 */}
        {product.brand && (
          <div className='flex flex-wrap gap-1.5 mb-3'>
            <span className='px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-medium rounded'>
              {product.brand}
            </span>
          </div>
        )}

        {/* 评分和价格区域 */}
        <div className='mt-auto pt-3 border-t border-gray-100'>
          {/* 评分 */}
          {product.rating && product.reviewCount > 0 ? (
            <div className='flex items-center mb-2'>
              <div className='flex items-center'>
                {Array.from({ length: 5 }).map((_, index) => (
                  <svg
                    key={index}
                    className={`w-3 h-3 ${
                      index < Math.floor(product.rating!)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                    viewBox='0 0 20 20'
                  >
                    <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                  </svg>
                ))}
              </div>
              <span className='ml-1.5 text-[10px] text-gray-600'>
                {product.rating.toFixed(1)} ({product.reviewCount})
              </span>
            </div>
          ) : null}

          {/* 价格和操作按钮 */}
          <div className='flex items-center justify-between gap-2'>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <div className='text-lg font-bold text-primary-600'>
                  {formatCurrency(product.price)}
                </div>
                {product.originalPrice && product.originalPrice > product.price && (
                  <div className='text-xs text-gray-400 line-through'>
                    {formatCurrency(product.originalPrice)}
                  </div>
                )}
              </div>
              {product.salesCount > 0 && (
                <div className='text-[10px] text-gray-500 mt-0.5'>已售 {product.salesCount}</div>
              )}
            </div>
            <Button
              size='sm'
              className='group-hover:bg-primary-700 transition-colors text-xs px-3 py-1.5 h-auto flex-shrink-0'
              disabled={!product.inStock}
              onClick={e => {
                e.stopPropagation();
                if (product.inStock) {
                  window.location.href = route(`/shop/products/${product.slug}`);
                }
              }}
            >
              <ShoppingCart className='w-3 h-3 mr-1' />
              {product.inStock ? '购买' : '缺货'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
