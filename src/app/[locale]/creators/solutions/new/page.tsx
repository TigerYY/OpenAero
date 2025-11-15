'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouting } from '@/lib/routing';
import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { FileUpload } from '@/components/ui/FileUpload';
import { BomForm, BomItem } from '@/components/solutions';
import { SolutionCategory, SolutionStatus } from '@/shared/types/solutions';
import { toast } from 'sonner';
import { Save, ArrowRight, ArrowLeft, Upload, X } from 'lucide-react';
// 自定义 debounce 函数
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

interface SolutionFormData {
  title: string;
  summary: string;
  description: string;
  category: SolutionCategory;
  price: number;
  tags: string[];
  technicalSpecs: Record<string, any>;
  useCases: Record<string, any>;
  architecture: Record<string, any>;
  bom: BomItem[];
  assets: Array<{
    type: 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'CAD' | 'OTHER';
    url: string;
    title?: string;
    description?: string;
  }>;
}

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

const STEPS = [
  { step: 1, title: '基本信息' },
  { step: 2, title: '技术规格' },
  { step: 3, title: '应用场景' },
  { step: 4, title: 'BOM清单' },
  { step: 5, title: '资产上传' },
];

export default function CreatorSolutionNewPage() {
  return (
    <ProtectedRoute>
      <DefaultLayout>
        <CreatorSolutionNewContent />
      </DefaultLayout>
    </ProtectedRoute>
  );
}

function CreatorSolutionNewContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { route, routes } = useRouting();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SolutionFormData>({
    title: '',
    summary: '',
    description: '',
    category: SolutionCategory.OTHER,
    price: 0,
    tags: [],
    technicalSpecs: {},
    useCases: {},
    architecture: {},
    bom: [],
    assets: [],
  });

  const [newTag, setNewTag] = useState('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

  // 检查用户是否为创作者
  useEffect(() => {
    if (!authLoading && user && profile) {
      const userRoles = profile.roles 
        ? (Array.isArray(profile.roles) ? profile.roles : [profile.roles]) 
        : (profile.role ? [profile.role] : []);
      
      if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
        router.push(route('/'));
        toast.error('只有创作者可以创建方案');
      }
    }
  }, [authLoading, user, profile, router, route]);

  // 草稿自动保存（防抖 2 秒）
  const saveDraft = useCallback(
    debounce(async (data: SolutionFormData) => {
      if (!data.title.trim()) return; // 至少需要标题才保存

      try {
        // 这里可以调用 API 保存草稿
        // 暂时只保存到 localStorage
        localStorage.setItem('solution_draft', JSON.stringify(data));
      } catch (error) {
        console.error('保存草稿失败:', error);
      }
    }, 2000),
    []
  );

  // 监听表单变化，自动保存草稿
  useEffect(() => {
    if (formData.title.trim()) {
      saveDraft(formData);
    }
  }, [formData, saveDraft]);

  // 加载草稿
  useEffect(() => {
    const draft = localStorage.getItem('solution_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(parsed);
      } catch (error) {
        console.error('加载草稿失败:', error);
      }
    }
  }, []);

  const handleInputChange = (field: keyof SolutionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const addSpec = () => {
    if (newSpecKey.trim() && newSpecValue.trim()) {
      setFormData(prev => ({
        ...prev,
        technicalSpecs: {
          ...prev.technicalSpecs,
          [newSpecKey.trim()]: newSpecValue.trim(),
        },
      }));
      setNewSpecKey('');
      setNewSpecValue('');
    }
  };

  const removeSpec = (key: string) => {
    setFormData(prev => {
      const newSpecs = { ...prev.technicalSpecs };
      delete newSpecs[key];
      return { ...prev, technicalSpecs: newSpecs };
    });
  };

  const handleBomChange = (bomItems: BomItem[]) => {
    setFormData(prev => ({ ...prev, bom: bomItems }));
  };

  const handleAssetUpload = (results: Array<{ success: boolean; url?: string; filename?: string; error?: string }>) => {
    const successfulUploads = results
      .filter(r => r.success && r.url)
      .map(r => ({
        type: 'IMAGE' as const,
        url: r.url!,
        title: r.filename || undefined,
      }));

    setFormData(prev => ({
      ...prev,
      assets: [...prev.assets, ...successfulUploads],
    }));
  };

  const removeAsset = (index: number) => {
    setFormData(prev => ({
      ...prev,
      assets: prev.assets.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    setLoading(true);
    try {
      // 验证必填字段
      if (!formData.title.trim() || formData.title.length < 5) {
        toast.error('方案标题至少需要5个字符');
        setLoading(false);
        return;
      }

      if (!formData.description.trim() || formData.description.length < 20) {
        toast.error('方案描述至少需要20个字符');
        setLoading(false);
        return;
      }

      if (!formData.category) {
        toast.error('请选择方案分类');
        setLoading(false);
        return;
      }

      // 创建方案
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          summary: formData.summary,
          description: formData.description,
          category: formData.category,
          price: formData.price,
          features: formData.tags,
          technicalSpecs: formData.technicalSpecs,
          useCases: formData.useCases,
          architecture: formData.architecture,
          status: isDraft ? SolutionStatus.DRAFT : SolutionStatus.PENDING_REVIEW,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.message || '创建方案失败');
      }

      const solutionId = result.data.id;

      // 保存 BOM
      if (formData.bom.length > 0) {
        const bomResponse = await fetch(`/api/solutions/${solutionId}/bom`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            items: formData.bom.map(item => ({
              name: item.name,
              model: item.model,
              quantity: item.quantity,
              unit: item.unit || '个',
              notes: item.notes,
              unitPrice: item.unitPrice,
              supplier: item.supplier,
              partNumber: item.partNumber,
              manufacturer: item.manufacturer,
              category: item.category,
              position: item.position,
              weight: item.weight,
              specifications: item.specifications,
              productId: item.productId,
            })),
          }),
        });

        if (!bomResponse.ok) {
          console.warn('保存 BOM 失败:', await bomResponse.json());
        }
      }

      // 保存资产
      if (formData.assets.length > 0) {
        const assetsResponse = await fetch(`/api/solutions/${solutionId}/assets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            assets: formData.assets,
          }),
        });

        if (!assetsResponse.ok) {
          console.warn('保存资产失败:', await assetsResponse.json());
        }
      }

      // 如果不是草稿，提交审核
      if (!isDraft) {
        const submitResponse = await fetch(`/api/solutions/${solutionId}/submit`, {
          method: 'POST',
          credentials: 'include',
        });

        const submitResult = await submitResponse.json();
        if (!submitResult.success) {
          toast.warning('方案已创建，但提交审核失败：' + (submitResult.error || submitResult.message));
        } else {
          toast.success('方案已提交审核');
        }
      } else {
        toast.success('草稿已保存');
      }

      // 清除草稿
      localStorage.removeItem('solution_draft');

      // 跳转到方案列表
      router.push(route(routes.CREATORS.SOLUTIONS));
    } catch (error) {
      console.error('提交方案失败:', error);
      toast.error(error instanceof Error ? error.message : '提交方案失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.title.trim().length >= 5 && 
               formData.description.trim().length >= 20 && 
               formData.category !== '';
      case 2:
        return true; // 技术规格可选
      case 3:
        return true; // 应用场景可选
      case 4:
        return formData.bom.length > 0;
      case 5:
        return formData.assets.length > 0;
      default:
        return false;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="text-gray-600 ml-2">加载中...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">创建新方案</h1>
          <p className="mt-2 text-gray-600">分享您的无人机解决方案，获得专业认证和收益分成</p>
        </div>

        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map(({ step, title }, index) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= step ? 'text-primary-600 font-medium' : 'text-gray-600'
                }`}>
                  {title}
                </span>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step ? 'bg-primary-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 表单内容 */}
        <Card>
          <CardContent className="p-6">
            {/* 步骤1: 基本信息 */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title">方案标题 *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="请输入方案标题（至少5个字符）"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="summary">方案摘要</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => handleInputChange('summary', e.target.value)}
                    placeholder="简要描述方案的核心特点（可选）"
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">方案描述 *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="请详细描述您的方案特点和应用场景（至少20个字符）"
                    rows={6}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="category">应用分类 *</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value as SolutionCategory)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="price">建议售价 (元)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>标签</Label>
                  <div className="mt-1 flex flex-wrap gap-2 mb-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded-md text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="输入标签后按回车添加"
                      className="flex-1"
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      添加
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 步骤2: 技术规格 */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <Label>技术规格</Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(formData.technicalSpecs).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                        <span className="font-medium text-gray-700">{key}:</span>
                        <span className="text-gray-600 flex-1">{String(value)}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSpec(key)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 border border-gray-200 rounded-md">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={newSpecKey}
                        onChange={(e) => setNewSpecKey(e.target.value)}
                        placeholder="规格名称"
                      />
                      <Input
                        value={newSpecValue}
                        onChange={(e) => setNewSpecValue(e.target.value)}
                        placeholder="规格值"
                      />
                    </div>
                    <Button type="button" onClick={addSpec} className="mt-3" variant="outline">
                      添加规格
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 步骤3: 应用场景 */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="useCases">应用场景描述</Label>
                  <Textarea
                    id="useCases"
                    value={typeof formData.useCases === 'object' ? JSON.stringify(formData.useCases, null, 2) : formData.useCases}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleInputChange('useCases', parsed);
                      } catch {
                        handleInputChange('useCases', { description: e.target.value });
                      }
                    }}
                    placeholder="描述方案的应用场景（JSON 格式或纯文本）"
                    rows={8}
                    className="mt-1 font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="architecture">架构描述</Label>
                  <Textarea
                    id="architecture"
                    value={typeof formData.architecture === 'object' ? JSON.stringify(formData.architecture, null, 2) : formData.architecture}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleInputChange('architecture', parsed);
                      } catch {
                        handleInputChange('architecture', { description: e.target.value });
                      }
                    }}
                    placeholder="描述方案的架构设计（JSON 格式或纯文本）"
                    rows={8}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* 步骤4: BOM清单 */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <Label>BOM清单 *</Label>
                  <p className="text-sm text-gray-600 mt-1 mb-4">请至少添加一个BOM项</p>
                  <BomForm
                    items={formData.bom}
                    onChange={handleBomChange}
                    readonly={false}
                    showAdvanced={true}
                  />
                </div>
              </div>
            )}

            {/* 步骤5: 资产上传 */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <Label>方案资产 *</Label>
                  <p className="text-sm text-gray-600 mt-1 mb-4">请至少上传一个资产（图片、文档、视频或CAD文件）</p>
                  
                  <FileUpload
                    accept="image/*,application/pdf,.dwg,.dxf,.step,.stp"
                    multiple
                    onUpload={handleAssetUpload}
                    autoUpload={true}
                  />

                  {formData.assets.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label>已上传的资产</Label>
                      {formData.assets.map((asset, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                          <span className="flex-1 text-sm text-gray-700">{asset.title || asset.url}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeAsset(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 导航按钮 */}
            <div className="flex justify-between pt-6 border-t border-gray-200 mt-6">
              <Button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                上一步
              </Button>

              <div className="flex gap-3">
                {currentStep === STEPS.length && (
                  <>
                    <Button
                      type="button"
                      onClick={() => handleSubmit(true)}
                      disabled={loading}
                      variant="outline"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? '保存中...' : '保存草稿'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      disabled={loading || !isStepValid(currentStep)}
                      className="bg-primary-600 hover:bg-primary-700 text-white"
                    >
                      {loading ? '提交中...' : '提交审核'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                )}

                {currentStep < STEPS.length && (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!isStepValid(currentStep)}
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    下一步
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

