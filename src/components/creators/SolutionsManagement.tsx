/**
 * 方案管理组件
 */

'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Eye, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Solution {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  status: string;
  images: string[];
  orderCount: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SolutionsManagementProps {
  creatorId: string;
}

export default function SolutionsManagement({ creatorId }: SolutionsManagementProps) {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchSolutions();
  }, [page, statusFilter, searchQuery]);

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
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/creators/solutions?${params}`);
      const data = await response.json();

      if (data.success) {
        setSolutions(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setError(data.message || '获取方案列表失败');
      }
    } catch (err) {
      console.error('获取方案列表失败:', err);
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      DRAFT: { label: '草稿', variant: 'secondary' },
      PENDING_REVIEW: { label: '待审核', variant: 'default' },
      PUBLISHED: { label: '已发布', variant: 'default' },
      REJECTED: { label: '已拒绝', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading && solutions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            方案管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="sm" message="加载方案列表..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            方案管理
          </CardTitle>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            创建方案
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 搜索和筛选 */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="搜索方案..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="PENDING_REVIEW">待审核</option>
            <option value="PUBLISHED">已发布</option>
            <option value="REJECTED">已拒绝</option>
          </select>
        </div>

        {error && <ErrorMessage error={error} className="mb-4" />}

        {solutions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>暂无方案</p>
            <Button className="mt-4" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              创建第一个方案
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {solutions.map((solution) => (
              <div
                key={solution.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4 flex-1">
                  {solution.images.length > 0 && (
                    <img
                      src={solution.images[0]}
                      alt={solution.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{solution.title}</h4>
                      {getStatusBadge(solution.status)}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-1">{solution.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>分类: {solution.category}</span>
                      <span>价格: {formatCurrency(solution.price)}</span>
                      <span>订单: {solution.orderCount}</span>
                      <span>评价: {solution.reviewCount}</span>
                      <span>更新: {formatDate(solution.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    查看
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    <Trash2 className="w-4 h-4" />
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
  );
}

