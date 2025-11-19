'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useRouting } from '@/lib/routing';
import { AlertCircle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Application {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  bio?: string;
  website?: string | null;
  experience?: string;
  specialties?: string[];
  portfolio?: string[];
  documents?: string[];
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export default function AdminApplicationsPage() {
  const router = useRouter();
  const { route, routes } = useRouting();
  const { profile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetailApplication, setSelectedDetailApplication] = useState<Application | null>(null);

  // 检查管理员权限（使用 roles 数组）
  useEffect(() => {
    if (profile) {
      const userRoles = Array.isArray(profile.roles) 
        ? profile.roles 
        : (profile.role ? [profile.role] : []);
      
      if (!userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN') && !userRoles.includes('REVIEWER')) {
        router.push(route(routes.BUSINESS.HOME));
        toast.error('您没有权限访问此页面');
      }
    }
  }, [profile, router, route]);

  // 获取申请列表
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const statusParam = filter === 'all' ? '' : `?status=${filter}`;
      const response = await fetch(`/api/admin/applications${statusParam}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success) {
        // API 返回的是分页数据结构: { items: [...], pagination: {...} }
        const applications = result.data?.items || result.data || [];
        setApplications(Array.isArray(applications) ? applications : []);
      } else {
        toast.error(result.error || '获取申请列表失败');
      }
    } catch (error) {
      console.error('获取申请列表失败:', error);
      toast.error('获取申请列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      const userRoles = Array.isArray(profile.roles) 
        ? profile.roles 
        : (profile.role ? [profile.role] : []);
      
      if (userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN') || userRoles.includes('REVIEWER')) {
        fetchApplications();
      }
    }
  }, [filter, profile]);

  // 审核申请
  const handleReview = async () => {
    if (!selectedApplication) return;

    try {
      const response = await fetch('/api/admin/applications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          action: reviewAction,
          notes: reviewNotes || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`申请已${reviewAction === 'approve' ? '批准' : '拒绝'}`);
        setReviewDialogOpen(false);
        setSelectedApplication(null);
        setReviewNotes('');
        fetchApplications();
      } else {
        toast.error(result.error || '审核失败');
      }
    } catch (error) {
      console.error('审核失败:', error);
      toast.error('审核失败');
    }
  };

  const openReviewDialog = (application: Application, action: 'approve' | 'reject') => {
    setSelectedApplication(application);
    setReviewAction(action);
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">待审核</Badge>;
      case 'APPROVED':
        return <Badge variant="success">已通过</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">已拒绝</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredApplications = filter === 'all' 
    ? applications 
    : applications.filter(app => app.status === filter);

  if (!profile) {
    return null;
  }
  
  const userRoles = Array.isArray(profile.roles) 
    ? profile.roles 
    : (profile.role ? [profile.role] : []);
    
  if (!userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN') && !userRoles.includes('REVIEWER')) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">创作者申请管理</h1>
          <p className="text-gray-600 mt-2">审核和管理创作者申请</p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="PENDING">待审核</TabsTrigger>
            <TabsTrigger value="APPROVED">已通过</TabsTrigger>
            <TabsTrigger value="REJECTED">已拒绝</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">加载中...</span>
              </div>
            ) : filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">暂无申请记录</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => (
                  <Card key={app.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {app.user.firstName || app.user.lastName
                                ? `${app.user.firstName || ''} ${app.user.lastName || ''}`.trim()
                                : app.user.email}
                            </h3>
                            {getStatusBadge(app.status)}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>用户ID: {app.userId.substring(0, 20)}...</p>
                            <p>邮箱: {app.user.email}</p>
                            <p>提交时间: {new Date(app.submittedAt).toLocaleString('zh-CN')}</p>
                            {app.reviewedAt && (
                              <p>审核时间: {new Date(app.reviewedAt).toLocaleString('zh-CN')}</p>
                            )}
                            {app.reviewNotes && (
                              <p className="text-red-600">审核意见: {app.reviewNotes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDetailApplication(app);
                              setDetailDialogOpen(true);
                            }}
                          >
                            详情
                          </Button>
                          {app.status === 'PENDING' && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => openReviewDialog(app, 'approve')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                批准
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => openReviewDialog(app, 'reject')}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                拒绝
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 详情对话框 */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>申请详情</DialogTitle>
              <DialogDescription>
                查看创作者申请的详细信息
              </DialogDescription>
            </DialogHeader>
            {selectedDetailApplication && (
              <div className="space-y-6">
                {/* 用户信息 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">用户信息</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><span className="font-medium">姓名:</span> {
                      selectedDetailApplication.user.firstName || selectedDetailApplication.user.lastName
                        ? `${selectedDetailApplication.user.firstName || ''} ${selectedDetailApplication.user.lastName || ''}`.trim()
                        : '未填写'
                    }</p>
                    <p><span className="font-medium">邮箱:</span> {selectedDetailApplication.user.email}</p>
                    <p><span className="font-medium">用户ID:</span> {selectedDetailApplication.userId}</p>
                    <p><span className="font-medium">提交时间:</span> {new Date(selectedDetailApplication.submittedAt).toLocaleString('zh-CN')}</p>
                    {selectedDetailApplication.reviewedAt && (
                      <p><span className="font-medium">审核时间:</span> {new Date(selectedDetailApplication.reviewedAt).toLocaleString('zh-CN')}</p>
                    )}
                  </div>
                </div>

                {/* 个人简介 */}
                {selectedDetailApplication.bio && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">个人简介</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedDetailApplication.bio}</p>
                    </div>
                  </div>
                )}

                {/* 相关经验 */}
                {selectedDetailApplication.experience && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">相关经验</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      {(() => {
                        // 解析经验文本，提取结构化信息
                        const experienceText = selectedDetailApplication.experience;
                        const lines = experienceText.split('\n\n').filter(line => line.trim());
                        
                        const experienceData: {
                          yearsOfExperience?: string;
                          education?: string;
                          previousWork?: string;
                          skills?: string[];
                        } = {};
                        
                        lines.forEach(line => {
                          if (line.startsWith('工作经验：')) {
                            experienceData.yearsOfExperience = line.replace('工作经验：', '').trim();
                          } else if (line.startsWith('教育背景：')) {
                            experienceData.education = line.replace('教育背景：', '').trim();
                          } else if (line.startsWith('项目经验：')) {
                            experienceData.previousWork = line.replace('项目经验：', '').trim();
                          } else if (line.startsWith('技能标签：')) {
                            const skillsText = line.replace('技能标签：', '').trim();
                            experienceData.skills = skillsText.split('、').filter(s => s.trim());
                          }
                        });
                        
                        return (
                          <>
                            {experienceData.yearsOfExperience && (
                              <div>
                                <p className="font-medium text-gray-700 mb-1">工作经验</p>
                                <p className="text-gray-600">{experienceData.yearsOfExperience}</p>
                              </div>
                            )}
                            {experienceData.education && (
                              <div>
                                <p className="font-medium text-gray-700 mb-1">教育背景</p>
                                <p className="text-gray-600">{experienceData.education}</p>
                              </div>
                            )}
                            {experienceData.previousWork && (
                              <div>
                                <p className="font-medium text-gray-700 mb-1">项目经验</p>
                                <p className="text-gray-600 whitespace-pre-wrap">{experienceData.previousWork}</p>
                              </div>
                            )}
                            {experienceData.skills && experienceData.skills.length > 0 && (
                              <div>
                                <p className="font-medium text-gray-700 mb-2">技能标签</p>
                                <div className="flex flex-wrap gap-2">
                                  {experienceData.skills.map((skill, index) => (
                                    <Badge key={index} variant="secondary">{skill}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* 如果没有解析到结构化信息，显示原始文本 */}
                            {!experienceData.yearsOfExperience && 
                             !experienceData.education && 
                             !experienceData.previousWork && 
                             (!experienceData.skills || experienceData.skills.length === 0) && (
                              <p className="whitespace-pre-wrap">{experienceText}</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* 专长领域 */}
                {selectedDetailApplication.specialties && selectedDetailApplication.specialties.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">专长领域</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {selectedDetailApplication.specialties.map((specialty, index) => (
                          <Badge key={index} variant="secondary">{specialty}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 网站 */}
                {selectedDetailApplication.website && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">个人网站</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <a 
                        href={selectedDetailApplication.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedDetailApplication.website}
                      </a>
                    </div>
                  </div>
                )}

                {/* 作品集 */}
                {selectedDetailApplication.portfolio && selectedDetailApplication.portfolio.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">作品集链接</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {selectedDetailApplication.portfolio.map((url, index) => (
                        <a 
                          key={index}
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline break-all"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 文档 */}
                {selectedDetailApplication.documents && selectedDetailApplication.documents.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">相关文档</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {selectedDetailApplication.documents.map((url, index) => (
                        <a 
                          key={index}
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline break-all"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 审核意见 */}
                {selectedDetailApplication.reviewNotes && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">审核意见</h3>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-red-800">{selectedDetailApplication.reviewNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                关闭
              </Button>
              {selectedDetailApplication?.status === 'PENDING' && (
                <>
                  <Button
                    variant="success"
                    onClick={() => {
                      setDetailDialogOpen(false);
                      openReviewDialog(selectedDetailApplication, 'approve');
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    批准
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDetailDialogOpen(false);
                      openReviewDialog(selectedDetailApplication, 'reject');
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    拒绝
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 审核对话框 */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewAction === 'approve' ? '批准申请' : '拒绝申请'}
              </DialogTitle>
              <DialogDescription>
                {reviewAction === 'approve'
                  ? '确认批准此创作者申请？'
                  : '请填写拒绝原因（可选）'}
              </DialogDescription>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    申请人: {selectedApplication.user.firstName || selectedApplication.user.lastName
                      ? `${selectedApplication.user.firstName || ''} ${selectedApplication.user.lastName || ''}`.trim()
                      : selectedApplication.user.email}
                  </p>
                </div>
                {reviewAction === 'reject' && (
                  <div>
                    <Label htmlFor="reviewNotes">拒绝原因（可选）</Label>
                    <Textarea
                      id="reviewNotes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="请输入拒绝原因..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                取消
              </Button>
              <Button
                variant={reviewAction === 'approve' ? 'success' : 'danger'}
                onClick={handleReview}
              >
                确认{reviewAction === 'approve' ? '批准' : '拒绝'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

