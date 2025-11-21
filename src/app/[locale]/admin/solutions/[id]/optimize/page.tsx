'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Eye,
  X,
  Plus,
  Link as LinkIcon,
  Search,
  Tag,
  Star,
  Globe,
  Image as ImageIcon,
  Video,
  FileText,
} from 'lucide-react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useRouting } from '@/lib/routing';

interface MediaLink {
  type: 'VIDEO' | 'DEMO' | 'TUTORIAL' | 'DOCUMENTATION' | 'OTHER';
  title: string;
  url: string;
  thumbnail?: string;
  description?: string;
  duration?: number;
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
  images: string[];
  features: string[];
  tags: string[];
  creator: {
    id: string;
    name: string;
  };
}

interface PublishingData {
  publishDescription?: string;
  mediaLinks?: MediaLink[];
  productLinks?: ProductLink[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  featuredTags?: string[];
  featuredOrder?: number;
  isFeatured?: boolean;
  optimizationNotes?: string;
}

export default function OptimizeSolutionPage() {
  const params = useParams();
  const router = useRouter();
  const { route } = useRouting();
  const solutionId = params.id as string;

  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // 表单数据
  const [formData, setFormData] = useState<PublishingData>({
    publishDescription: '',
    mediaLinks: [],
    productLinks: [],
    metaTitle: '',
    metaDescription: '',
    metaKeywords: [],
    featuredTags: [],
    featuredOrder: undefined,
    isFeatured: false,
    optimizationNotes: '',
  });

  // 临时输入状态
  const [newMediaLink, setNewMediaLink] = useState<Partial<MediaLink>>({
    type: 'VIDEO',
    title: '',
    url: '',
  });
  const [newProductLink, setNewProductLink] = useState<Partial<ProductLink>>({
    relationType: 'RECOMMENDED',
    productId: '',
    productName: '',
    productSku: '',
    productUrl: '',
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [newTag, setNewTag] = useState('');
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [searchProductResults, setSearchProductResults] = useState<any[]>([]);

  useEffect(() => {
    fetchSolution();
    fetchPublishingData();
  }, [solutionId]);

  const fetchSolution = async () => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        setSolution(result.data);
        // 初始化表单数据
        setFormData(prev => ({
          ...prev,
          metaTitle: result.data.title,
          metaDescription: result.data.description?.substring(0, 200) || '',
          metaKeywords: result.data.tags || [],
          featuredTags: result.data.features || [],
        }));
      }
    } catch (error) {
      console.error('获取方案失败:', error);
      toast.error('获取方案信息失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublishingData = async () => {
    try {
      // 从预览 API 获取现有的发布数据
      const response = await fetch(`/api/admin/solutions/${solutionId}/preview`, {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;
          setFormData({
            publishDescription: data.publishDescription || '',
            mediaLinks: data.mediaLinks || [],
            productLinks: data.productLinks || [],
            metaTitle: data.metaTitle || data.title,
            metaDescription: data.metaDescription || data.description?.substring(0, 200) || '',
            metaKeywords: data.metaKeywords || data.tags || [],
            featuredTags: data.featuredTags || [],
            featuredOrder: data.featuredOrder || undefined,
            isFeatured: data.isFeatured || false,
            optimizationNotes: '',
          });
        }
      }
    } catch (error) {
      console.error('获取发布数据失败:', error);
      // 忽略错误，使用默认值
    }
  };

  const handleAddMediaLink = () => {
    if (!newMediaLink.title || !newMediaLink.url) {
      toast.error('请填写标题和URL');
      return;
    }
    setFormData(prev => ({
      ...prev,
      mediaLinks: [...(prev.mediaLinks || []), newMediaLink as MediaLink],
    }));
    setNewMediaLink({ type: 'VIDEO', title: '', url: '' });
    toast.success('媒体链接已添加');
  };

  const handleRemoveMediaLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mediaLinks: prev.mediaLinks?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSearchProducts = async () => {
    if (!searchProductQuery.trim()) {
      setSearchProductResults([]);
      return;
    }
    try {
      const response = await fetch(`/api/admin/products?search=${encodeURIComponent(searchProductQuery)}&limit=10`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        setSearchProductResults(result.data?.items || result.data || []);
      }
    } catch (error) {
      console.error('搜索商品失败:', error);
    }
  };

  const handleSelectProduct = (product: any) => {
    setNewProductLink({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productUrl: `/products/${product.id}`,
      relationType: 'RECOMMENDED',
    });
    setSearchProductResults([]);
    setSearchProductQuery('');
  };

  const handleAddProductLink = () => {
    if (!newProductLink.productId || !newProductLink.productName) {
      toast.error('请选择商品');
      return;
    }
    setFormData(prev => ({
      ...prev,
      productLinks: [...(prev.productLinks || []), newProductLink as ProductLink],
    }));
    setNewProductLink({
      relationType: 'RECOMMENDED',
      productId: '',
      productName: '',
      productSku: '',
      productUrl: '',
    });
    toast.success('商品链接已添加');
  };

  const handleRemoveProductLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      productLinks: prev.productLinks?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    setFormData(prev => ({
      ...prev,
      metaKeywords: [...(prev.metaKeywords || []), newKeyword.trim()],
    }));
    setNewKeyword('');
  };

  const handleRemoveKeyword = (index: number) => {
    setFormData(prev => ({
      ...prev,
      metaKeywords: prev.metaKeywords?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    setFormData(prev => ({
      ...prev,
      featuredTags: [...(prev.featuredTags || []), newTag.trim()],
    }));
    setNewTag('');
  };

  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      featuredTags: prev.featuredTags?.filter((_, i) => i !== index) || [],
    }));
  };

