'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouting } from '@/lib/routing';
import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
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
  CheckCircle, 
  XCircle, 
  FileText,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { getStatusText, getStatusColor } from '@/lib/solution-status-workflow';

interface Solution {
  id: string;
  title: string;
  description: string;
  summary?: string;
  category: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'ARCHIVED';
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
}

export default function CreatorSolutionsPage() {
  return (
    <ProtectedRoute>
      <DefaultLayout>
        <CreatorSolutionsContent />
      </DefaultLayout>
    </ProtectedRoute>
  );
}

function CreatorSolutionsContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { route, routes } = useRouting();

  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // 检查用户是否为创作者
  useEffect(() => {
    if (!authLoading && user && profile) {
      const userRoles = profile.roles 
        ? (Array.isArray(profile.roles) ? profile.roles : [profile.roles]) 
        : (profile.role ? [profile.role] : []);
      
      if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
        router.push(route('/'));
        toast.error('只有创作者可以访问此页面');
      }
    }
  }, [authLoading, user, profile, router, route]);

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
        setSolutions(data.data.solutions || data.data || []);
        setTotal(data.data.total || 0);
        setTotalPages(data.data.totalPages || 1);
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
    if (user && !authLoading) {
      fetchSolutions();
    }
  }, [user, authLoading, page, statusFilter]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && !authLoading) {
        setPage(1);
        fetchSolutions();
      }
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
  const handleViewReviews = (solutionId: string) => {
    router.push(route(`/admin/solutions/${solutionId}`));
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
        <p className="text-gray-600 ml-2">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题和操作 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的方案</h1>
            <p className="mt-2 text-gray-600">管理您创建的所有方案</p>
          </div>
          <Button
            onClick={() => router.push(route(routes.CREATORS.SOLUTION_NEW))}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            新建方案
          </Button>
        </div>

        {/* 筛选和搜索 */}
        <Card className="mb-6">
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
                  已通过
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
              </div>

              {/* 刷新按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSolutions}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
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
                        <Badge className={getStatusColor(solution.status)}>
                          {getStatusText(solution.status)}
                        </Badge>
                      </div>

                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {solution.summary || solution.description}
                      </p>

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
                      {(solution.status === 'DRAFT' || solution.status === 'REJECTED') && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(route(routes.CREATORS.SOLUTION_EDIT.replace('[id]', solution.id)))}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                          <Button
                            className="bg-primary-600 hover:bg-primary-700 text-white"
                            size="sm"
                            onClick={() => handleSubmit(solution.id)}
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            提交审核
                          </Button>
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
          <div className="mt-6 flex items-center justify-center gap-2">
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
      </div>
    </div>
  );
}

