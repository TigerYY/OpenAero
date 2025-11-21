/**
 * 方案列表组件
 * 从 solutions 页面提取，用于整合到 dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRouting } from '@/lib/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { 
  Plus, 
  Edit, 
  Eye, 
  Clock, 
  FileText,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getStatusText, getStatusColor } from '@/lib/solution-status-workflow';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

interface Solution {
  id: string;
  title: string;
  description: string;
  summary?: string;
  category: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'ARCHIVED' | 'NEEDS_REVISION';
  price: number;
  version: number;
  tags: string[];
  images: string[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  lastReviewedAt?: string | null;
  publishedAt?: string | null;
  reviewCount: number;
  assetCount: number;
  bomItemCount: number;
  previewAssets?: Array<{
    id: string;
    type: string;
    url: string;
    title?: string;
  }>;
  reviewFeedback?: {
    comment: string | null;
    reviewedAt: string | null;
  } | null;
}

interface SolutionsListProps {
  showHeader?: boolean;
}

export default function SolutionsList({ showHeader = true }: SolutionsListProps) {
  const router = useRouter();
  const { route, routes, routeWithDynamicParams } = useRouting();

  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // 获取方案列表
  const fetchSolutions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`/api/solutions/mine?${params.toString()}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        // createPaginatedResponse 返回的数据结构是 { items, pagination }
        const items = data.data?.items || data.data?.solutions || data.data || [];
        const pagination = data.data?.pagination || {};
        
        setSolutions(Array.isArray(items) ? items : []);
        setTotal(pagination.total || data.data?.total || 0);
        setTotalPages(pagination.totalPages || data.data?.totalPages || 1);
      } else {
        setError(data.error || data.message || '获取方案列表失败');
      }
    } catch (err) {
      console.error('获取方案列表失败:', err);
      setError('获取方案列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, [page, statusFilter]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchSolutions();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 提交审核
  const handleSubmit = async (solutionId: string) => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}/submit`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('方案已提交审核');
        fetchSolutions();
      } else {
        toast.error(data.error || data.message || '提交失败');
      }
    } catch (err) {
      console.error('提交方案失败:', err);
      toast.error('提交方案失败，请稍后重试');
    }
  };

  // 查看审核历史
  const handleViewReviews = async (solutionId: string) => {
    setSelectedSolutionId(solutionId);
    setShowReviewDialog(true);
    setLoadingReviews(true);
    
    try {
      const response = await fetch(`/api/admin/solutions/${solutionId}/review`, {
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setReviewHistory(result.data);
      } else {
        toast.error(result.error || '获取审核历史失败');
        setReviewHistory([]);
      }
    } catch (error) {
      console.error('获取审核历史失败:', error);
      toast.error('获取审核历史失败，请稍后重试');
      setReviewHistory([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <LoadingSpinner />
        <p className="text-gray-600 ml-2">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 始终显示标题和新建按钮 */}
      <div className="flex items-center justify-between">
        {showHeader ? (
          <>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">我的方案</h2>
              <p className="mt-1 text-gray-600">管理您创建的所有方案</p>
            </div>
            <Button
              onClick={() => router.push(route(routes.CREATORS.SOLUTION_NEW))}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              新建方案
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">我的方案</h2>
              <p className="mt-1 text-gray-600">管理您创建的所有方案，支持保存多个草稿</p>
            </div>
            <Button
              onClick={() => router.push(route(routes.CREATORS.SOLUTION_NEW))}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              新建方案
            </Button>
          </div>
        )}
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="搜索方案标题或描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 状态筛选 */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                全部
              </Button>
              <Button
                variant={statusFilter === 'DRAFT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('DRAFT')}
              >
                草稿
              </Button>
              <Button
                variant={statusFilter === 'PENDING_REVIEW' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('PENDING_REVIEW')}
              >
                待审核
              </Button>
              <Button
                variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('APPROVED')}
              >
                已批准
              </Button>
              <Button
                variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('REJECTED')}
              >
                已拒绝
              </Button>
              <Button
                variant={statusFilter === 'PUBLISHED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('PUBLISHED')}
              >
                已发布
              </Button>
              <Button
                variant={statusFilter === 'NEEDS_REVISION' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('NEEDS_REVISION')}
              >
                需修改
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 方案列表 */}
      {solutions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">暂无方案</p>
            <Button
              onClick={() => router.push(route(routes.CREATORS.SOLUTION_NEW))}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              创建第一个方案
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {solutions.map((solution) => (
            <Card key={solution.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {solution.title}
                      </h3>
                      <Badge className={solution.status === 'NEEDS_REVISION' ? 'bg-yellow-100 text-yellow-800' : getStatusColor(solution.status as any)}>
                        {solution.status === 'NEEDS_REVISION' ? '需修改' : getStatusText(solution.status as any)}
                      </Badge>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {solution.summary || solution.description}
                    </p>
                    {solution.status === 'NEEDS_REVISION' && solution.reviewFeedback?.comment && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm font-medium text-yellow-800 mb-1">审核反馈：</p>
                        <p className="text-sm text-yellow-700">{solution.reviewFeedback.comment}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span>分类: {solution.category}</span>
                      <span>版本: v{solution.version}</span>
                      <span>价格: ¥{solution.price.toFixed(2)}</span>
                      <span>资产: {solution.assetCount} 个</span>
                      <span>BOM项: {solution.bomItemCount} 个</span>
                      {solution.lastReviewedAt && (
                        <span>
                          最后审核: {new Date(solution.lastReviewedAt).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                      <span>
                        更新时间: {new Date(solution.updatedAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {(solution.status === 'DRAFT' || solution.status === 'REJECTED' || solution.status === 'NEEDS_REVISION') && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(routeWithDynamicParams(routes.CREATORS.SOLUTION_EDIT, { id: solution.id }))}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          {solution.status === 'NEEDS_REVISION' ? '修改方案' : '编辑'}
                        </Button>
                        {solution.status !== 'NEEDS_REVISION' && (
                          <Button
                            className="bg-primary-600 hover:bg-primary-700 text-white"
                            size="sm"
                            onClick={() => handleSubmit(solution.id)}
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            提交审核
                          </Button>
                        )}
                        {solution.status === 'NEEDS_REVISION' && (
                          <Button
                            className="bg-primary-600 hover:bg-primary-700 text-white"
                            size="sm"
                            onClick={() => handleSubmit(solution.id)}
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            重新提交审核
                          </Button>
                        )}
                      </>
                    )}
                    
                    {solution.status === 'PENDING_REVIEW' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReviews(solution.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        查看审核
                      </Button>
                    )}

                    {solution.reviewCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReviews(solution.id)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        审核历史 ({solution.reviewCount})
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <span className="text-sm text-gray-600">
            第 {page} / {totalPages} 页，共 {total} 个方案
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 审核历史对话框 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>审核历史</DialogTitle>
            <DialogDescription>
              查看方案的审核记录和反馈
            </DialogDescription>
          </DialogHeader>

          {loadingReviews ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <p className="text-gray-600 ml-2">加载中...</p>
            </div>
          ) : reviewHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>暂无审核记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewHistory.map((review) => (
                <div
                  key={review.id}
                  className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {review.reviewer?.firstName || ''} {review.reviewer?.lastName || ''}
                        {!review.reviewer?.firstName && !review.reviewer?.lastName && '系统'}
                      </span>
                      {review.fromStatus && review.toStatus && (
                        <Badge variant="outline" className="text-xs">
                          {getStatusText(review.fromStatus)} → {getStatusText(review.toStatus)}
                        </Badge>
                      )}
                      {review.decision && (
                        <Badge
                          className={
                            review.decision === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : review.decision === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {review.decision === 'APPROVED'
                            ? '通过'
                            : review.decision === 'REJECTED'
                            ? '拒绝'
                            : '需修改'}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {review.reviewedAt
                        ? new Date(review.reviewedAt).toLocaleString('zh-CN')
                        : review.createdAt
                        ? new Date(review.createdAt).toLocaleString('zh-CN')
                        : '未知时间'}
                    </span>
                  </div>

                  {review.comments && (
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                      {review.comments}
                    </p>
                  )}

                  {review.decisionNotes && (
                    <p className="text-sm text-gray-600 mt-2 italic whitespace-pre-wrap">
                      备注: {review.decisionNotes}
                    </p>
                  )}

                  {review.suggestions && review.suggestions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">建议：</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {review.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(review.score || review.qualityScore || review.completeness || review.innovation || review.marketPotential) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {review.score && (
                        <span className="text-gray-600">
                          总分: <span className="font-semibold">{review.score}</span>
                        </span>
                      )}
                      {review.qualityScore && (
                        <span className="text-gray-600">
                          质量: <span className="font-semibold">{review.qualityScore}</span>
                        </span>
                      )}
                      {review.completeness && (
                        <span className="text-gray-600">
                          完整性: <span className="font-semibold">{review.completeness}</span>
                        </span>
                      )}
                      {review.innovation && (
                        <span className="text-gray-600">
                          创新性: <span className="font-semibold">{review.innovation}</span>
                        </span>
                      )}
                      {review.marketPotential && (
                        <span className="text-gray-600">
                          市场潜力: <span className="font-semibold">{review.marketPotential}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