  const handlePreview = async () => {
    try {
      const response = await fetch(`/api/admin/solutions/${solutionId}/preview`, {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPreviewData(result.data);
          setShowPreview(true);
        }
      }
    } catch (error) {
      console.error('获取预览失败:', error);
      toast.error('获取预览失败');
    }
  };

  const handleSave = async (publishDirectly: boolean = false) => {
    try {
      setSaving(true);

      // 保存优化数据
      const response = await fetch(`/api/admin/solutions/${solutionId}/optimize`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          publishDescription: formData.publishDescription || undefined,
          mediaLinks: formData.mediaLinks || undefined,
          productLinks: formData.productLinks || undefined,
          metaTitle: formData.metaTitle || undefined,
          metaDescription: formData.metaDescription || undefined,
          metaKeywords: formData.metaKeywords || undefined,
          featuredTags: formData.featuredTags || undefined,
          featuredOrder: formData.featuredOrder || undefined,
          isFeatured: formData.isFeatured || undefined,
          optimizationNotes: formData.optimizationNotes || undefined,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '保存失败');
      }

      toast.success('优化数据已保存');

      // 如果直接发布
      if (publishDirectly) {
        const publishResponse = await fetch(`/api/solutions/${solutionId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'PUBLISH' }),
        });

        const publishResult = await publishResponse.json();
        if (publishResult.success) {
          toast.success('方案已发布');
          router.push('/zh-CN/admin/review-workbench');
        } else {
          throw new Error(publishResult.error || '发布失败');
        }
      } else {
        // 返回审核工作台
        router.push('/zh-CN/admin/review-workbench');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error(`保存失败：${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setSaving(false);
    }
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

  if (!solution) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600">方案不存在</p>
            <Button onClick={() => router.back()} className="mt-4">返回</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">上架优化</h1>
              <p className="text-gray-600 mt-1">{solution.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
            >
              <Eye className="h-4 w-4 mr-2" />
              预览
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              保存优化
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              保存并发布
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：优化表单 */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="content">内容优化</TabsTrigger>
                <TabsTrigger value="media">媒体链接</TabsTrigger>
                <TabsTrigger value="products">商品链接</TabsTrigger>
                <TabsTrigger value="seo">SEO 优化</TabsTrigger>
              </TabsList>

              {/* 内容优化 */}
              <TabsContent value="content" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>上架说明</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label htmlFor="publishDescription">上架说明（可选）</Label>
                    <Textarea
                      id="publishDescription"
                      placeholder="为这个方案添加专门的上架说明，将显示在公共页面..."
                      value={formData.publishDescription || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, publishDescription: e.target.value }))}
                      rows={6}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      上架说明将覆盖方案的原始描述，用于更好的商品化展示
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>推荐设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isFeatured"
                        checked={formData.isFeatured || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="isFeatured" className="cursor-pointer">
                        设为推荐方案
                      </Label>
                    </div>
                    {formData.isFeatured && (
                      <div>
                        <Label htmlFor="featuredOrder">推荐排序</Label>
                        <Input
                          id="featuredOrder"
                          type="number"
                          min="1"
                          value={formData.featuredOrder || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, featuredOrder: e.target.value ? parseInt(e.target.value) : undefined }))}
                          className="mt-2"
                          placeholder="数字越小越靠前"
                        />
                      </div>
                    )}
                    <div>
                      <Label>推荐标签</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          placeholder="输入标签后按回车"
                        />
                        <Button onClick={handleAddTag} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.featuredTags?.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(index)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 媒体链接 */}
              <TabsContent value="media" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>媒体链接</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>添加媒体链接</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newMediaLink.type}
                          onChange={(e) => setNewMediaLink(prev => ({ ...prev, type: e.target.value as MediaLink['type'] }))}
                          className="rounded-md border border-gray-300 px-3 py-2"
                        >
                          <option value="VIDEO">视频</option>
                          <option value="DEMO">演示</option>
                          <option value="TUTORIAL">教程</option>
                          <option value="DOCUMENTATION">文档</option>
                          <option value="OTHER">其他</option>
                        </select>
                        <Input
                          placeholder="标题"
                          value={newMediaLink.title || ''}
                          onChange={(e) => setNewMediaLink(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <Input
                        placeholder="URL"
                        value={newMediaLink.url || ''}
                        onChange={(e) => setNewMediaLink(prev => ({ ...prev, url: e.target.value }))}
                      />
                      <Input
                        placeholder="缩略图 URL（可选）"
                        value={newMediaLink.thumbnail || ''}
                        onChange={(e) => setNewMediaLink(prev => ({ ...prev, thumbnail: e.target.value }))}
                      />
                      <Button onClick={handleAddMediaLink} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        添加
                      </Button>
                    </div>

                    {formData.mediaLinks && formData.mediaLinks.length > 0 && (
                      <div className="space-y-2">
                        <Label>已添加的媒体链接</Label>
                        {formData.mediaLinks.map((link, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {link.type === 'VIDEO' && <Video className="h-5 w-5 text-red-600" />}
                              {link.type === 'DEMO' && <ImageIcon className="h-5 w-5 text-blue-600" />}
                              {link.type === 'TUTORIAL' && <FileText className="h-5 w-5 text-green-600" />}
                              <div>
                                <p className="font-medium">{link.title}</p>
                                <p className="text-sm text-gray-500">{link.url}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMediaLink(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 商品链接 */}
              <TabsContent value="products" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>商品链接</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>搜索并添加商品</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="搜索商品名称或SKU"
                          value={searchProductQuery}
                          onChange={(e) => setSearchProductQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchProducts())}
                        />
                        <Button onClick={handleSearchProducts} size="sm">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      {searchProductResults.length > 0 && (
                        <div className="border rounded-lg max-h-48 overflow-y-auto">
                          {searchProductResults.map((product) => (
                            <div
                              key={product.id}
                              className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => handleSelectProduct(product)}
                            >
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {newProductLink.productId && (
                        <div className="p-3 border rounded-lg bg-gray-50">
                          <p className="font-medium">{newProductLink.productName}</p>
                          <p className="text-sm text-gray-500">SKU: {newProductLink.productSku}</p>
                          <div className="mt-2">
                            <Label>关联类型</Label>
                            <select
                              value={newProductLink.relationType}
                              onChange={(e) => setNewProductLink(prev => ({ ...prev, relationType: e.target.value as ProductLink['relationType'] }))}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 mt-1"
                            >
                              <option value="REQUIRED">必需</option>
                              <option value="RECOMMENDED">推荐</option>
                              <option value="OPTIONAL">可选</option>
                            </select>
                          </div>
                          <Button onClick={handleAddProductLink} size="sm" className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            添加商品链接
                          </Button>
                        </div>
                      )}
                    </div>

                    {formData.productLinks && formData.productLinks.length > 0 && (
                      <div className="space-y-2">
                        <Label>已添加的商品链接</Label>
                        {formData.productLinks.map((link, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{link.productName}</p>
                              <p className="text-sm text-gray-500">
                                {link.relationType === 'REQUIRED' ? '必需' :
                                 link.relationType === 'RECOMMENDED' ? '推荐' : '可选'}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveProductLink(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SEO 优化 */}
              <TabsContent value="seo" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>SEO 优化</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="metaTitle">SEO 标题</Label>
                      <Input
                        id="metaTitle"
                        value={formData.metaTitle || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                        className="mt-2"
                        placeholder="用于搜索引擎的标题（建议 50-60 字符）"
                      />
                    </div>
                    <div>
                      <Label htmlFor="metaDescription">SEO 描述</Label>
                      <Textarea
                        id="metaDescription"
                        value={formData.metaDescription || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                        className="mt-2"
                        rows={4}
                        placeholder="用于搜索引擎的描述（建议 150-160 字符）"
                      />
                    </div>
                    <div>
                      <Label>SEO 关键词</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                          placeholder="输入关键词后按回车"
                        />
                        <Button onClick={handleAddKeyword} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.metaKeywords?.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {keyword}
                            <button
                              onClick={() => handleRemoveKeyword(index)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* 右侧：方案信息预览 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>方案信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>标题</Label>
                  <p className="mt-1 font-medium">{solution.title}</p>
                </div>
                <div>
                  <Label>分类</Label>
                  <p className="mt-1">{solution.category}</p>
                </div>
                <div>
                  <Label>价格</Label>
                  <p className="mt-1">¥{solution.price.toFixed(2)}</p>
                </div>
                <div>
                  <Label>创作者</Label>
                  <p className="mt-1">{solution.creator.name}</p>
                </div>
                <div>
                  <Label>状态</Label>
                  <Badge className="mt-1">{solution.status}</Badge>
                </div>
                {solution.images && solution.images.length > 0 && (
                  <div>
                    <Label>预览图</Label>
                    <img
                      src={solution.images[0]}
                      alt={solution.title}
                      className="mt-2 w-full rounded-lg"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>优化说明</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="记录本次优化的说明..."
                  value={formData.optimizationNotes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, optimizationNotes: e.target.value }))}
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 预览对话框 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>发布预览</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold">{previewData.title}</h3>
                {previewData.publishDescription && (
                  <p className="mt-2 text-gray-700">{previewData.publishDescription}</p>
                )}
              </div>
              {previewData.mediaLinks && previewData.mediaLinks.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">媒体链接</h4>
                  <div className="space-y-2">
                    {previewData.mediaLinks.map((link: MediaLink, index: number) => (
                      <div key={index} className="p-2 border rounded">
                        <p className="font-medium">{link.title}</p>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600">
                          {link.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {previewData.productLinks && previewData.productLinks.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">商品链接</h4>
                  <div className="space-y-2">
                    {previewData.productLinks.map((link: ProductLink, index: number) => (
                      <div key={index} className="p-2 border rounded">
                        <p className="font-medium">{link.productName}</p>
                        <p className="text-sm text-gray-500">
                          {link.relationType === 'REQUIRED' ? '必需' :
                           link.relationType === 'RECOMMENDED' ? '推荐' : '可选'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

