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
import { SolutionCategory } from '@/shared/types/solutions';

const categories = [
  { value: SolutionCategory.AGRICULTURE, label: '农业植保' },
  { value: SolutionCategory.SURVEILLANCE, label: '安防监控' },
  { value: SolutionCategory.DELIVERY, label: '物流配送' },
  { value: SolutionCategory.MAPPING, label: '测绘航拍' },
  { value: SolutionCategory.INSPECTION, label: '巡检检测' },
  { value: SolutionCategory.ENTERTAINMENT, label: '娱乐竞技' },
  { value: SolutionCategory.RESEARCH, label: '科研教育' },
  { value: SolutionCategory.OTHER, label: '其他应用' },
];

interface MediaLink {
  type: 'VIDEO' | 'DEMO' | 'TUTORIAL' | 'DOCUMENTATION' | 'OTHER';
  title: string;
  url: string;
  thumbnail?: string;
  description?: string;
  duration?: number;
}

interface ProductLink {
  platform: 'TAOBAO' | 'TMALL' | 'JD' | 'PINDUODUO' | 'AMAZON' | 'OTHER';
  title: string;
  url: string;
  thumbnail?: string;
  description?: string;
}

interface Solution {
  id: string;
  title: string;
  summary?: string;
  description: string;
  category: string;
  status: string;
  price: number;
  images: string[];
  features: string[];
  tags: string[];
  specs?: Record<string, any>;
  useCases?: Record<string, any>;
  architecture?: Record<string, any>;
  bom?: any[];
  version?: number;
  creator?: {
    id: string;
    name?: string;
    user?: {
      display_name?: string;
      first_name?: string;
      last_name?: string;
    };
  };
  creatorName?: string;
  creatorId?: string;
}

