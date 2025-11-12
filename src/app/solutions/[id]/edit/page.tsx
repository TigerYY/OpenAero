'use client';
import { useRouting } from '@/lib/routing';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { SolutionCategory, SolutionStatus } from '@/shared/types/solutions';

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

interface BomItem {
  name: string;
  quantity: number;
  unitPrice: number;
  supplier: string;
  partNumber: string;
}

interface Solution {
  id: string;
  title: string;
  description: string;
  category: SolutionCategory;
  status: SolutionStatus;
  price: number;
  tags: string[];
  images: string[];
  specs: Record<string, string>;
  bom: BomItem[];
  createdAt: string;
  updatedAt: string;
}

export default function EditSolutionPage() {
  const { route, routes } = useRouting();
  const params = useParams();
  const router = useRouter();
  const solutionId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [solution, setSolution] = useState<Solution | null>(null);
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
  const [newBomItem, setNewBomItem] = useState({
    name: '',
    quantity: 1,
    unitPrice: 0,
    supplier: '',
    partNumber: '',
  });

  // 获取方案数据
  useEffect(() => {
    fetchSolution();
  }, [solutionId]);

  const fetchSolution = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${solutionId}`);
      if (!response.ok) {
        throw new Error('获取方案失败');
      }
      const data = await response.json();
      setSolution(data);
      
      // 填充表单数据
      setFormData({
        title: data.title || '',
        description: data.description || '',
        category: data.category || SolutionCategory.OTHER,
        price: data.price || 0,
        tags: data.tags || [],
        images: data.images || [],
        specs: data.specs || {},
        bom: data.bom || [],
      });
    } catch (error) {
      console.error('获取方案失败:', error);
      alert('获取方案失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SolutionFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleInputChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddSpec = () => {
    if (newSpec.key.trim() && newSpec.value.trim()) {
      handleInputChange('specs', {
        ...formData.specs,
        [newSpec.key.trim()]: newSpec.value.trim()
      });
      setNewSpec({ key: '', value: '' });
    }
  };

  const handleRemoveSpec = (keyToRemove: string) => {
    const newSpecs = { ...formData.specs };
    delete newSpecs[keyToRemove];
    handleInputChange('specs', newSpecs);
  };

  const handleAddBomItem = () => {
    if (newBomItem.name.trim()) {
      handleInputChange('bom', [...formData.bom, { ...newBomItem }]);
      setNewBomItem({
        name: '',
        quantity: 1,
        unitPrice: 0,
        supplier: '',
        partNumber: '',
      });
    }
  };

  const handleRemoveBomItem = (index: number) => {
    handleInputChange('bom', formData.bom.filter((_, i) => i !== index));
  };

  const handleUpdateBomItem = (index: number, field: keyof BomItem, value: any) => {
    const updatedBom = formData.bom.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    handleInputChange('bom', updatedBom);
  };

  const handleSubmit = async (status: 'draft' | 'pending') => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('请填写方案标题和描述');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/solutions/${solutionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新方案失败');
      }

      const result = await response.json();
      alert(status === 'draft' ? '方案已保存为草稿' : '方案已提交审核');
      router.push(route('/solutions/manage'));
    } catch (error) {
      console.error('更新方案失败:', error);
      alert(error instanceof Error ? error.message : '更新方案失败，请重试');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载方案数据...</p>
        </div>
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">方案未找到</h1>
          <p className="text-gray-600 mb-6">请求的方案不存在或您没有权限编辑</p>
          <Link href={route('/solutions/manage')}>
            <Button>返回方案管理</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 检查是否可以编辑
  const canEdit = solution.status === SolutionStatus.DRAFT || solution.status === SolutionStatus.REJECTED;
  
  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">无法编辑</h1>
          <p className="text-gray-600 mb-6">只有草稿状态或被拒绝的方案可以编辑</p>
          <Link href={route('/solutions/manage')}>
            <Button>返回方案管理</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">编辑方案</h1>
              <p className="text-gray-600 mt-2">修改您的无人机解决方案</p>
            </div>
            <Link href={route('/solutions/manage')}>
              <Button variant="outline">返回管理</Button>
            </Link>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                <div className="ml-3 text-sm">
                  {step === 1 && '基本信息'}
                  {step === 2 && '图片上传'}
                  {step === 3 && '技术规格'}
                  {step === 4 && 'BOM清单'}
                </div>
                {step < 4 && (
                  <div
                    className={`w-16 h-1 mx-4 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 表单内容 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* 步骤 1: 基本信息 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">基本信息</h2>
              
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
                  <option value={SolutionCategory.AGRICULTURE}>农业植保</option>
                  <option value={SolutionCategory.INSPECTION}>巡检监测</option>
                  <option value={SolutionCategory.MAPPING}>测绘制图</option>
                  <option value={SolutionCategory.DELIVERY}>物流配送</option>
                  <option value={SolutionCategory.SURVEILLANCE}>安防监控</option>
                  <option value={SolutionCategory.RESEARCH}>应急救援</option>
                  <option value={SolutionCategory.ENTERTAINMENT}>娱乐航拍</option>
                  <option value={SolutionCategory.OTHER}>其他应用</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入标签"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button type="button" onClick={handleAddTag}>
                    添加
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 步骤 2: 图片上传 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">方案图片</h2>
              
              <FileUpload
                multiple
                accept="image/*"
                maxFiles={10}
                showPreview={true}
                onUpload={(results) => {
                  const successfulUploads = results
                    .filter(result => result.success && result.url)
                    .map(result => result.url!);
                  
                  handleInputChange('images', [...formData.images, ...successfulUploads]);
                }}
              />

              {formData.images.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">已上传图片</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`方案图片 ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = formData.images.filter((_, i) => i !== index);
                            handleInputChange('images', newImages);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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

          {/* 步骤 3: 技术规格 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">技术规格</h2>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newSpec.key}
                  onChange={(e) => setNewSpec({ ...newSpec, key: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="规格名称（如：续航时间）"
                />
                <input
                  type="text"
                  value={newSpec.value}
                  onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="规格值（如：30分钟）"
                />
                <Button type="button" onClick={handleAddSpec}>
                  添加
                </Button>
              </div>

              <div className="space-y-2">
                {Object.entries(formData.specs).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{key}:</span>
                      <span className="ml-2 text-gray-700">{value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(key)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 步骤 4: BOM清单 */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">BOM清单</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                <input
                  type="text"
                  value={newBomItem.name}
                  onChange={(e) => setNewBomItem({ ...newBomItem, name: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="零件名称"
                />
                <input
                  type="number"
                  value={newBomItem.quantity}
                  onChange={(e) => setNewBomItem({ ...newBomItem, quantity: parseInt(e.target.value) || 1 })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="数量"
                  min="1"
                />
                <input
                  type="number"
                  value={newBomItem.unitPrice}
                  onChange={(e) => setNewBomItem({ ...newBomItem, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="单价"
                  min="0"
                  step="0.01"
                />
                <input
                  type="text"
                  value={newBomItem.supplier}
                  onChange={(e) => setNewBomItem({ ...newBomItem, supplier: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="供应商"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBomItem.partNumber}
                    onChange={(e) => setNewBomItem({ ...newBomItem, partNumber: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="零件号"
                  />
                  <Button type="button" onClick={handleAddBomItem}>
                    添加
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        零件名称
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        数量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        单价
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        小计
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        供应商
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        零件号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.bom.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateBomItem(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateBomItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="1"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateBomItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ¥{(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.supplier}
                            onChange={(e) => handleUpdateBomItem(index, 'supplier', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.partNumber}
                            onChange={(e) => handleUpdateBomItem(index, 'partNumber', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRemoveBomItem(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {formData.bom.length > 0 && (
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    总计: ¥{formData.bom.reduce((total, item) => total + (item.quantity * item.unitPrice), 0).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 导航按钮 */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={prevStep}>
                  上一步
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              {currentStep < 4 ? (
                <Button onClick={nextStep}>
                  下一步
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSubmit('draft')}
                    disabled={saving}
                  >
                    {saving ? '保存中...' : '保存草稿'}
                  </Button>
                  <Button
                    onClick={() => handleSubmit('pending')}
                    disabled={saving}
                  >
                    {saving ? '提交中...' : '提交审核'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}