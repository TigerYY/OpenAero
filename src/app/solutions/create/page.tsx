'use client';
import { useRouting } from '@/lib/routing';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FileUpload } from '@/components/ui/FileUpload';
import { SolutionCategory, SolutionStatus } from '@/shared/types/solutions';
import { BomForm, BomItem } from '@/components/solutions';

interface SolutionFormData {
  title: string;
  description: string;
  category: SolutionCategory;
  price: number;
  tags: string[];
  images: string[];
  specs: Record<string, string>;
  bom: BomItem[];
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

export default function CreateSolutionPage() {
  const { route, routes } = useRouting();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SolutionFormData>({
    title: '',
    description: '',
    category: SolutionCategory.OTHER,
    price: 0,
    tags: [],
    images: [],
    specs: {},
    bom: [],
  });

  const [newTag, setNewTag] = useState('');
  const [newSpec, setNewSpec] = useState({ key: '', value: '' });

  const handleInputChange = (field: keyof SolutionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };



  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const addSpec = () => {
    if (newSpec.key.trim() && newSpec.value.trim()) {
      setFormData(prev => ({
        ...prev,
        specs: { ...prev.specs, [newSpec.key.trim()]: newSpec.value.trim() }
      }));
      setNewSpec({ key: '', value: '' });
    }
  };

  const removeSpec = (key: string) => {
    setFormData(prev => {
      const newSpecs = { ...prev.specs };
      delete newSpecs[key];
      return { ...prev, specs: newSpecs };
    });
  };

  const handleBomChange = (bomItems: BomItem[]) => {
    setFormData(prev => ({
      ...prev,
      bom: bomItems
    }));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    setLoading(true);
    try {
      // 创建FormData对象用于文件上传
      const submitData = new FormData();
      
      // 添加基本信息
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('price', formData.price.toString());
      submitData.append('tags', JSON.stringify(formData.tags));
      submitData.append('specs', JSON.stringify(formData.specs));
      // 转换 BOM 格式为 API 需要的格式
      const bomForApi = formData.bom.map(item => ({
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
      }));
      submitData.append('bom', JSON.stringify(bomForApi));
      submitData.append('status', isDraft ? SolutionStatus.DRAFT : SolutionStatus.PENDING_REVIEW);
      
      // 添加图片URLs
      submitData.append('imageUrls', JSON.stringify(formData.images));

      const response = await fetch('/api/solutions', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('提交失败');
      }

      const result = await response.json();
      
      if (result.success) {
        router.push(`/solutions/${result.data.id}`);
      } else {
        throw new Error(result.message || '提交失败');
      }
    } catch (error) {
      console.error('提交方案失败:', error);
      alert('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.title.trim() && formData.description.trim() && formData.category;
      case 2:
        return formData.images.length > 0;
      case 3:
        return Object.keys(formData.specs).length > 0;
      case 4:
        return formData.bom.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 面包屑导航 */}
      <div className="bg-white border-b">
        <div className="container py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href={route('/')} className="hover:text-blue-600">首页</Link>
            <span>/</span>
            <Link href={route('/solutions')} className="hover:text-blue-600">方案</Link>
            <span>/</span>
            <span className="text-gray-900">创建方案</span>
          </nav>
        </div>
      </div>

      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">创建新方案</h1>
            <p className="text-gray-600">
              分享您的无人机解决方案，获得专业认证和收益分成
            </p>
          </div>

          {/* 步骤指示器 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                { step: 1, title: '基本信息' },
                { step: 2, title: '图片上传' },
                { step: 3, title: '技术规格' },
                { step: 4, title: 'BOM清单' },
              ].map(({ step, title }) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step}
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentStep >= step ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {title}
                  </span>
                  {step < 4 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      方案标题 *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入方案标题"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      方案描述 *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请详细描述您的方案特点和应用场景"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      应用分类 *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value as SolutionCategory)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      建议售价 (元)
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      标签
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="输入标签后按回车添加"
                      />
                      <Button type="button" onClick={addTag} variant="outline">
                        添加
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 步骤2: 图片上传 */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      方案图片 *
                    </label>
                    <FileUpload
                      multiple
                      accept="image/*"
                      maxFiles={5}
                      maxSize={10 * 1024 * 1024} // 10MB
                      onUpload={(results) => {
                        const successfulUploads = results.filter(r => r.success);
                        const newImages = successfulUploads.map(r => r.url).filter(Boolean) as string[];
                        setFormData(prev => ({
                          ...prev,
                          images: [...prev.images, ...newImages]
                        }));
                      }}
                    />
                  </div>

                  {formData.images.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">已上传图片</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {formData.images.map((image, index) => (
                          <div key={index} className="relative">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <Image
                                src={image}
                                alt={`预览 ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 步骤3: 技术规格 */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      技术规格 *
                    </label>
                    <div className="space-y-4">
                      {Object.entries(formData.specs).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                          <span className="font-medium text-gray-700">{key}:</span>
                          <span className="text-gray-600">{value}</span>
                          <button
                            type="button"
                            onClick={() => removeSpec(key)}
                            className="ml-auto text-red-500 hover:text-red-700"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-4 border border-gray-200 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">添加新规格</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={newSpec.key}
                          onChange={(e) => setNewSpec(prev => ({ ...prev, key: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="规格名称"
                        />
                        <input
                          type="text"
                          value={newSpec.value}
                          onChange={(e) => setNewSpec(prev => ({ ...prev, value: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* 步骤4: BOM清单 */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      BOM清单 *
                    </label>
                    <BomForm
                      items={formData.bom}
                      onChange={handleBomChange}
                      readonly={false}
                      showAdvanced={true}
                    />
                  </div>
                </div>
              )}

              {/* 导航按钮 */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  variant="outline"
                >
                  上一步
                </Button>

                <div className="flex gap-3">
                  {currentStep === 4 && (
                    <>
                      <Button
                        type="button"
                        onClick={() => handleSubmit(true)}
                        disabled={loading}
                        variant="outline"
                      >
                        {loading ? '保存中...' : '保存草稿'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSubmit(false)}
                        disabled={loading}
                      >
                        {loading ? '提交中...' : '提交审核'}
                      </Button>
                    </>
                  )}
                  
                  {currentStep < 4 && (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={!isStepValid(currentStep)}
                    >
                      下一步
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}