'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Solution } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface SolutionCardProps {
  solution: Solution;
}

export function SolutionCard({ solution }: SolutionCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    // TODO: 实现收藏功能
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success-100 text-success-800';
      case 'PENDING_REVIEW':
        return 'bg-warning-100 text-warning-800';
      case 'DRAFT':
        return 'bg-secondary-100 text-secondary-800';
      case 'REJECTED':
        return 'bg-error-100 text-error-800';
      case 'ARCHIVED':
        return 'bg-secondary-100 text-secondary-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '已认证';
      case 'PENDING_REVIEW':
        return '审核中';
      case 'DRAFT':
        return '草稿';
      case 'REJECTED':
        return '已拒绝';
      case 'ARCHIVED':
        return '已归档';
      default:
        return '未知';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
      {/* 图片区域 */}
      <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
        {solution.images && solution.images.length > 0 ? (
          <img
            src={solution.images[0]}
            alt={solution.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl">🚁</span>
                  </div>
                )}
        
        {/* 状态标签 */}
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(solution.status)}`}>
            {getStatusText(solution.status)}
          </span>
        </div>

        {/* 收藏按钮 */}
        <button
          onClick={handleFavorite}
          className="absolute top-4 left-4 p-2 bg-white/80 hover:bg-white rounded-full transition-colors"
        >
          <svg
            className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-secondary-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 分类和创作者 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-primary-600 font-medium">
            {solution.categoryId}
          </span>
          {solution.creator && (
            <span className="text-sm text-secondary-500">
              创作者: {solution.creator.user?.name || '匿名'}
            </span>
          )}
        </div>

        {/* 标题 */}
        <h3 className="text-xl font-semibold text-secondary-900 mb-2 line-clamp-2">
          {solution.title}
        </h3>

        {/* 描述 */}
        <p className="text-secondary-600 mb-4 line-clamp-2">
          {solution.description}
        </p>

        {/* 功能特性 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {solution.specs && Object.entries(solution.specs).slice(0, 3).map(([key, value], index) => (
            <span
              key={index}
              className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-md"
            >
              {key}: {value}
            </span>
          ))}
        </div>

        {/* 评分 */}
        {solution.averageRating && solution.reviewCount && (
          <div className="flex items-center mb-4">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, index) => (
                <svg
                  key={index}
                  className={`w-4 h-4 ${
                    index < Math.floor(solution.averageRating!)
                      ? 'text-yellow-400'
                      : 'text-secondary-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="ml-2 text-sm text-secondary-600">
              {solution.averageRating} ({solution.reviewCount} 评价)
            </span>
          </div>
        )}

        {/* 价格和操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-primary-600">
            {formatCurrency(solution.price)}
          </div>
          <Button asChild>
            <Link href={`/solutions/${solution.id}`}>
              查看详情
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
