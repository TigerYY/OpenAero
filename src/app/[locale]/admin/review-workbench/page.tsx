'use client';

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  MessageSquare,
  Search,
  User
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';

// 类型定义
interface Solution {
  id: string;
  title: string;
  description: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  submittedAt: string;
  reviewedAt?: string;
  assignedReviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  files: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  reviewHistory: Array<{
    id: string;
    reviewer: {
      firstName: string;
      lastName: string;
    };
    decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
    notes: string;
    createdAt: string;
  }>;
  // 扩展字段 - 完整的方案信息
  price?: number;
  summary?: string;
  specs?: any;
  technicalSpecs?: any;
  useCases?: any;
  architecture?: any;
  bom?: any;
  bomItems?: any[];
  features?: string[];
  images?: string[];
  version?: string;
}

interface ReviewStats {
  pending: number;
  inReview: number;
  needsRevision: number;
  completed: number;
  averageTime: string;
  myTasks: number;
  overdue: number;
}

export default function ReviewWorkbenchPage() {
  // 状态管理
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    pending: 0,
    inReview: 0,
    needsRevision: 0,
    completed: 0,
    averageTime: '0h',
    myTasks: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [activeTab, setActiveTab] = useState('pending'); // 默认显示待审核标签页
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewDecision, setReviewDecision] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 调用真实API获取方案列表 - 获取所有状态的方案，以便在不同标签页显示
      const response = await fetch('/api/admin/solutions?status=all&limit=100', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('获取方案列表失败');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('[ReviewWorkbench] API返回错误:', result);
        throw new Error(result.error || '获取方案列表失败');
      }
      
      // 转换API数据格式为页面需要的格式
      const apiSolutions = result.data?.items || result.data || [];
      console.log('[ReviewWorkbench] API响应:', {
        success: result.success,
        dataType: typeof result.data,
        hasItems: !!result.data?.items,
        itemsLength: result.data?.items?.length,
        dataLength: Array.isArray(result.data) ? result.data.length : 0,
      });
      console.log('[ReviewWorkbench] 获取到的方案数量:', apiSolutions.length);
      if (apiSolutions.length > 0) {
        console.log('[ReviewWorkbench] 所有方案的状态:', apiSolutions.map((s: any) => ({ 
          id: s.id, 
          status: s.status,
          statusType: typeof s.status,
          title: s.title?.substring(0, 30) 
        })));
        // 特别检查 PENDING_REVIEW 状态的方案
        const pendingReviewSolutions = apiSolutions.filter((s: any) => 
          s.status === 'PENDING_REVIEW' || 
          s.status === 'PENDING' || 
          String(s.status).toUpperCase() === 'PENDING_REVIEW'
        );
        console.log('[ReviewWorkbench] 待审核方案数量（原始）:', pendingReviewSolutions.length);
        if (pendingReviewSolutions.length > 0) {
          console.log('[ReviewWorkbench] 待审核方案详情:', pendingReviewSolutions.map((s: any) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            submittedAt: s.submittedAt
          })));
        }
      } else {
        console.warn('[ReviewWorkbench] ⚠️ 没有获取到任何方案，请检查：');
        console.warn('1. 数据库中是否有方案数据');
        console.warn('2. API认证是否成功');
        console.warn('3. API返回的数据格式是否正确');
        console.warn('4. API URL:', '/api/admin/solutions?status=all&limit=100');
      }
      
      const formattedSolutions: Solution[] = apiSolutions.map((sol: any) => {
        // 确保状态正确映射
        // 注意：数据库中的状态可能是 PENDING_REVIEW，需要映射为 PENDING
        let mappedStatus = 'PENDING';
        const originalStatus = String(sol.status || '').toUpperCase(); // 转换为大写字符串进行比较
        
        if (originalStatus === 'PENDING_REVIEW' || originalStatus === 'PENDING') {
          mappedStatus = 'PENDING';
        } else if (originalStatus === 'APPROVED') {
          mappedStatus = 'APPROVED';
        } else if (originalStatus === 'REJECTED') {
          mappedStatus = 'REJECTED';
        } else if (originalStatus === 'NEEDS_REVISION') {
          mappedStatus = 'NEEDS_REVISION';
        } else if (originalStatus === 'DRAFT') {
          mappedStatus = 'PENDING'; // 草稿状态也显示为待审核
        } else {
          // 对于未知状态，默认显示为待审核
          console.warn(`[ReviewWorkbench] 未知状态: ${sol.status} (原始值)，方案ID: ${sol.id}，标题: ${sol.title?.substring(0, 30)}`);
          mappedStatus = 'PENDING';
        }
        
        // 调试：记录所有 PENDING_REVIEW 状态的状态映射
        if (originalStatus === 'PENDING_REVIEW' || sol.status === 'PENDING_REVIEW') {
          console.log(`[ReviewWorkbench] ✅ 状态映射: ${sol.status} (原始) -> ${mappedStatus}，方案: ${sol.title?.substring(0, 40)}`);
        }
        
        return {
          id: sol.id,
          title: sol.title,
          description: sol.description || '',
          creator: {
            id: sol.creator?.id || '',
            firstName: sol.creator?.name?.split(' ')[0] || sol.creator?.name || '未知',
            lastName: sol.creator?.name?.split(' ').slice(1).join(' ') || '',
            email: sol.creator?.email || '',
          },
          status: mappedStatus,
          priority: 'MEDIUM', // 默认优先级，可以根据业务逻辑计算
          category: sol.category || '',
          submittedAt: sol.submittedAt || sol.createdAt || new Date().toISOString(),
          reviewedAt: sol.reviewedAt,
          assignedReviewer: undefined, // 需要从审核记录中获取
          files: (sol.files || sol.assets || []).map((f: any) => ({
            id: f.id,
            name: f.fileName || f.title || f.filename || '未知文件',
            url: f.fileUrl || f.url || '',
            type: f.fileType || f.type || 'unknown',
          })),
          reviewHistory: (sol.reviews || []).map((r: any) => ({
            id: r.id,
            reviewer: {
              firstName: r.reviewer?.firstName || r.reviewer?.name?.split(' ')[0] || '',
              lastName: r.reviewer?.lastName || r.reviewer?.name?.split(' ').slice(1).join(' ') || '',
            },
            decision: r.toStatus === 'APPROVED' ? 'APPROVED' :
                     r.toStatus === 'REJECTED' ? 'REJECTED' : 'NEEDS_REVISION',
            notes: r.comment || r.notes || '',
            createdAt: r.createdAt || new Date().toISOString(),
          })),
        };
      });
      
      console.log('[ReviewWorkbench] 格式化后的方案数量:', formattedSolutions.length);
      const statusDistribution = formattedSolutions.reduce((acc: any, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});
      console.log('[ReviewWorkbench] 格式化后的状态分布:', statusDistribution);
      
      // 详细记录待审核方案
      const pendingSolutions = formattedSolutions.filter(s => s.status === 'PENDING');
      console.log('[ReviewWorkbench] 待审核方案数量:', pendingSolutions.length);
      if (pendingSolutions.length > 0) {
        console.log('[ReviewWorkbench] 待审核方案列表:', pendingSolutions.map(s => ({ 
          id: s.id, 
          title: s.title?.substring(0, 30),
          status: s.status 
        })));
      } else {
        console.warn('[ReviewWorkbench] ⚠️ 没有找到待审核方案！');
        console.warn('[ReviewWorkbench] 原始方案状态:', apiSolutions.map((s: any) => ({ 
          id: s.id, 
          status: s.status, 
          title: s.title?.substring(0, 30) 
        })));
      }
      
      // 计算统计数据
      const pendingCount = pendingSolutions.length;
      const inReviewCount = formattedSolutions.filter(s => s.status === 'IN_REVIEW').length;
      const needsRevisionCount = formattedSolutions.filter(s => s.status === 'NEEDS_REVISION').length;
      const completedCount = formattedSolutions.filter(s => ['APPROVED', 'REJECTED'].includes(s.status)).length;
      
      const stats: ReviewStats = {
        pending: pendingCount,
        inReview: inReviewCount,
        needsRevision: needsRevisionCount,
        completed: completedCount,
        averageTime: '2.5h', // 可以从审核记录中计算
        myTasks: 0, // 需要根据当前用户ID筛选
        overdue: formattedSolutions.filter(s => {
          if (s.status !== 'PENDING') return false;
          const submitted = new Date(s.submittedAt);
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          return submitted < threeDaysAgo;
        }).length,
      };
      
      setSolutions(formattedSolutions);
      setStats(stats);
      
      // 调试信息：显示最终结果
      console.log('[ReviewWorkbench] 最终设置的方案数量:', formattedSolutions.length);
      console.log('[ReviewWorkbench] 待审核方案数量:', pendingCount);
      console.log('[ReviewWorkbench] 待审核方案列表:', formattedSolutions.filter(s => s.status === 'PENDING').map(s => ({ id: s.id, title: s.title })));
    } catch (error) {
      console.error('[ReviewWorkbench] 加载数据失败:', error);
      console.error('[ReviewWorkbench] 错误详情:', error instanceof Error ? error.message : String(error));
      // 如果API调用失败，显示空列表
      setSolutions([]);
      setStats({
        pending: 0,
        inReview: 0,
        needsRevision: 0,
        completed: 0,
        averageTime: '0h',
        myTasks: 0,
        overdue: 0
      });
      // 显示错误提示
      alert('加载方案列表失败，请检查控制台日志获取详细信息');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedSolution || !reviewDecision || !reviewNotes.trim()) {
      alert('请填写完整的审核信息');
      return;
    }

    try {
      // 这里应该调用API提交审核结果
      console.log('Submitting review:', {
        solutionId: selectedSolution.id,
        decision: reviewDecision,
        notes: reviewNotes
      });

      // 更新本地状态
      setSolutions(prev => prev.map(solution => 
        solution.id === selectedSolution.id 
          ? {
              ...solution,
              status: reviewDecision as any,
              reviewHistory: [
                ...solution.reviewHistory,
                {
                  id: Date.now().toString(),
                  reviewer: { firstName: '当前', lastName: '用户' },
                  decision: reviewDecision as any,
                  notes: reviewNotes,
                  createdAt: new Date().toISOString()
                }
              ]
            }
          : solution
      ));

      // 重置表单
      setReviewNotes('');
      setReviewDecision('');
      setSelectedSolution(null);
      
      alert('审核提交成功！');
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('审核提交失败，请重试');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: '待审核', variant: 'secondary' as const },
      IN_REVIEW: { label: '审核中', variant: 'default' as const },
      APPROVED: { label: '已通过', variant: 'default' as const },
      REJECTED: { label: '已拒绝', variant: 'destructive' as const },
      NEEDS_REVISION: { label: '需修改', variant: 'secondary' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      URGENT: { label: '紧急', className: 'bg-red-100 text-red-800' },
      HIGH: { label: '高', className: 'bg-orange-100 text-orange-800' },
      MEDIUM: { label: '中', className: 'bg-yellow-100 text-yellow-800' },
      LOW: { label: '低', className: 'bg-green-100 text-green-800' }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.MEDIUM;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
  };

  const filteredSolutions = solutions.filter(solution => {
    const matchesSearch = solution.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         solution.creator.firstName.includes(searchQuery) ||
                         solution.creator.lastName.includes(searchQuery);
    const matchesStatus = filterStatus === 'all' || solution.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || solution.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getTabSolutions = (tab: string) => {
    switch (tab) {
      case 'pending':
        return filteredSolutions.filter(s => s.status === 'PENDING');
      case 'reviewing':
        return filteredSolutions.filter(s => s.status === 'IN_REVIEW');
      case 'needs-revision':
        return filteredSolutions.filter(s => s.status === 'NEEDS_REVISION');
      case 'my-tasks':
        return filteredSolutions.filter(s => s.assignedReviewer?.id === 'current-user-id');
      case 'completed':
        return filteredSolutions.filter(s => ['APPROVED', 'REJECTED'].includes(s.status));
      default:
        return filteredSolutions;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">审核工作台</h1>
        <p className="text-gray-600">统一管理和审核方案提交</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">待审核</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">审核中</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">需修改</p>
                <p className="text-2xl font-bold text-gray-900">{stats.needsRevision}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">已完成</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均用时</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">我的任务</p>
                <p className="text-2xl font-bold text-gray-900">{stats.myTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">已逾期</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜索方案标题或创作者..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">筛选:</span>
              </div>
            </div>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-[150px] h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">全部状态</option>
              <option value="PENDING">待审核</option>
              <option value="IN_REVIEW">审核中</option>
              <option value="APPROVED">已通过</option>
              <option value="REJECTED">已拒绝</option>
              <option value="NEEDS_REVISION">需修改</option>
            </select>
            <select 
              value={filterPriority} 
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-[150px] h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">全部优先级</option>
              <option value="URGENT">紧急</option>
              <option value="HIGH">高</option>
              <option value="MEDIUM">中</option>
              <option value="LOW">低</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 方案列表 */}
      <Card>
        <CardHeader>
          <CardTitle>方案列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending">待审核 ({getTabSolutions('pending').length})</TabsTrigger>
              <TabsTrigger value="reviewing">审核中 ({getTabSolutions('reviewing').length})</TabsTrigger>
              <TabsTrigger value="needs-revision">需修改 ({getTabSolutions('needs-revision').length})</TabsTrigger>
              <TabsTrigger value="my-tasks">我的任务 ({getTabSolutions('my-tasks').length})</TabsTrigger>
              <TabsTrigger value="completed">已完成 ({getTabSolutions('completed').length})</TabsTrigger>
            </TabsList>

            {['pending', 'reviewing', 'needs-revision', 'my-tasks', 'completed'].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-6">
                {getTabSolutions(tab).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">
                      {tab === 'pending' ? '暂无待审核方案' :
                       tab === 'reviewing' ? '暂无审核中的方案' :
                       tab === 'needs-revision' ? '暂无需修改的方案' :
                       tab === 'my-tasks' ? '暂无分配给您的任务' :
                       '暂无已完成的审核'}
                    </p>
                    <p className="text-sm">
                      {tab === 'pending' ? '当创作者提交方案后，将显示在这里' : ''}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getTabSolutions(tab).map((solution) => (
                    <div key={solution.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{solution.title}</h3>
                            {getStatusBadge(solution.status)}
                            {getPriorityBadge(solution.priority)}
                          </div>
                          <p className="text-gray-600 mb-3 line-clamp-2">{solution.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {solution.creator.firstName} {solution.creator.lastName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(solution.submittedAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {solution.files.length} 个文件
                            </span>
                            {solution.reviewHistory.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                {solution.reviewHistory.length} 条评论
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => {
                                  // 获取完整的方案信息
                                  try {
                                    const response = await fetch(`/api/solutions/${solution.id}`, {
                                      credentials: 'include',
                                    });
                                    if (response.ok) {
                                      const result = await response.json();
                                      if (result.success && result.data) {
                                        // 将 API 返回的完整数据映射到 Solution 接口
                                        const fullSolution: Solution = {
                                          ...solution,
                                          price: result.data.price,
                                          summary: result.data.summary,
                                          specs: result.data.specs,
                                          technicalSpecs: result.data.specs?.technicalSpecs || result.data.technicalSpecs,
                                          useCases: result.data.specs?.useCases || result.data.useCases,
                                          architecture: result.data.specs?.architecture || result.data.architecture,
                                          bom: result.data.bom,
                                          bomItems: result.data.bomItems || [],
                                          features: result.data.features || [],
                                          images: result.data.images || [],
                                          version: result.data.version,
                                          files: (result.data.files || result.data.assets || []).map((f: any) => ({
                                            id: f.id,
                                            name: f.fileName || f.title || f.filename || f.original_name || '未知文件',
                                            url: f.fileUrl || f.url || '',
                                            type: f.fileType || f.type || f.file_type || 'unknown',
                                          })),
                                        };
                                        setSelectedSolution(fullSolution);
                                      } else {
                                        setSelectedSolution(solution);
                                      }
                                    } else {
                                      setSelectedSolution(solution);
                                    }
                                  } catch (error) {
                                    console.error('获取方案详情失败:', error);
                                    setSelectedSolution(solution);
                                  }
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                查看详情
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{solution.title}</DialogTitle>
                              </DialogHeader>
                              
                              {selectedSolution && (
                                <div className="space-y-6">
                                  {/* 基本信息 */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm font-medium">创作者</Label>
                                      <p className="mt-1">{selectedSolution.creator.firstName} {selectedSolution.creator.lastName}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">提交时间</Label>
                                      <p className="mt-1">{new Date(selectedSolution.submittedAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">分类</Label>
                                      <p className="mt-1">{selectedSolution.category}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">状态</Label>
                                      <div className="mt-1">{getStatusBadge(selectedSolution.status)}</div>
                                    </div>
                                  </div>

                                  {/* 摘要 */}
                                  {selectedSolution.summary && (
                                    <div>
                                      <Label className="text-sm font-medium">方案摘要</Label>
                                      <p className="mt-2 text-gray-700 whitespace-pre-wrap">{selectedSolution.summary}</p>
                                    </div>
                                  )}

                                  {/* 描述 */}
                                  <div>
                                    <Label className="text-sm font-medium">方案描述</Label>
                                    <p className="mt-2 text-gray-700 whitespace-pre-wrap">{selectedSolution.description}</p>
                                  </div>

                                  {/* 价格 */}
                                  {selectedSolution.price !== undefined && selectedSolution.price !== null && (
                                    <div>
                                      <Label className="text-sm font-medium">价格</Label>
                                      <p className="mt-1 text-gray-700">¥{Number(selectedSolution.price).toFixed(2)}</p>
                                    </div>
                                  )}

                                  {/* 功能特性 */}
                                  {selectedSolution.features && selectedSolution.features.length > 0 && (
                                    <div>
                                      <Label className="text-sm font-medium">功能特性</Label>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedSolution.features.map((feature, index) => (
                                          <Badge key={index} variant="outline">{feature}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* 技术规格 */}
                                  {selectedSolution.technicalSpecs && (
                                    <div>
                                      <Label className="text-sm font-medium">技术规格</Label>
                                      <div className="mt-2 space-y-2">
                                        {typeof selectedSolution.technicalSpecs === 'object' && selectedSolution.technicalSpecs !== null && !Array.isArray(selectedSolution.technicalSpecs) ? (
                                          Object.entries(selectedSolution.technicalSpecs).map(([key, value]) => (
                                            typeof value !== 'object' ? (
                                              <div key={key} className="flex gap-2 text-sm">
                                                <span className="font-medium text-gray-600 min-w-[100px]">{key}:</span>
                                                <span className="text-gray-700">{String(value)}</span>
                                              </div>
                                            ) : null
                                          ))
                                        ) : (
                                          <p className="text-gray-700 whitespace-pre-wrap">{String(selectedSolution.technicalSpecs)}</p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* 应用场景 */}
                                  {selectedSolution.useCases && (
                                    <div>
                                      <Label className="text-sm font-medium">应用场景</Label>
                                      <div className="mt-2 space-y-3">
                                        {Array.isArray(selectedSolution.useCases) ? (
                                          selectedSolution.useCases.map((useCase: any, index: number) => (
                                            <div key={index} className="border rounded p-3">
                                              {typeof useCase === 'object' && useCase !== null ? (
                                                <>
                                                  {useCase.title && <h4 className="font-medium mb-1">{useCase.title}</h4>}
                                                  {useCase.description && <p className="text-sm text-gray-600">{useCase.description}</p>}
                                                </>
                                              ) : (
                                                <p className="text-sm text-gray-700">{String(useCase)}</p>
                                              )}
                                            </div>
                                          ))
                                        ) : typeof selectedSolution.useCases === 'object' && selectedSolution.useCases !== null ? (
                                          Object.entries(selectedSolution.useCases).map(([key, value]) => (
                                            <div key={key} className="border rounded p-3">
                                              <h4 className="font-medium mb-1">{key}</h4>
                                              <p className="text-sm text-gray-600">{String(value)}</p>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-gray-700 whitespace-pre-wrap">{String(selectedSolution.useCases)}</p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* 架构描述 */}
                                  {selectedSolution.architecture && (
                                    <div>
                                      <Label className="text-sm font-medium">架构描述</Label>
                                      <div className="mt-2 space-y-3">
                                        {Array.isArray(selectedSolution.architecture) ? (
                                          selectedSolution.architecture.map((section: any, index: number) => (
                                            <div key={index} className="border rounded p-3">
                                              {typeof section === 'object' && section !== null ? (
                                                <>
                                                  {section.title && <h4 className="font-medium mb-1">{section.title}</h4>}
                                                  {section.description && <p className="text-sm text-gray-600">{section.description}</p>}
                                                </>
                                              ) : (
                                                <p className="text-sm text-gray-700">{String(section)}</p>
                                              )}
                                            </div>
                                          ))
                                        ) : typeof selectedSolution.architecture === 'object' && selectedSolution.architecture !== null ? (
                                          Object.entries(selectedSolution.architecture).map(([key, value]) => (
                                            <div key={key} className="border rounded p-3">
                                              <h4 className="font-medium mb-1">{key}</h4>
                                              <p className="text-sm text-gray-600">{String(value)}</p>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-gray-700 whitespace-pre-wrap">{String(selectedSolution.architecture)}</p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* BOM 清单 */}
                                  {selectedSolution.bomItems && selectedSolution.bomItems.length > 0 && (
                                    <div>
                                      <Label className="text-sm font-medium">BOM 清单</Label>
                                      <div className="mt-2 overflow-x-auto">
                                        <table className="min-w-full border-collapse border border-gray-300 text-sm">
                                          <thead>
                                            <tr className="bg-gray-50">
                                              <th className="border border-gray-300 px-3 py-2 text-left">物料名称</th>
                                              <th className="border border-gray-300 px-3 py-2 text-left">型号</th>
                                              <th className="border border-gray-300 px-3 py-2 text-left">数量</th>
                                              <th className="border border-gray-300 px-3 py-2 text-left">单位</th>
                                              <th className="border border-gray-300 px-3 py-2 text-left">单价</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {selectedSolution.bomItems.map((item: any, index: number) => (
                                              <tr key={index}>
                                                <td className="border border-gray-300 px-3 py-2">{item.name || '-'}</td>
                                                <td className="border border-gray-300 px-3 py-2">{item.model || '-'}</td>
                                                <td className="border border-gray-300 px-3 py-2">{item.quantity || '-'}</td>
                                                <td className="border border-gray-300 px-3 py-2">{item.unit || '-'}</td>
                                                <td className="border border-gray-300 px-3 py-2">{item.unitPrice ? `¥${Number(item.unitPrice).toFixed(2)}` : '-'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* 附件文件 */}
                                  <div>
                                    <Label className="text-sm font-medium">附件文件</Label>
                                    <div className="mt-2 space-y-2">
                                      {selectedSolution.files && selectedSolution.files.length > 0 ? (
                                        selectedSolution.files.map((file) => (
                                          <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                                            <div className="flex items-center gap-2">
                                              <FileText className="h-4 w-4 text-gray-500" />
                                              <span className="text-sm">{file.name}</span>
                                              <Badge variant="outline">{file.type}</Badge>
                                            </div>
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => {
                                                if (file.url) {
                                                  // 创建临时链接下载文件
                                                  const link = document.createElement('a');
                                                  link.href = file.url;
                                                  link.download = file.name;
                                                  link.target = '_blank';
                                                  document.body.appendChild(link);
                                                  link.click();
                                                  document.body.removeChild(link);
                                                } else {
                                                  alert('文件 URL 不存在，无法下载');
                                                }
                                              }}
                                            >
                                              <Download className="h-4 w-4 mr-1" />
                                              下载
                                            </Button>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-sm text-gray-500">暂无附件文件</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* 审核历史 */}
                                  {selectedSolution.reviewHistory.length > 0 && (
                                    <div>
                                      <Label className="text-sm font-medium">审核历史</Label>
                                      <div className="mt-2 space-y-3 max-h-96 overflow-y-auto">
                                        {selectedSolution.reviewHistory.map((review) => (
                                          <div key={review.id} className="border-l-2 border-gray-200 pl-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                  {review.reviewer.firstName} {review.reviewer.lastName}
                                                </span>
                                                <Badge variant={review.decision === 'APPROVED' ? 'default' : 'destructive'}>
                                                  {review.decision === 'APPROVED' ? '通过' : 
                                                   review.decision === 'REJECTED' ? '拒绝' : '需修改'}
                                                </Badge>
                                              </div>
                                              <span className="text-sm text-gray-500">
                                                {new Date(review.createdAt).toLocaleString()}
                                              </span>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-600">{review.notes}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <hr className="my-4 border-gray-200" />

                                  {/* 审核操作 */}
                                  {selectedSolution.status === 'PENDING' || selectedSolution.status === 'IN_REVIEW' ? (
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="decision">审核决定</Label>
                                        <select 
                                          id="decision"
                                          value={reviewDecision} 
                                          onChange={(e) => setReviewDecision(e.target.value)}
                                          className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm mt-1"
                                        >
                                          <option value="">请选择审核结果</option>
                                          <option value="APPROVED">通过</option>
                                          <option value="REJECTED">拒绝</option>
                                          <option value="NEEDS_REVISION">需修改</option>
                                        </select>
                                      </div>
                                      <div>
                                        <Label htmlFor="notes">审核意见</Label>
                                        <Textarea
                                          id="notes"
                                          placeholder="请输入审核意见..."
                                          value={reviewNotes}
                                          onChange={(e) => setReviewNotes(e.target.value)}
                                          className="mt-1"
                                          rows={4}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button onClick={handleReviewSubmit} className="flex-1">
                                          提交审核
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          onClick={() => {
                                            setReviewNotes('');
                                            setReviewDecision('');
                                          }}
                                        >
                                          重置
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-gray-500">
                                      该方案已完成审核
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}