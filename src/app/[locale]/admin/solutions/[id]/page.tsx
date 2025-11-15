'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Eye,
  Star,
  AlertCircle,
} from 'lucide-react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { BomList, BomListItem } from '@/components/solutions';
import { ReviewHistory, ReviewRecord } from '@/components/solutions/ReviewHistory';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRouting } from '@/lib/routing';
import { getStatusText, getStatusColor } from '@/lib/solution-status-workflow';

interface SolutionAsset {
  id: string;
  type: 'IMAGE' | 'PDF' | 'CAD' | 'VIDEO' | 'OTHER';
  url: string;
  title?: string;
  description?: string;
}

interface Solution {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  price: number;
  version: number;
  tags: string[];
  specs: Record<string, any>;
  bomItems?: BomListItem[];
  assets?: SolutionAsset[];
  creatorId: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewCount: number;
  downloadCount: number;
}

function AdminSolutionDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { route, routes } = useRouting();
  const solutionId = params.id as string;

  const [solution, setSolution] = useState<Solution | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 审核对话框状态
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // 评分表单状态（拒绝时可选）
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [qualityScore, setQualityScore] = useState<number>(5);
  const [completeness, setCompleteness] = useState<number>(5);
  const [innovation, setInnovation] = useState<number>(5);
  const [marketPotential, setMarketPotential] = useState<number>(5);

  // 图片预览状态
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImagePreview, setShowImagePreview] = useState(false);

  useEffect(() => {
    fetchSolution();
    fetchReviewHistory();
  }, [solutionId]);

  const fetchSolution = async () => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('获取方案详情失败');
      }

      const result = await response.json();
      if (result.success) {
        setSolution(result.data);
      } else {
        setError(result.error || '获取方案详情失败');
      }
    } catch (err) {
      console.error('获取方案详情错误:', err);
      setError('获取方案详情失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewHistory = async () => {
    try {
      const response = await fetch(`/api/admin/solutions/${solutionId}/review`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setReviewHistory(result.data || []);
        }
      }
    } catch (err) {
      console.error('获取审核历史错误:', err);
    }
  };

  const handleReview = async () => {
    if (!reviewNotes.trim()) {
      toast.error('请填写审核意见');
      return;
    }

    if (reviewAction === 'reject' && reviewNotes.trim().length < 10) {
      toast.error('拒绝时审核意见至少需要10个字符');
      return;
    }

    setSubmitting(true);
    try {
      const reviewData: any = {
        decision: reviewAction === 'approve' ? 'APPROVED' : 'REJECTED',
        comments: reviewNotes,
      };

      // 如果拒绝且填写了评分，添加评分信息
      if (reviewAction === 'reject' && showScoreForm) {
        reviewData.qualityScore = qualityScore;
        reviewData.completeness = completeness;
        reviewData.innovation = innovation;
        reviewData.marketPotential = marketPotential;
      }

      const response = await fetch(`/api/admin/solutions/${solutionId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '审核失败');
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`方案已${reviewAction === 'approve' ? '批准' : '拒绝'}`);
        setShowReviewDialog(false);
        setReviewNotes('');
        setShowScoreForm(false);
        // 重新加载数据
        await fetchSolution();
        await fetchReviewHistory();
        // 如果批准，可能需要跳转到列表页
        if (reviewAction === 'approve') {
          router.push(route(routes.ADMIN.SOLUTIONS));
        }
      } else {
        throw new Error(result.error || '审核失败');
      }
    } catch (err) {
      console.error('审核错误:', err);
      toast.error(err instanceof Error ? err.message : '审核失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewDialog = (action: 'approve' | 'reject') => {
    setReviewAction(action);
    setReviewNotes('');
    setShowScoreForm(false);
    setShowReviewDialog(true);
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <ImageIcon className="w-5 h-5" />;
      case 'PDF':
        return <FileText className="w-5 h-5" />;
      case 'CAD':
        return <FileText className="w-5 h-5" />;
      case 'VIDEO':
        return <Eye className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const formatSpecs = (specs: Record<string, any>): string => {
    try {
      return JSON.stringify(specs, null, 2);
    } catch {
      return String(specs);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !solution) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">方案未找到</h1>
            <p className="text-gray-600 mb-6">{error || '请求的方案不存在或已被删除'}</p>
            <Button onClick={() => router.push(route(routes.ADMIN.SOLUTIONS))}>
              返回方案列表
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const imageAssets = solution.assets?.filter(a => a.type === 'IMAGE') || [];
  const otherAssets = solution.assets?.filter(a => a.type !== 'IMAGE') || [];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 头部导航 */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push(route(routes.ADMIN.SOLUTIONS))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回方案列表
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{solution.title}</h1>
                <Badge className={getStatusColor(solution.status)}>
                  {getStatusText(solution.status)}
                </Badge>
              </div>
              <p className="text-gray-600 mb-4">{solution.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>创作者: {solution.creatorName}</span>
                <span>•</span>
                <span>版本: v{solution.version}</span>
                <span>•</span>
                <span>创建时间: {formatDate(solution.createdAt)}</span>
                {solution.submittedAt && (
                  <>
                    <span>•</span>
                    <span>提交时间: {formatDate(solution.submittedAt)}</span>
                  </>
                )}
              </div>
            </div>

            {/* 审核操作按钮 */}
            {solution.status === 'PENDING_REVIEW' && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => openReviewDialog('reject')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  拒绝
                </Button>
                <Button onClick={() => openReviewDialog('approve')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  批准
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主要内容 */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="specs">技术规格</TabsTrigger>
                <TabsTrigger value="bom">BOM 清单</TabsTrigger>
                <TabsTrigger value="assets">资产文件</TabsTrigger>
                <TabsTrigger value="history">审核历史</TabsTrigger>
              </TabsList>

              {/* 概览 */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>基本信息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">类别</Label>
                        <p className="mt-1 text-sm text-gray-900">{solution.category}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">价格</Label>
                        <p className="mt-1 text-sm text-gray-900">{formatCurrency(solution.price)}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">版本</Label>
                        <p className="mt-1 text-sm text-gray-900">v{solution.version}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">下载次数</Label>
                        <p className="mt-1 text-sm text-gray-900">{solution.downloadCount}</p>
                      </div>
                    </div>

                    {solution.tags && solution.tags.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium text-gray-700">标签</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {solution.tags.map((tag, index) => (
                            <Badge key={index} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 图片预览 */}
                {imageAssets.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>方案图片</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {imageAssets.map((asset, index) => (
                          <div
                            key={asset.id}
                            className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              setSelectedImageIndex(index);
                              setShowImagePreview(true);
                            }}
                          >
                            <img
                              src={asset.url}
                              alt={asset.title || `图片 ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {asset.title && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                                {asset.title}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 技术规格 */}
              <TabsContent value="specs">
                <Card>
                  <CardHeader>
                    <CardTitle>技术规格</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {solution.specs && Object.keys(solution.specs).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(solution.specs).map(([key, value]) => (
                          <div key={key} className="border-b border-gray-200 pb-3">
                            <Label className="text-sm font-medium text-gray-700">{key}</Label>
                            <p className="mt-1 text-sm text-gray-900">
                              {typeof value === 'object' ? formatSpecs(value) : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">暂无技术规格信息</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* BOM 清单 */}
              <TabsContent value="bom">
                {solution.bomItems && solution.bomItems.length > 0 ? (
                  <BomList items={solution.bomItems} showAdvanced={true} showStatistics={true} />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-gray-500 text-center py-8">暂无 BOM 清单信息</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 资产文件 */}
              <TabsContent value="assets" className="space-y-4">
                {otherAssets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherAssets.map((asset) => (
                      <Card key={asset.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              {getAssetIcon(asset.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {asset.title || `文件 ${asset.id.slice(0, 8)}`}
                              </h4>
                              {asset.description && (
                                <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                              )}
                              <Badge variant="outline" className="mb-2">
                                {asset.type}
                              </Badge>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(asset.url, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  查看
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = asset.url;
                                    link.download = asset.title || 'download';
                                    link.click();
                                  }}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  下载
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-gray-500 text-center py-8">暂无资产文件</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 审核历史 */}
              <TabsContent value="history">
                <ReviewHistory reviews={reviewHistory} loading={false} />
              </TabsContent>
            </Tabs>
          </div>

          {/* 右侧操作区 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {solution.status === 'PENDING_REVIEW' && (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => openReviewDialog('approve')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      批准方案
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => openReviewDialog('reject')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      拒绝方案
                    </Button>
                  </>
                )}

                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">方案统计</Label>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">审核次数</span>
                      <span className="font-medium">{solution.reviewCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">下载次数</span>
                      <span className="font-medium">{solution.downloadCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">BOM 项数</span>
                      <span className="font-medium">{solution.bomItems?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">资产数量</span>
                      <span className="font-medium">{solution.assets?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 审核对话框 */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl">
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
                <Label htmlFor="reviewNotes">
                  审核意见 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'approve'
                      ? '请填写批准理由和建议...'
                      : '请详细说明拒绝原因和改进建议（至少10个字符）...'
                  }
                  rows={6}
                  className="mt-1"
                />
                {reviewAction === 'reject' && reviewNotes.length > 0 && reviewNotes.length < 10 && (
                  <p className="text-sm text-red-500 mt-1">
                    拒绝时审核意见至少需要10个字符（当前: {reviewNotes.length}）
                  </p>
                )}
              </div>

              {/* 拒绝时的评分表单（可选） */}
              {reviewAction === 'reject' && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="showScoreForm"
                      checked={showScoreForm}
                      onChange={(e) => setShowScoreForm(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="showScoreForm" className="cursor-pointer">
                      填写评分（可选）
                    </Label>
                  </div>

                  {showScoreForm && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="qualityScore">质量评分 (1-10)</Label>
                        <Input
                          id="qualityScore"
                          type="number"
                          min="1"
                          max="10"
                          value={qualityScore}
                          onChange={(e) => setQualityScore(Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="completeness">完整性评分 (1-10)</Label>
                        <Input
                          id="completeness"
                          type="number"
                          min="1"
                          max="10"
                          value={completeness}
                          onChange={(e) => setCompleteness(Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="innovation">创新性评分 (1-10)</Label>
                        <Input
                          id="innovation"
                          type="number"
                          min="1"
                          max="10"
                          value={innovation}
                          onChange={(e) => setInnovation(Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="marketPotential">市场潜力评分 (1-10)</Label>
                        <Input
                          id="marketPotential"
                          type="number"
                          min="1"
                          max="10"
                          value={marketPotential}
                          onChange={(e) => setMarketPotential(Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                disabled={submitting || !reviewNotes.trim() || (reviewAction === 'reject' && reviewNotes.trim().length < 10)}
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

        {/* 图片预览对话框 */}
        {showImagePreview && imageAssets.length > 0 && (
          <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  {imageAssets[selectedImageIndex]?.title || `图片 ${selectedImageIndex + 1}`}
                </DialogTitle>
              </DialogHeader>
              <div className="relative">
                <img
                  src={imageAssets[selectedImageIndex].url}
                  alt={imageAssets[selectedImageIndex].title || `图片 ${selectedImageIndex + 1}`}
                  className="w-full h-auto rounded-lg"
                />
                {imageAssets.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                      onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : imageAssets.length - 1))}
                    >
                      ←
                    </Button>
                    <Button
                      variant="outline"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      onClick={() => setSelectedImageIndex((prev) => (prev < imageAssets.length - 1 ? prev + 1 : 0))}
                    >
                      →
                    </Button>
                  </>
                )}
              </div>
              {imageAssets[selectedImageIndex].description && (
                <p className="text-sm text-gray-600 mt-4">
                  {imageAssets[selectedImageIndex].description}
                </p>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminSolutionDetailPage() {
  return (
    <AdminRoute>
      <AdminSolutionDetailContent />
    </AdminRoute>
  );
}

