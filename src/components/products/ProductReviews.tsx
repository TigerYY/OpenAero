/**
 * 产品评价展示组件
 */

'use client';

import { useState, useEffect } from 'react';
import { Star, ThumbsUp, MessageCircle, CheckCircle, Image as ImageIcon, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { formatDate } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  images: string[];
  videos: string[];
  status: string;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
  replies?: ReviewReply[];
}

interface ReviewReply {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
}

interface ReviewStats {
  total: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  verifiedCount: number;
}

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRating, setSelectedRating] = useState<number | undefined>();

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [productId, page, selectedRating]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (selectedRating) {
        params.append('rating', selectedRating.toString());
      }

      const response = await fetch(`/api/products/${productId}/reviews?${params}`);
      const data = await response.json();

      if (data.success) {
        setReviews(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setError(data.message || '获取评价失败');
      }
    } catch (err) {
      console.error('获取评价失败:', err);
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/products/${productId}/reviews/stats`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('获取评价统计失败:', err);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/reviews/${reviewId}/helpful`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        // 更新本地状态
        setReviews((prev) =>
          prev.map((review) =>
            review.id === reviewId
              ? { ...review, helpfulCount: review.helpfulCount + 1 }
              : review
          )
        );
      }
    } catch (err) {
      console.error('标记有用失败:', err);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>用户评价</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="sm" message="加载评价中..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 评价统计 */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>评价统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</div>
                <div className="mt-2">{renderStars(Math.round(stats.averageRating), 'lg')}</div>
                <div className="text-sm text-gray-600 mt-2">
                  基于 {stats.total} 条评价
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">评分分布</div>
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.ratingDistribution[rating] || 0;
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-600 w-8">{rating}星</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">其他信息</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">已验证购买</span>
                    <span className="text-sm font-medium">{stats.verifiedCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 评价筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>用户评价</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">筛选：</span>
            <Button
              variant={selectedRating === undefined ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRating(undefined)}
            >
              全部
            </Button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <Button
                key={rating}
                variant={selectedRating === rating ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRating(rating)}
              >
                {rating}星
              </Button>
            ))}
          </div>

          {error && <ErrorMessage error={error} className="mb-4" />}

          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无评价</div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {review.user.avatar ? (
                        <img
                          src={review.user.avatar}
                          alt={review.user.firstName || '用户'}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 text-sm">
                            {(review.user.firstName?.[0] || 'U').toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {review.user.firstName} {review.user.lastName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(review.rating, 'sm')}
                          {review.isVerified && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              已验证购买
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(review.createdAt)}
                    </div>
                  </div>

                  {review.title && (
                    <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                  )}

                  {review.content && (
                    <p className="text-gray-700 mb-3">{review.content}</p>
                  )}

                  {/* 评价图片和视频 */}
                  {(review.images.length > 0 || review.videos.length > 0) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {review.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`评价图片 ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80"
                          onClick={() => window.open(image, '_blank')}
                        />
                      ))}
                      {review.videos.map((video, index) => (
                        <div
                          key={index}
                          className="w-20 h-20 bg-gray-100 rounded border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-200"
                          onClick={() => window.open(video, '_blank')}
                        >
                          <Video className="w-6 h-6 text-gray-600" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 评价回复 */}
                  {review.replies && review.replies.length > 0 && (
                    <div className="ml-14 mt-3 space-y-2">
                      {review.replies.map((reply) => (
                        <div key={reply.id} className="bg-gray-50 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {reply.user.firstName} {reply.user.lastName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 有用按钮 */}
                  <div className="mt-3 flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkHelpful(review.id)}
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      有用 ({review.helpfulCount})
                    </Button>
                  </div>
                </div>
              ))}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    上一页
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    第 {page} 页，共 {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

