'use client';

// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic';
export const revalidate = 0;


import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { BomList, BomListItem } from '@/components/solutions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useRouting } from '@/lib/routing';

interface Solution {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  category: string;
  price: number;
  status: string;
  creatorId: string;
  images: string[];
  features: string[];
  specs: Record<string, any>;
  bom?: Record<string, any>;
  bomItems?: BomListItem[];
  createdAt: Date;
  updatedAt: Date;
  averageRating?: number;
  reviewCount?: number;
  creator?: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
  };
}

interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  user: {
    name: string;
    avatar?: string;
  };
}

export default function SolutionDetailPage() {
  const params = useParams();
  const { route } = useRouting();
  const solutionId = params?.id as string;
  
  const [solution, setSolution] = useState<Solution | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
  const { route } = useRouting()
    fetchSolution();
    fetchReviews();
  }, [solutionId]);

  const fetchSolution = async () => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch solution');
      }
      const data = await response.json();
      if (data.success) {
        // 如果 API 返回 bomItems，使用 bomItems；否则使用 bom
        const solutionData = {
          ...data.data,
          bomItems: data.data.bomItems || (data.data.bom ? Object.entries(data.data.bom).map(([name, value]) => ({
            name,
            quantity: typeof value === 'object' && value !== null ? (value as any).quantity || 1 : 1,
            unitPrice: typeof value === 'object' && value !== null ? (value as any).unitPrice || 0 : 0,
          })) : []),
        };
        setSolution(solutionData);
      } else {
        setError(data.error || 'Failed to load solution');
      }
    } catch (err) {
      setError('Failed to load solution');
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching solution:', err);}
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReviews(data.data || []);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching reviews:', err);}
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(price);
  };

  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating.toFixed(1)} ({solution?.reviewCount || 0} 评价)
        </span>
      </div>
    );
  };

  const getCategoryName = (category: string) => {
    const categories: Record<string, string> = {
      AGRICULTURE: '农业',
      SURVEILLANCE: '监控',
      DELIVERY: '配送',
      MAPPING: '测绘',
      INSPECTION: '巡检',
      ENTERTAINMENT: '娱乐',
      RESEARCH: '科研',
      OTHER: '其他',
    };
    return categories[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !solution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">方案未找到</h1>
          <p className="text-gray-600 mb-6">{error || '请求的方案不存在或已被删除'}</p>
          <Link href={route('/solutions')}>
            <Button>返回方案列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 面包屑导航 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href={route('/')} className="text-gray-500 hover:text-gray-700">
              首页
            </Link>
            <span className="text-gray-400">/</span>
            <Link href={route('/solutions')} className="text-gray-500 hover:text-gray-700">
              方案
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{solution.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：图片展示 */}
          <div className="space-y-4">
            {/* 主图 */}
            <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm">
              {solution.images && solution.images.length > 0 && (
                <Image
                  src={solution.images[0]}
                  alt={solution.title}
                  fill
                  className="object-cover"
                />
              )}
            </div>

            {/* 缩略图 */}
            {solution.images && solution.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {solution.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index
                        ? 'border-primary-500'
                        : 'border-gray-200'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${solution.title} ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：方案信息 */}
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="secondary">{getCategoryName(solution.category)}</Badge>
                {solution.creator?.verified && (
                  <Badge variant="success">认证创作者</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {solution.title}
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed">
                {solution.longDescription || solution.description}
              </p>
            </div>

            {/* 评分 */}
            {solution.averageRating && solution.averageRating > 0 && (
              <div>
                {renderRating(solution.averageRating)}
              </div>
            )}

            {/* 价格 */}
            <div className="bg-primary-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">价格</p>
                  <p className="text-3xl font-bold text-primary-600">
                    {formatPrice(solution.price)}
                  </p>
                </div>
                <Button size="lg" className="px-8">
                  立即购买
                </Button>
              </div>
            </div>

            {/* 创作者信息 */}
            {solution.creator && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {solution.creator.avatar ? (
                        <Image
                          src={solution.creator.avatar}
                          alt={solution.creator.name}
                          width={48}
                          height={48}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">👤</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {solution.creator.name}
                      </h3>
                      <p className="text-sm text-gray-600">创作者</p>
                    </div>
                    <Button variant="outline" size="sm">
                      查看更多方案
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 特性列表 */}
            {solution.features && solution.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>产品特性</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {solution.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-500 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 详细信息标签页 */}
        <div className="mt-12">
          <Tabs defaultValue="specs" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="specs">技术规格</TabsTrigger>
              <TabsTrigger value="bom">BOM清单</TabsTrigger>
              <TabsTrigger value="reviews">用户评价</TabsTrigger>
            </TabsList>

            <TabsContent value="specs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>技术规格</CardTitle>
                </CardHeader>
                <CardContent>
                  {solution.specs && Object.keys(solution.specs).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(solution.specs).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                          <span className="font-medium text-gray-700 capitalize">
                            {key}
                          </span>
                          <span className="text-gray-900">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">暂无技术规格信息</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bom" className="mt-6">
              {solution.bomItems && solution.bomItems.length > 0 ? (
                <BomList items={solution.bomItems} showAdvanced={true} showStatistics={true} />
              ) : solution.bom && Object.keys(solution.bom).length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>BOM清单</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(solution.bom).map(([component, specification]) => (
                        <div key={component} className="flex justify-between items-center py-3 border-b border-gray-100">
                          <span className="font-medium text-gray-700 capitalize">
                            {component}
                          </span>
                          <span className="text-gray-900">{String(specification)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-gray-500 text-center py-8">暂无BOM清单信息</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>用户评价</CardTitle>
                </CardHeader>
                <CardContent>
                  {reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              {review.user.avatar ? (
                                <Image
                                  src={review.user.avatar}
                                  alt={review.user.name}
                                  width={40}
                                  height={40}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-sm">👤</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-medium text-gray-900">
                                  {review.user.name}
                                </h4>
                                {renderRating(review.rating)}
                              </div>
                              <p className="text-gray-600 mb-2">{review.comment}</p>
                              <p className="text-sm text-gray-400">
                                {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">暂无用户评价</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}