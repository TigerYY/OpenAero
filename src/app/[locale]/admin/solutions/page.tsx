'use client';

import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  User, 
  Calendar,
  DollarSign,
  Tag,
  AlertCircle,
  RefreshCw,
  Filter,
  Download,
  Trash2,
  Search,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
// Removed Select imports as we're using native HTML select elements
import { formatCurrency, formatDate } from '@/lib/utils';


interface Solution {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  images: string[];
  features?: string[];
  specs: Record<string, any>;
  bom: Record<string, any>;
  creatorId: string;
  creatorName: string;
  version: number;
  tags: string[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  reviewCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ReviewHistory {
  id: string;
  solutionId: string;
  reviewerId: string;
  status: string;
  comments: string;
  decision: string;
  reviewedAt: string;
  reviewer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminSolutionsPage() {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistory[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 批量操作和筛选状态
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchAction, setBatchAction] = useState<'approve' | 'reject'>('approve');
  const [batchNotes, setBatchNotes] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  
  // 筛选状态
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    category: 'all',
    creator: '',
    dateFrom: '',
    dateTo: '',
    priceMin: '',
    priceMax: ''
  });
  const [filteredSolutions, setFilteredSolutions] = useState<Solution[]>([]);

  useEffect(() => {
    loadSolutions();
  }, []);

  // 筛选逻辑
  useEffect(() => {
    let filtered = solutions;

    // 搜索筛选
    if (filters.search) {
      filtered = filtered.filter(solution =>
        solution.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        solution.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        solution.creatorName.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // 状态筛选
    if (filters.status !== 'all') {
      filtered = filtered.filter(solution => solution.status === filters.status);
    }

    // 类别筛选
    if (filters.category !== 'all') {
      filtered = filtered.filter(solution => solution.category === filters.category);
    }

    // 创作者筛选
    if (filters.creator) {
      filtered = filtered.filter(solution =>
        solution.creatorName.toLowerCase().includes(filters.creator.toLowerCase())
      );
    }

    // 日期筛选
    if (filters.dateFrom) {
      filtered = filtered.filter(solution =>
        new Date(solution.createdAt) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(solution =>
        new Date(solution.createdAt) <= new Date(filters.dateTo)
      );
    }

    // 价格筛选
    if (filters.priceMin) {
      filtered = filtered.filter(solution =>
        parseFloat(solution.price) >= parseFloat(filters.priceMin)
      );
    }
    if (filters.priceMax) {
      filtered = filtered.filter(solution =>
        parseFloat(solution.price) <= parseFloat(filters.priceMax)
      );
    }

    setFilteredSolutions(filtered);
  }, [solutions, filters]);

  // 获取方案列表
  const loadSolutions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/solutions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('获取方案列表失败');
      }
      
      const data = await response.json();
      setSolutions(data.solutions || []);
    } catch (error) {
      console.error('获取方案列表错误:', error);
      toast.error('获取方案列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取审核历史
  const fetchReviewHistory = async (solutionId: string) => {
    try {
      const response = await fetch(`/api/admin/solutions/${solutionId}/review`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setReviewHistory(result.data || []);
      }
    } catch (error) {
      console.error('获取审核历史错误:', error);
    }
  };

  // 批量操作处理
  const handleBatchSelect = (solutionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSolutions(prev => [...prev, solutionId]);
    } else {
      setSelectedSolutions(prev => prev.filter(id => id !== solutionId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentSolutions = getCurrentSolutions();
      setSelectedSolutions(currentSolutions.map(s => s.id));
    } else {
      setSelectedSolutions([]);
    }
  };

  const handleBatchReview = async () => {
    if (selectedSolutions.length === 0) {
      toast.error('请选择要审核的方案');
      return;
    }

    if (!batchNotes.trim()) {
      toast.error('请填写审核意见');
      return;
    }

    setBatchLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard/quick-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'batch_review',
          solutionIds: selectedSolutions,
          decision: batchAction,
          notes: batchNotes
        })
      });

      if (!response.ok) {
        throw new Error('批量审核失败');
      }

      const result = await response.json();
      toast.success(`成功${batchAction === 'approve' ? '批准' : '拒绝'}了 ${result.processedCount} 个方案`);
      
      // 重新加载数据
      await loadSolutions();
      
      // 重置状态
      setSelectedSolutions([]);
      setShowBatchDialog(false);
      setBatchNotes('');
    } catch (error) {
      console.error('批量审核错误:', error);
      toast.error('批量审核失败，请重试');
    } finally {
      setBatchLoading(false);
    }
  };

