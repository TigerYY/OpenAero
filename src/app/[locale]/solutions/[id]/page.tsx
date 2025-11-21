'use client';

import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Package,
  Star,
  Tag as TagIcon,
  User,
  Video,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { UpgradeSolutionDialog } from '@/components/creators/UpgradeSolutionDialog';
import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { BomList, BomListItem } from '@/components/solutions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useRouting } from '@/lib/routing';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SolutionAsset {
  id: string;
  type: 'IMAGE' | 'PDF' | 'CAD' | 'VIDEO' | 'OTHER';
  url: string;
  title?: string;
  description?: string;
}

interface MediaLink {
  type: 'VIDEO' | 'DEMO' | 'TUTORIAL' | 'DOCUMENTATION' | 'OTHER';
  title: string;
  url: string;
  thumbnail?: string;
}

interface ProductLink {
  productId: string;
  productName: string;
  productSku: string;
  productUrl: string;
  relationType: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  description?: string;
}

interface Solution {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  price: number;
  version: number;
  tags: string[];
  specs: Record<string, any>;
  useCases?: Record<string, any>;
  architecture?: Record<string, any>;
  bomItems?: BomListItem[];
  assets?: SolutionAsset[];
  creatorId: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  // 优化数据
  mediaLinks?: MediaLink[];
  productLinks?: ProductLink[];
  featuredTags?: string[];
  isFeatured?: boolean;
  // 升级关系
  upgradedFromId?: string;
  upgradedFromVersion?: number;
  upgradeNotes?: string;
  isUpgrade?: boolean;
}

