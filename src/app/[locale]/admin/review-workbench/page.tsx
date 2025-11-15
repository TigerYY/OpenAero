'use client';

import { 
  Search, 
  Filter, 
  Clock, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Eye,
  MessageSquare
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { AdminLayout } from '@/components/layout/AdminLayout';

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
}

interface ReviewStats {
  pending: number;
  inReview: number;
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
    completed: 0,
    averageTime: '0h',
    myTasks: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
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
      // 模拟数据加载
      const mockSolutions: Solution[] = [
        {
          id: '1',
          title: '智能航线规划算法优化',
          description: '基于机器学习的航线规划算法，可以根据天气、空域限制等因素动态调整航线',
          creator: {
            id: 'user1',
            firstName: '张',
            lastName: '三',
            email: 'zhangsan@example.com'
          },
          status: 'PENDING',
          priority: 'HIGH',
          category: '算法优化',
          submittedAt: '2024-01-15T10:30:00Z',
          files: [
            { id: 'f1', name: 'algorithm.py', url: '/files/algorithm.py', type: 'python' },
            { id: 'f2', name: 'documentation.pdf', url: '/files/doc.pdf', type: 'pdf' }
          ],
          reviewHistory: []
        },
        {
          id: '2',
          title: '飞行数据可视化组件',
          description: '实时显示飞行数据的React组件，支持多种图表类型',
          creator: {
            id: 'user2',
            firstName: '李',
            lastName: '四',
            email: 'lisi@example.com'
          },
          status: 'IN_REVIEW',
          priority: 'MEDIUM',
          category: '前端组件',
          submittedAt: '2024-01-14T14:20:00Z',
          assignedReviewer: {
            id: 'reviewer1',
            firstName: '王',
            lastName: '五'
          },
          files: [
            { id: 'f3', name: 'FlightDataChart.tsx', url: '/files/chart.tsx', type: 'typescript' }
          ],
          reviewHistory: [
            {
              id: 'r1',
              reviewer: { firstName: '王', lastName: '五' },
              decision: 'NEEDS_REVISION',
              notes: '组件性能需要优化，建议使用React.memo',
              createdAt: '2024-01-14T16:00:00Z'
            }
          ]
        }
      ];

      const mockStats: ReviewStats = {
        pending: 12,
        inReview: 8,
        completed: 45,
        averageTime: '2.5h',
        myTasks: 5,
        overdue: 3
      };

      setSolutions(mockSolutions);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to load data:', error);
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">待审核 ({getTabSolutions('pending').length})</TabsTrigger>
              <TabsTrigger value="reviewing">审核中 ({getTabSolutions('reviewing').length})</TabsTrigger>
              <TabsTrigger value="my-tasks">我的任务 ({getTabSolutions('my-tasks').length})</TabsTrigger>
              <TabsTrigger value="completed">已完成 ({getTabSolutions('completed').length})</TabsTrigger>
            </TabsList>

            {['pending', 'reviewing', 'my-tasks', 'completed'].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-6">
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
                                onClick={() => setSelectedSolution(solution)}
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

                                  {/* 描述 */}
                                  <div>
                                    <Label className="text-sm font-medium">方案描述</Label>
                                    <p className="mt-2 text-gray-700 whitespace-pre-wrap">{selectedSolution.description}</p>
                                  </div>

                                  {/* 附件文件 */}
                                  <div>
                                    <Label className="text-sm font-medium">附件文件</Label>
                                    <div className="mt-2 space-y-2">
                                      {selectedSolution.files.map((file) => (
                                        <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                                          <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm">{file.name}</span>
                                            <Badge variant="outline">{file.type}</Badge>
                                          </div>
                                          <Button variant="outline" size="sm">
                                            <Download className="h-4 w-4 mr-1" />
                                            下载
                                          </Button>
                                        </div>
                                      ))}
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
                  
                  {getTabSolutions(tab).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>暂无{tab === 'pending' ? '待审核' : tab === 'reviewing' ? '审核中' : tab === 'my-tasks' ? '我的任务' : '已完成'}的方案</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}