interface SolutionFormData {
  // 基本信息
  title: string;
  summary: string;
  description: string;
  category: string;
  price: number;
  tags: string[];
  features: string[];
  images: string[];
  // 技术规格
  specs: Record<string, any>;
  // 应用场景
  useCases: Array<{ title: string; description: string }>;
  // 架构描述
  architecture: Array<{ title: string; content: string }>;
  // BOM
  bom: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    supplier?: string;
    partNumber?: string;
  }>;
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

  // 方案基本信息表单数据
  const [solutionFormData, setSolutionFormData] = useState<SolutionFormData>({
    title: '',
    summary: '',
    description: '',
    category: '',
    price: 0,
    tags: [],
    features: [],
    images: [],
    specs: {},
    useCases: [{ title: '', description: '' }],
    architecture: [{ title: '', content: '' }],
    bom: [],
  });

  // 发布优化表单数据
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
    platform: 'TAOBAO',
    title: '',
    url: '',
    thumbnail: '',
    description: '',
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newFeaturedTag, setNewFeaturedTag] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [newBomItem, setNewBomItem] = useState({
    name: '',
    quantity: 1,
    unitPrice: 0,
    supplier: '',
    partNumber: '',
  });

  useEffect(() => {
    fetchSolution();
    fetchPublishingData();
  }, [solutionId]);

  const fetchSolution = async () => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}`, {
        credentials: 'include',
        cache: 'no-store', // 禁用缓存，确保获取最新数据
      });
      const result = await response.json();
      if (result.success) {
        const data = result.data;
        // 如果状态是 APPROVED 或 READY_TO_PUBLISH，确保不会意外显示为其他状态
        if (data.status && (data.status === 'APPROVED' || data.status === 'READY_TO_PUBLISH')) {
          setSolution(data);
        } else {
          // 如果状态异常，记录警告但继续使用数据
          console.warn('方案状态异常:', data.status, '方案ID:', solutionId);
          setSolution(data);
        }
        
        // 初始化方案基本信息表单数据
        setSolutionFormData({
          title: data.title || '',
          summary: data.summary || '',
          description: data.description || '',
          category: data.category || '',
          price: data.price || 0,
          tags: data.tags || [],
          features: data.features || [],
          images: data.images || [],
          specs: data.specs || {},
          useCases: data.useCases && Array.isArray(data.useCases) 
            ? data.useCases 
            : (data.useCases && typeof data.useCases === 'object' 
              ? Object.entries(data.useCases).map(([title, description]) => ({ 
                  title, 
                  description: typeof description === 'string' ? description : JSON.stringify(description) 
                }))
              : [{ title: '', description: '' }]),
          architecture: data.architecture && Array.isArray(data.architecture)
            ? data.architecture
            : (data.architecture && typeof data.architecture === 'object'
              ? Object.entries(data.architecture).map(([title, content]) => ({
                  title,
                  content: typeof content === 'string' ? content : JSON.stringify(content)
                }))
              : [{ title: '', content: '' }]),
          bom: data.bom && Array.isArray(data.bom) ? data.bom : [],
        });
        
        // 初始化发布优化表单数据
        setFormData(prev => ({
          ...prev,
          metaTitle: data.title,
          metaDescription: data.description?.substring(0, 200) || '',
          metaKeywords: data.tags || [],
          featuredTags: data.features || [],
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

  const handleAddProductLink = () => {
    if (!newProductLink.title || !newProductLink.url) {
      toast.error('请填写标题和URL');
      return;
    }
    setFormData(prev => ({
      ...prev,
      productLinks: [...(prev.productLinks || []), newProductLink as ProductLink],
    }));
    setNewProductLink({
      platform: 'TAOBAO',
      title: '',
      url: '',
      thumbnail: '',
      description: '',
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
    if (!newFeaturedTag.trim()) return;
    setFormData(prev => ({
      ...prev,
      featuredTags: [...(prev.featuredTags || []), newFeaturedTag.trim()],
    }));
    setNewFeaturedTag('');
  };

  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      featuredTags: prev.featuredTags?.filter((_, i) => i !== index) || [],
    }));
  };

  // 方案基本信息处理函数
  const handleAddSolutionTag = () => {
    if (!newTag.trim()) return;
    setSolutionFormData(prev => ({
      ...prev,
      tags: [...(prev.tags || []), newTag.trim()],
    }));
    setNewTag('');
  };

  const handleRemoveSolutionTag = (index: number) => {
    setSolutionFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setSolutionFormData(prev => ({
      ...prev,
      features: [...(prev.features || []), newFeature.trim()],
    }));
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    setSolutionFormData(prev => ({
      ...prev,
      features: prev.features?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleAddSpec = () => {
    if (!newSpecKey.trim() || !newSpecValue.trim()) return;
    setSolutionFormData(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        [newSpecKey.trim()]: newSpecValue.trim(),
      },
    }));
    setNewSpecKey('');
    setNewSpecValue('');
  };

  const handleRemoveSpec = (key: string) => {
    setSolutionFormData(prev => {
      const newSpecs = { ...prev.specs };
      delete newSpecs[key];
      return { ...prev, specs: newSpecs };
    });
  };

  const handleAddUseCase = () => {
    setSolutionFormData(prev => ({
      ...prev,
      useCases: [...(prev.useCases || []), { title: '', description: '' }],
    }));
  };

  const handleUpdateUseCase = (index: number, field: 'title' | 'description', value: string) => {
    setSolutionFormData(prev => ({
      ...prev,
      useCases: prev.useCases.map((uc, i) => 
        i === index ? { ...uc, [field]: value } : uc
      ),
    }));
  };

  const handleRemoveUseCase = (index: number) => {
    setSolutionFormData(prev => ({
      ...prev,
      useCases: prev.useCases.filter((_, i) => i !== index),
    }));
  };

  const handleAddArchitecture = () => {
    setSolutionFormData(prev => ({
      ...prev,
      architecture: [...(prev.architecture || []), { title: '', content: '' }],
    }));
  };

  const handleUpdateArchitecture = (index: number, field: 'title' | 'content', value: string) => {
    setSolutionFormData(prev => ({
      ...prev,
      architecture: prev.architecture.map((arch, i) => 
        i === index ? { ...arch, [field]: value } : arch
      ),
    }));
  };

  const handleRemoveArchitecture = (index: number) => {
    setSolutionFormData(prev => ({
      ...prev,
      architecture: prev.architecture.filter((_, i) => i !== index),
    }));
  };

  const handleAddBomItem = () => {
    if (!newBomItem.name.trim()) {
      toast.error('请输入物料名称');
      return;
    }
    setSolutionFormData(prev => ({
      ...prev,
      bom: [...(prev.bom || []), { ...newBomItem }],
    }));
    setNewBomItem({
      name: '',
      quantity: 1,
      unitPrice: 0,
      supplier: '',
      partNumber: '',
    });
    toast.success('物料已添加');
  };

  const handleRemoveBomItem = (index: number) => {
    setSolutionFormData(prev => ({
      ...prev,
      bom: prev.bom.filter((_, i) => i !== index),
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

      // 一次性保存方案基本信息和发布优化数据
      const response = await fetch(`/api/admin/solutions/${solutionId}/optimize`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // 方案基本信息
          title: solutionFormData.title,
          summary: solutionFormData.summary || undefined,
          description: solutionFormData.description,
          category: solutionFormData.category,
          price: solutionFormData.price,
          tags: solutionFormData.tags,
          features: solutionFormData.features,
          images: solutionFormData.images,
          specs: solutionFormData.specs,
          useCases: solutionFormData.useCases.length > 0 && solutionFormData.useCases[0].title 
            ? solutionFormData.useCases.reduce((acc, uc) => {
                if (uc.title) acc[uc.title] = uc.description || '';
                return acc;
              }, {} as Record<string, string>)
            : undefined,
          architecture: solutionFormData.architecture.length > 0 && solutionFormData.architecture[0].title
            ? solutionFormData.architecture.reduce((acc, arch) => {
                if (arch.title) acc[arch.title] = arch.content || '';
                return acc;
              }, {} as Record<string, string>)
            : undefined,
          bom: solutionFormData.bom.length > 0 ? solutionFormData.bom : undefined,
          // 发布优化数据
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

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `保存失败 (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '保存失败');
      }

      toast.success('优化数据已保存');

      // 更新本地状态，使用API返回的最新状态，避免刷新时获取到旧数据
      if (result.data) {
        setSolution((prev: any) => ({
          ...prev,
          status: result.data.status,
        }));
      }

      // 刷新方案数据以显示最新状态（延迟刷新，确保数据库已更新）
      setTimeout(async () => {
        await fetchSolution();
        await fetchPublishingData();
      }, 500);

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
          // 延迟跳转，让用户看到成功消息
          setTimeout(() => {
            router.push('/zh-CN/admin/review-workbench');
          }, 1500);
        } else {
          throw new Error(publishResult.error || '发布失败');
        }
      }
      // 如果不直接发布，保持在当前页面，不跳转
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
                {/* 基本信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle>基本信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">方案标题 *</Label>
                      <Input
                        id="title"
                        value={solutionFormData.title}
                        onChange={(e) => setSolutionFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="mt-2"
                        placeholder="请输入方案标题"
                      />
                    </div>
                    <div>
                      <Label htmlFor="summary">方案摘要</Label>
                      <Textarea
                        id="summary"
                        value={solutionFormData.summary}
                        onChange={(e) => setSolutionFormData(prev => ({ ...prev, summary: e.target.value }))}
                        className="mt-2"
                        rows={3}
                        placeholder="简要描述方案的核心特点"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">方案描述 *</Label>
                      <Textarea
                        id="description"
                        value={solutionFormData.description}
                        onChange={(e) => setSolutionFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-2"
                        rows={6}
                        placeholder="详细描述方案的功能、特点、适用场景等"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">分类 *</Label>
                        <select
                          id="category"
                          value={solutionFormData.category}
                          onChange={(e) => setSolutionFormData(prev => ({ ...prev, category: e.target.value }))}
                          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                          {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="price">价格（元）*</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={solutionFormData.price}
                          onChange={(e) => setSolutionFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          className="mt-2"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 标签和特性 */}
                <Card>
                  <CardHeader>
                    <CardTitle>标签和特性</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>标签</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSolutionTag())}
                          placeholder="输入标签后按回车"
                        />
                        <Button onClick={handleAddSolutionTag} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {solutionFormData.tags?.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <button
                              onClick={() => handleRemoveSolutionTag(index)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>特性</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                          placeholder="输入特性后按回车"
                        />
                        <Button onClick={handleAddFeature} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {solutionFormData.features?.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {feature}
                            <button
                              onClick={() => handleRemoveFeature(index)}
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

                {/* 图片 */}
                <Card>
                  <CardHeader>
                    <CardTitle>方案图片</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>图片URL列表（每行一个）</Label>
                      <Textarea
                        value={solutionFormData.images.join('\n')}
                        onChange={(e) => setSolutionFormData(prev => ({ 
                          ...prev, 
                          images: e.target.value.split('\n').filter(url => url.trim()) 
                        }))}
                        className="mt-2"
                        rows={4}
                        placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                      />
                    </div>
                    {solutionFormData.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {solutionFormData.images.map((url, index) => (
                          <div key={index} className="relative">
                            <img src={url} alt={`预览 ${index + 1}`} className="w-full h-24 object-cover rounded" />
                            <button
                              onClick={() => setSolutionFormData(prev => ({ 
                                ...prev, 
                                images: prev.images.filter((_, i) => i !== index) 
                              }))}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 技术规格 */}
                <Card>
                  <CardHeader>
                    <CardTitle>技术规格</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={newSpecKey}
                        onChange={(e) => setNewSpecKey(e.target.value)}
                        placeholder="规格名称"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={newSpecValue}
                          onChange={(e) => setNewSpecValue(e.target.value)}
                          placeholder="规格值"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpec())}
                        />
                        <Button onClick={handleAddSpec} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(solutionFormData.specs || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 border rounded">
                          <span className="font-medium">{key}:</span>
                          <span className="flex-1 mx-2">{String(value)}</span>
                          <button
                            onClick={() => handleRemoveSpec(key)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 应用场景 */}
                <Card>
                  <CardHeader>
                    <CardTitle>应用场景</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {solutionFormData.useCases.map((useCase, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>场景 {index + 1}</Label>
                          <button
                            onClick={() => handleRemoveUseCase(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <Input
                          value={useCase.title}
                          onChange={(e) => handleUpdateUseCase(index, 'title', e.target.value)}
                          placeholder="场景标题"
                        />
                        <Textarea
                          value={useCase.description}
                          onChange={(e) => handleUpdateUseCase(index, 'description', e.target.value)}
                          placeholder="场景描述"
                          rows={3}
                        />
                      </div>
                    ))}
                    <Button onClick={handleAddUseCase} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      添加应用场景
                    </Button>
                  </CardContent>
                </Card>

                {/* 架构描述 */}
                <Card>
                  <CardHeader>
                    <CardTitle>架构描述</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {solutionFormData.architecture.map((arch, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>架构部分 {index + 1}</Label>
                          <button
                            onClick={() => handleRemoveArchitecture(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <Input
                          value={arch.title}
                          onChange={(e) => handleUpdateArchitecture(index, 'title', e.target.value)}
                          placeholder="架构部分标题"
                        />
                        <Textarea
                          value={arch.content}
                          onChange={(e) => handleUpdateArchitecture(index, 'content', e.target.value)}
                          placeholder="架构描述内容"
                          rows={4}
                        />
                      </div>
                    ))}
                    <Button onClick={handleAddArchitecture} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      添加架构部分
                    </Button>
                  </CardContent>
                </Card>

                {/* BOM清单 */}
                <Card>
                  <CardHeader>
                    <CardTitle>BOM清单</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={newBomItem.name}
                        onChange={(e) => setNewBomItem(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="物料名称"
                      />
                      <Input
                        type="number"
                        min="1"
                        value={newBomItem.quantity}
                        onChange={(e) => setNewBomItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        placeholder="数量"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newBomItem.unitPrice}
                        onChange={(e) => setNewBomItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                        placeholder="单价"
                      />
                      <Input
                        value={newBomItem.supplier}
                        onChange={(e) => setNewBomItem(prev => ({ ...prev, supplier: e.target.value }))}
                        placeholder="供应商（可选）"
                      />
                      <Input
                        value={newBomItem.partNumber}
                        onChange={(e) => setNewBomItem(prev => ({ ...prev, partNumber: e.target.value }))}
                        placeholder="零件号（可选）"
                      />
                      <Button onClick={handleAddBomItem} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        添加物料
                      </Button>
                    </div>
                    {solutionFormData.bom.length > 0 && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-6 gap-2 text-sm font-medium border-b pb-2">
                          <div>物料名称</div>
                          <div>数量</div>
                          <div>单价</div>
                          <div>供应商</div>
                          <div>零件号</div>
                          <div>操作</div>
                        </div>
                        {solutionFormData.bom.map((item, index) => (
                          <div key={index} className="grid grid-cols-6 gap-2 items-center border-b pb-2">
                            <div>{item.name}</div>
                            <div>{item.quantity}</div>
                            <div>¥{item.unitPrice.toFixed(2)}</div>
                            <div>{item.supplier || '-'}</div>
                            <div>{item.partNumber || '-'}</div>
                            <button
                              onClick={() => handleRemoveBomItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 上架说明 */}
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

                {/* 推荐设置 */}
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
                          value={newFeaturedTag}
                          onChange={(e) => setNewFeaturedTag(e.target.value)}
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
                      <Label>添加电商平台商品链接</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newProductLink.platform}
                          onChange={(e) => setNewProductLink(prev => ({ ...prev, platform: e.target.value as ProductLink['platform'] }))}
                          className="rounded-md border border-gray-300 px-3 py-2"
                        >
                          <option value="TAOBAO">淘宝</option>
                          <option value="TMALL">天猫</option>
                          <option value="JD">京东</option>
                          <option value="PINDUODUO">拼多多</option>
                          <option value="AMAZON">亚马逊</option>
                          <option value="OTHER">其他平台</option>
                        </select>
                        <Input
                          placeholder="商品标题"
                          value={newProductLink.title || ''}
                          onChange={(e) => setNewProductLink(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <Input
                        placeholder="商品URL"
                        value={newProductLink.url || ''}
                        onChange={(e) => setNewProductLink(prev => ({ ...prev, url: e.target.value }))}
                      />
                      <Input
                        placeholder="缩略图 URL（可选）"
                        value={newProductLink.thumbnail || ''}
                        onChange={(e) => setNewProductLink(prev => ({ ...prev, thumbnail: e.target.value }))}
                      />
                      <Textarea
                        placeholder="商品描述（可选）"
                        value={newProductLink.description || ''}
                        onChange={(e) => setNewProductLink(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                      />
                      <Button onClick={handleAddProductLink} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        添加
                      </Button>
                    </div>

                    {formData.productLinks && formData.productLinks.length > 0 && (
                      <div className="space-y-2">
                        <Label>已添加的商品链接</Label>
                        {formData.productLinks.map((link, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {link.thumbnail && (
                                <img 
                                  src={link.thumbnail} 
                                  alt={link.title}
                                  className="w-16 h-16 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    {link.platform === 'TAOBAO' ? '淘宝' :
                                     link.platform === 'TMALL' ? '天猫' :
                                     link.platform === 'JD' ? '京东' :
                                     link.platform === 'PINDUODUO' ? '拼多多' :
                                     link.platform === 'AMAZON' ? '亚马逊' : '其他'}
                                  </Badge>
                                  <p className="font-medium">{link.title}</p>
                                </div>
                                <p className="text-sm text-gray-500 truncate">{link.url}</p>
                                {link.description && (
                                  <p className="text-sm text-gray-400 mt-1">{link.description}</p>
                                )}
                              </div>
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
                  <p className="mt-1">
                    {solution.creatorName || 
                     solution.creator?.name || 
                     (solution.creator?.user?.display_name || 
                      `${solution.creator?.user?.first_name || ''} ${solution.creator?.user?.last_name || ''}`.trim() || 
                      '未知创作者')}
                  </p>
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