export default function PublicSolutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { route, routes } = useRouting();
  const solutionId = params.id as string;

  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [upgradeHistory, setUpgradeHistory] = useState<Solution[]>([]);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    fetchSolution();
  }, [solutionId]);

  const fetchSolution = async () => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('方案不存在或未发布');
        } else {
          throw new Error('获取方案详情失败');
        }
        return;
      }

      const result = await response.json();
      if (result.success) {
        // 确保方案状态为 PUBLISHED（API 已经处理，但前端再次检查）
        if (result.data.status !== 'PUBLISHED') {
          setError('方案不存在或未发布');
          return;
        }
        setSolution(result.data);
        
        // 如果有升级关系，获取升级历史
        if (result.data.upgradedFromId) {
          fetchUpgradeHistory(result.data.upgradedFromId);
        }
        // 如果这个方案被升级过，也获取升级历史
        fetchUpgradeHistory(solutionId);
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

  const fetchUpgradeHistory = async (solutionId: string) => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}/upgrade-history`, {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUpgradeHistory(result.data);
        }
      }
    } catch (error) {
      console.error('获取升级历史失败:', error);
    }
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

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <ImageIcon className="w-5 h-5" />;
      case 'PDF':
        return <FileText className="w-5 h-5" />;
      case 'CAD':
        return <FileText className="w-5 h-5" />;
      case 'VIDEO':
        return <Video className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (error || !solution) {
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">方案未找到</h1>
            <p className="text-gray-600 mb-6">{error || '请求的方案不存在或已被删除'}</p>
            <Button onClick={() => router.push(route(routes.BUSINESS.SOLUTIONS))}>
              返回方案列表
            </Button>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  const imageAssets = solution.assets?.filter(a => a.type === 'IMAGE') || [];
  const otherAssets = solution.assets?.filter(a => a.type !== 'IMAGE') || [];
  const architectureAssets = solution.assets?.filter(
    a => a.type === 'IMAGE' && (a.title?.toLowerCase().includes('架构') || a.title?.toLowerCase().includes('结构'))
  ) || [];

  return (
    <DefaultLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 面包屑导航 */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push(route(routes.BUSINESS.SOLUTIONS))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回方案列表
          </Button>
        </div>

        {/* 头部信息 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Badge variant="secondary">{getCategoryName(solution.category)}</Badge>
            {solution.isFeatured && (
              <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                <Star className="w-3 h-3" />
                推荐方案
              </Badge>
            )}
            {solution.isUpgrade && solution.upgradedFromId && (
              <Badge variant="outline" className="flex items-center gap-1 border-purple-300 text-purple-700">
                <ArrowUpRight className="w-3 h-3" />
                升级版本
              </Badge>
            )}
            {solution.tags && solution.tags.length > 0 && (
              <>
                {solution.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    <TagIcon className="w-3 h-3" />
                    {tag}
                  </Badge>
                ))}
              </>
            )}
            {solution.featuredTags && solution.featuredTags.length > 0 && (
              <>
                {solution.featuredTags.map((tag, index) => (
                  <Badge key={`featured-${index}`} className="bg-purple-100 text-purple-800">
                    {tag}
                  </Badge>
                ))}
              </>
            )}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{solution.title}</h1>
          <p className="text-xl text-gray-600 mb-6 leading-relaxed">{solution.description}</p>
          
          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>创作者: {solution.creatorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>版本: v{solution.version}</span>
            </div>
            {solution.publishedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>发布时间: {formatDate(solution.publishedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 主要内容 */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="specs">技术规格</TabsTrigger>
            <TabsTrigger value="usecases">应用场景</TabsTrigger>
            <TabsTrigger value="bom">BOM 清单</TabsTrigger>
            <TabsTrigger value="assets">资产文件</TabsTrigger>
          </TabsList>

          {/* 概览 */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* 价格和购买 */}
            <Card>
              <CardHeader>
                <CardTitle>方案价格</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">方案价格</p>
                    <p className="text-4xl font-bold text-primary-600">
                      {formatCurrency(solution.price)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="lg" className="px-8">
                      <Download className="w-5 h-5 mr-2" />
                      立即购买
                    </Button>
                    {isCreator && (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setShowUpgradeDialog(true)}
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <ArrowUpRight className="w-5 h-5 mr-2" />
                        升级方案
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 升级关系信息 */}
            {solution.upgradedFromId && solution.upgradeNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-purple-600" />
                    升级说明
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-2">{solution.upgradeNotes}</p>
                  <p className="text-sm text-gray-500">
                    基于版本 v{solution.upgradedFromVersion} 升级
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 升级历史 */}
            {upgradeHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>升级历史</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upgradeHistory.map((upgraded) => (
                      <div key={upgraded.id} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{upgraded.title}</h4>
                            {upgraded.upgradeNotes && (
                              <p className="text-sm text-gray-600 mt-1">{upgraded.upgradeNotes}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              版本 v{upgraded.version} · {formatDate(upgraded.createdAt)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/zh-CN/solutions/${upgraded.id}`)}
                          >
                            查看
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 媒体链接 */}
            {solution.mediaLinks && solution.mediaLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>相关媒体</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {solution.mediaLinks.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {link.type === 'VIDEO' && <Video className="w-5 h-5 text-red-600" />}
                        {link.type === 'DEMO' && <ImageIcon className="w-5 h-5 text-blue-600" />}
                        {link.type === 'TUTORIAL' && <FileText className="w-5 h-5 text-green-600" />}
                        <div className="flex-1">
                          <p className="font-medium">{link.title}</p>
                          <p className="text-sm text-gray-500 truncate">{link.url}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 商品链接 */}
            {solution.productLinks && solution.productLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>相关商品</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {solution.productLinks.map((link, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{link.productName}</p>
                          <p className="text-sm text-gray-500">SKU: {link.productSku}</p>
                          {link.description && (
                            <p className="text-sm text-gray-600 mt-1">{link.description}</p>
                          )}
                          <Badge
                            variant="outline"
                            className="mt-2"
                          >
                            {link.relationType === 'REQUIRED' ? '必需' :
                             link.relationType === 'RECOMMENDED' ? '推荐' : '可选'}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(link.productUrl, '_blank')}
                        >
                          <LinkIcon className="w-4 h-4 mr-1" />
                          查看商品
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 方案结构图 */}
            {architectureAssets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>方案结构图</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {architectureAssets.map((asset, index) => (
                      <div
                        key={asset.id}
                        className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setSelectedImageIndex(imageAssets.findIndex(a => a.id === asset.id));
                          setShowImagePreview(true);
                        }}
                      >
                        <img
                          src={asset.url}
                          alt={asset.title || `结构图 ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                        {asset.title && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-sm p-2">
                            {asset.title}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 图片轮播 */}
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
          <TabsContent value="specs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>技术规格</CardTitle>
              </CardHeader>
              <CardContent>
                {solution.specs && Object.keys(solution.specs).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(solution.specs).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-3 border-b border-gray-100">
                        <span className="font-medium text-gray-700 capitalize">{key}</span>
                        <span className="text-gray-900">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">暂无技术规格信息</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 应用场景 */}
          <TabsContent value="usecases" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>应用场景</CardTitle>
              </CardHeader>
              <CardContent>
                {solution.useCases && Object.keys(solution.useCases).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(solution.useCases).map(([key, value]) => (
                      <div key={key} className="border-l-4 border-primary-500 pl-4">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{key}</h3>
                        <p className="text-gray-600">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">暂无应用场景信息</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOM 清单 */}
          <TabsContent value="bom" className="mt-6">
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
          <TabsContent value="assets" className="mt-6">
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
                          <Badge variant="outline" className="mb-3">
                            {asset.type}
                          </Badge>
                          <div className="flex gap-2 mt-3">
                            {asset.type === 'VIDEO' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(asset.url, '_blank')}
                              >
                                <Video className="w-4 h-4 mr-1" />
                                播放
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(asset.url, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                查看
                              </Button>
                            )}
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
        </Tabs>

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

        {/* 升级方案对话框 */}
        {solution && isCreator && (
          <UpgradeSolutionDialog
            open={showUpgradeDialog}
            onOpenChange={setShowUpgradeDialog}
            solutionId={solution.id}
            solutionTitle={solution.title}
          />
        )}
      </div>
    </DefaultLayout>
  );
}