  // 筛选器重置
  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      category: 'all',
      creator: '',
      dateFrom: '',
      dateTo: '',
      priceMin: '',
      priceMax: ''
    });
  };

  // 获取当前显示的方案列表
  const getCurrentSolutions = () => {
    const displaySolutions = filteredSolutions.length > 0 ? filteredSolutions : solutions;
    
    if (activeTab === 'all') {
      return displaySolutions;
    }
    
    return displaySolutions.filter(solution => {
      switch (activeTab) {
        case 'pending':
          return solution.status === 'PENDING_REVIEW';
        case 'approved':
          return solution.status === 'APPROVED';
        case 'rejected':
          return solution.status === 'REJECTED';
        default:
          return true;
      }
    });
  };

  // 提交审核
  const handleReview = async () => {
    if (!selectedSolution || !reviewNotes.trim()) {
      toast.error('请填写审核意见');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/solutions/${selectedSolution.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          decision: reviewAction,
          comments: reviewNotes
        })
      });

      if (response.ok) {
        toast.success(`方案已${reviewAction === 'approve' ? '批准' : '拒绝'}`);
        setShowReviewDialog(false);
        setReviewNotes('');
        setSelectedSolution(null);
        await loadSolutions();
      } else {
        toast.error('审核失败，请重试');
      }
    } catch (error) {
      console.error('审核错误:', error);
      toast.error('审核失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSolution = (solution: Solution) => {
    setSelectedSolution(solution);
    fetchReviewHistory(solution.id);
  };

  const handleStartReview = (action: 'approve' | 'reject') => {
    setReviewAction(action);
    setShowReviewDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PUBLISHED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return '待审核';
      case 'APPROVED':
        return '已批准';
      case 'REJECTED':
        return '已拒绝';
      case 'PUBLISHED':
        return '已发布';
      default:
        return '未知';
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedSolutions([]);
  };

  const currentSolutions = getCurrentSolutions();
  const categories = [...new Set(solutions.map(s => s.category))];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">方案审核管理</h1>
          <p className="text-gray-600 mt-2">管理和审核创作者提交的方案</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            筛选器
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
          <Button
            onClick={loadSolutions}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>
      </div>

      {/* 筛选器面板 */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">高级筛选</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">搜索</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="搜索标题、描述或创作者..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">状态</Label>
                <select 
                  value={filters.status} 
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部状态</option>
                  <option value="PENDING_REVIEW">待审核</option>
                  <option value="APPROVED">已批准</option>
                  <option value="REJECTED">已拒绝</option>
                  <option value="PUBLISHED">已发布</option>
                </select>
              </div>

              <div>
                <Label htmlFor="category">类别</Label>
                <select 
                  value={filters.category} 
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部类别</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="creator">创作者</Label>
                <Input
                  id="creator"
                  placeholder="搜索创作者..."
                  value={filters.creator}
                  onChange={(e) => setFilters(prev => ({ ...prev, creator: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="dateFrom">开始日期</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="dateTo">结束日期</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="priceMin">最低价格</Label>
                <Input
                  id="priceMin"
                  type="number"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="priceMax">最高价格</Label>
                <Input
                  id="priceMax"
                  type="number"
                  placeholder="1000"
                  value={filters.priceMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={resetFilters} variant="outline">
                重置筛选
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 批量操作栏 */}
      {selectedSolutions.length > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  已选择 {selectedSolutions.length} 个方案
                </span>
                <Button
                  onClick={() => setSelectedSolutions([])}
                  variant="outline"
                  size="sm"
                >
                  取消选择
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setBatchAction('approve');
                    setShowBatchDialog(true);
                  }}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  批量批准
                </Button>
                <Button
                  onClick={() => {
                    setBatchAction('reject');
                    setShowBatchDialog(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  批量拒绝
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">待审核</TabsTrigger>
          <TabsTrigger value="approved">已批准</TabsTrigger>
          <TabsTrigger value="rejected">已拒绝</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : currentSolutions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无方案</h3>
                <p className="text-gray-600">当前没有符合条件的方案</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* 全选控制 */}
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={selectedSolutions.length === currentSolutions.length && currentSolutions.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label className="text-sm font-medium">
                  全选 ({currentSolutions.length} 个方案)
                </Label>
              </div>

              {/* 方案列表 */}
              <div className="grid gap-6">
                {currentSolutions.map((solution) => (
                  <Card key={solution.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4 flex-1">
                          <Checkbox
                            checked={selectedSolutions.includes(solution.id)}
                            onCheckedChange={(checked) => handleBatchSelect(solution.id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">{solution.title}</CardTitle>
                            <p className="text-gray-600 mb-4">{solution.description}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {solution.creatorName}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(solution.submittedAt || solution.createdAt)}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {formatCurrency(parseFloat(solution.price))}
                              </div>
                              <div className="flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                {solution.category}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(solution.status)}>
                            {getStatusText(solution.status)}
                          </Badge>
                          <Button
                            onClick={() => handleViewSolution(solution)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            查看详情
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 方案详情对话框 */}
      <Dialog open={!!selectedSolution} onOpenChange={() => setSelectedSolution(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              方案详情
            </DialogTitle>
          </DialogHeader>
          
          {selectedSolution && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">方案标题</Label>
                  <p className="mt-1 text-sm text-gray-900">{selectedSolution.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">状态</Label>
                  <Badge className={`mt-1 ${getStatusColor(selectedSolution.status)}`}>
                    {getStatusText(selectedSolution.status)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">价格</Label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(parseFloat(selectedSolution.price))}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">类别</Label>
                  <p className="mt-1 text-sm text-gray-900">{selectedSolution.category}</p>
                </div>
              </div>

              {/* 描述 */}
              <div>
                <Label className="text-sm font-medium text-gray-700">方案描述</Label>
                <p className="mt-1 text-sm text-gray-900">{selectedSolution.description}</p>
              </div>

              {/* 创作者信息 */}
              <div>
                <Label className="text-sm font-medium text-gray-700">创作者信息</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">创作者：</span>
                      {selectedSolution.creatorName}
                    </div>
                    <div>
                      <span className="font-medium">创作者ID：</span>
                      {selectedSolution.creatorId}
                    </div>
                    <div>
                      <span className="font-medium">版本：</span>
                      v{selectedSolution.version}
                    </div>
                    <div>
                      <span className="font-medium">下载次数：</span>
                      {selectedSolution.downloadCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* 审核历史 */}
              {reviewHistory.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">审核历史</Label>
                  <div className="mt-2 space-y-3">
                    {reviewHistory.map((review) => (
                      <div key={review.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(review.decision)}>
                              {getStatusText(review.decision)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {review.reviewer.firstName} {review.reviewer.lastName}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(review.reviewedAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{review.comments}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 审核操作 */}
              {selectedSolution.status === 'PENDING_REVIEW' && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleStartReview('reject')}
                    variant="outline"
                    className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                    拒绝
                  </Button>
                  <Button
                    onClick={() => handleStartReview('approve')}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    批准
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 审核对话框 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {reviewAction === 'approve' ? '批准方案' : '拒绝方案'}
            </DialogTitle>
            <DialogDescription>
              请填写审核意见，这将发送给创作者。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reviewNotes">审核意见</Label>
              <Textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewAction === 'approve'
                    ? '请填写批准理由和建议...'
                    : '请详细说明拒绝原因和改进建议...'
                }
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowReviewDialog(false)}
              variant="outline"
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              onClick={handleReview}
              disabled={submitting || !reviewNotes.trim()}
              className={reviewAction === 'approve' ? '' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  处理中...
                </div>
              ) : (
                reviewAction === 'approve' ? '确认批准' : '确认拒绝'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量审核对话框 */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {batchAction === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              批量{batchAction === 'approve' ? '批准' : '拒绝'}方案
            </DialogTitle>
            <DialogDescription>
              您将要{batchAction === 'approve' ? '批准' : '拒绝'} {selectedSolutions.length} 个方案，请填写审核意见。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="batchNotes">批量审核意见</Label>
              <Textarea
                id="batchNotes"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                placeholder={
                  batchAction === 'approve'
                    ? '请填写批准理由和建议...'
                    : '请详细说明拒绝原因和改进建议...'
                }
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowBatchDialog(false)}
              variant="outline"
              disabled={batchLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleBatchReview}
              disabled={batchLoading || !batchNotes.trim()}
              className={batchAction === 'approve' ? '' : 'bg-red-600 hover:bg-red-700'}
            >
              {batchLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  处理中...
                </div>
              ) : (
                `确认批量${batchAction === 'approve' ? '批准' : '拒绝'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}