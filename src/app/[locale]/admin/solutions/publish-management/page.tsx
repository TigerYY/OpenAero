'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Send,
  Eye,
  Search,
  Filter,
  CheckSquare,
  Square,
  MoreVertical,
  RefreshCw,
  Archive,
  AlertCircle,
} from 'lucide-react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { useRouting } from '@/lib/routing';
import { getStatusText, getStatusColor } from '@/lib/solution-status-workflow';

interface Solution {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  price: number;
  creator: {
    id: string;
    name: string;
  };
  publishedAt?: string;
  optimizedAt?: string;
  publishing?: {
    isFeatured: boolean;
    featuredOrder?: number;
  };
}

export default function PublishManagementPage() {
  const { route } = useRouting();
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSolutions, setSelectedSolutions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'READY_TO_PUBLISH' | 'PUBLISHED' | 'SUSPENDED' | 'all'>('all');
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [batchAction, setBatchAction] = useState<'publish' | 'suspend' | 'restore' | null>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  useEffect(() => {
    loadSolutions();
  }, [statusFilter]);

  const loadSolutions = async () => {
    try {
      setLoading(true);
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const response = await fetch(
        `/api/admin/solutions?status=${status || 'all'}&limit=100`,
        { credentials: 'include' }
      );
      const result = await response.json();
      if (result.success) {
        const items = result.data?.items || result.data || [];
        setSolutions(items);
      }
    } catch (error) {
      console.error('加载方案失败:', error);
      toast.error('加载方案列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSolution = (solutionId: string) => {
    setSelectedSolutions(prev => {
      const next = new Set(prev);
      if (next.has(solutionId)) {
        next.delete(solutionId);
      } else {
        next.add(solutionId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedSolutions.size === filteredSolutions.length) {
      setSelectedSolutions(new Set());
    } else {
      setSelectedSolutions(new Set(filteredSolutions.map(s => s.id)));
    }
  };

  const handleBatchAction = async (action: 'publish' | 'suspend' | 'restore') => {
    if (selectedSolutions.size === 0) {
      toast.error('请至少选择一个方案');
      return;
    }

    if (selectedSolutions.size > 10) {
      toast.error('最多只能选择 10 个方案');
      return;
    }

    setBatchAction(action);
    setShowBatchDialog(true);
  };

  const confirmBatchAction = async () => {
    if (!batchAction) return;

    try {
      const solutionIds = Array.from(selectedSolutions);
      let endpoint = '';
      let actionName = '';

      switch (batchAction) {
        case 'publish':
          endpoint = '/api/admin/solutions/batch-publish';
          actionName = '发布';
          break;
        case 'suspend':
          endpoint = '/api/admin/solutions/batch-suspend';
          actionName = '临时下架';
          break;
        case 'restore':
          endpoint = '/api/admin/solutions/batch-restore';
          actionName = '恢复';
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ solutionIds }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`${actionName}成功：${result.data.successCount} 个方案`);
        if (result.data.failures && result.data.failures.length > 0) {
          toast.warning(`失败：${result.data.failures.length} 个方案`);
        }
        setSelectedSolutions(new Set());
        await loadSolutions();
      } else {
        throw new Error(result.error || `${actionName}失败`);
      }
    } catch (error) {
      console.error('批量操作失败:', error);
      toast.error(`批量操作失败：${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setShowBatchDialog(false);
      setBatchAction(null);
    }
  };

  const handlePreview = async (solutionId: string) => {
    try {
      const response = await fetch(`/api/admin/solutions/${solutionId}/preview`, {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSelectedSolution(result.data);
          setShowPreviewDialog(true);
        }
      }
    } catch (error) {
      console.error('获取预览失败:', error);
      toast.error('获取预览失败');
    }
  };

  const handleOptimize = (solutionId: string) => {
    window.location.href = `/zh-CN/admin/solutions/${solutionId}/optimize`;
  };

  const handlePublish = async (solutionId: string) => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'PUBLISH' }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('方案已发布');
        await loadSolutions();
      } else {
        throw new Error(result.error || '发布失败');
      }
    } catch (error) {
      toast.error(`发布失败：${error instanceof Error ? error.message : '请重试'}`);
    }
  };

  const handleSuspend = async (solutionId: string) => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'SUSPEND' }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('方案已临时下架');
        await loadSolutions();
      } else {
        throw new Error(result.error || '操作失败');
      }
    } catch (error) {
      toast.error(`操作失败：${error instanceof Error ? error.message : '请重试'}`);
    }
  };

  const handleRestore = async (solutionId: string) => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'RESTORE' }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('方案已恢复发布');
        await loadSolutions();
      } else {
        throw new Error(result.error || '恢复失败');
      }
    } catch (error) {
      toast.error(`恢复失败：${error instanceof Error ? error.message : '请重试'}`);
    }
  };

  const filteredSolutions = solutions.filter(solution => {
    const matchesSearch = solution.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         solution.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || solution.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getActionButtons = (solution: Solution) => {
    const buttons = [];
    
    if (solution.status === 'READY_TO_PUBLISH') {
      buttons.push(
        <Button
          key="preview"
          variant="outline"
          size="sm"
          onClick={() => handlePreview(solution.id)}
        >
          <Eye className="h-4 w-4 mr-1" />
          预览
        </Button>,
        <Button
          key="publish"
          size="sm"
          onClick={() => handlePublish(solution.id)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Send className="h-4 w-4 mr-1" />
          发布
        </Button>
      );
    } else if (solution.status === 'APPROVED') {
      buttons.push(
        <Button
          key="optimize"
          variant="outline"
          size="sm"
          onClick={() => handleOptimize(solution.id)}
        >
          优化
        </Button>
      );
    } else if (solution.status === 'PUBLISHED') {
      buttons.push(
        <Button
          key="suspend"
          variant="outline"
          size="sm"
          onClick={() => handleSuspend(solution.id)}
        >
          临时下架
        </Button>
      );
    } else if (solution.status === 'SUSPENDED') {
      buttons.push(
        <Button
          key="restore"
          size="sm"
          onClick={() => handleRestore(solution.id)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          恢复
        </Button>
      );
    }
    
    return buttons;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">发布管理</h1>
          <p className="text-gray-600">管理方案的发布、下架和恢复</p>
        </div>

        {/* 筛选和搜索 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索方案标题或描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-[200px] h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">全部状态</option>
                <option value="READY_TO_PUBLISH">准备发布</option>
                <option value="PUBLISHED">已发布</option>
                <option value="SUSPENDED">临时下架</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 批量操作工具栏 */}
        {selectedSolutions.size > 0 && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    已选择 {selectedSolutions.size} 个方案
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedSolutions.size === filteredSolutions.length ? '取消全选' : '全选'}
                  </Button>
                </div>
                <div className="flex gap-2">
                  {statusFilter === 'READY_TO_PUBLISH' && (
                    <Button
                      size="sm"
                      onClick={() => handleBatchAction('publish')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      批量发布
                    </Button>
                  )}
                  {statusFilter === 'PUBLISHED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBatchAction('suspend')}
                    >
                      批量临时下架
                    </Button>
                  )}
                  {statusFilter === 'SUSPENDED' && (
                    <Button
                      size="sm"
                      onClick={() => handleBatchAction('restore')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      批量恢复
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSolutions(new Set())}
                  >
                    取消选择
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 方案列表 */}
        <Card>
          <CardHeader>
            <CardTitle>
              方案列表 ({filteredSolutions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSolutions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">暂无方案</p>
                <p className="text-sm">
                  {statusFilter === 'READY_TO_PUBLISH' ? '没有准备发布的方案' :
                   statusFilter === 'PUBLISHED' ? '没有已发布的方案' :
                   statusFilter === 'SUSPENDED' ? '没有临时下架的方案' :
                   '没有符合条件的方案'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSolutions.map((solution) => (
                  <div
                    key={solution.id}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                      selectedSolutions.has(solution.id) ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedSolutions.has(solution.id)}
                        onChange={() => handleSelectSolution(solution.id)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{solution.title}</h3>
                          <Badge className={getStatusColor(solution.status as any)}>
                            {getStatusText(solution.status as any)}
                          </Badge>
                          {solution.publishing?.isFeatured && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              推荐
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3 line-clamp-2">{solution.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>分类: {solution.category}</span>
                          <span>价格: ¥{solution.price.toFixed(2)}</span>
                          <span>创作者: {solution.creator.name}</span>
                          {solution.publishedAt && (
                            <span>发布时间: {new Date(solution.publishedAt).toLocaleDateString()}</span>
                          )}
                          {solution.optimizedAt && (
                            <span>优化时间: {new Date(solution.optimizedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {getActionButtons(solution)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 批量操作确认对话框 */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {batchAction === 'publish' ? '确认批量发布' :
               batchAction === 'suspend' ? '确认批量临时下架' :
               '确认批量恢复'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              确定要{batchAction === 'publish' ? '发布' :
                      batchAction === 'suspend' ? '临时下架' :
                      '恢复'}选中的 {selectedSolutions.size} 个方案吗？
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
              取消
            </Button>
            <Button onClick={confirmBatchAction}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览对话框 */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>发布预览</DialogTitle>
          </DialogHeader>
          {selectedSolution && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold">{selectedSolution.title}</h3>
                {selectedSolution.publishing?.publishDescription && (
                  <p className="mt-2 text-gray-700">{selectedSolution.publishing.publishDescription}</p>
                )}
              </div>
              {/* 可以添加更多预览内容 */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

