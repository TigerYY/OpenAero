'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { BomForm, BomItem, ReviewHistory, ReviewRecord } from '@/components/solutions';
import { SolutionCategory, SolutionStatus } from '@/shared/types/solutions';
import { toast } from 'sonner';
import { Save, ArrowRight, ArrowLeft, X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { canEditSolution } from '@/lib/solution-status-workflow';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

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
    id?: string;
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

export default function CreatorSolutionEditPage() {
  return (
    <ProtectedRoute>
      <DefaultLayout>
        <CreatorSolutionEditContent />
      </DefaultLayout>
    </ProtectedRoute>
  );
}

function CreatorSolutionEditContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { route, routes } = useRouting();
  const solutionId = params?.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [solution, setSolution] = useState<any>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewRecord[]>([]);
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

  // 应用场景管理（卡片式）
  const [useCases, setUseCases] = useState<Array<{ title: string; description: string }>>([{ title: '', description: '' }]);
  
  // 架构描述管理（卡片式）
  const [architectureSections, setArchitectureSections] = useState<Array<{ title: string; content: string }>>([{ title: '', content: '' }]);

  // 验证错误状态
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 提交确认对话框状态
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 检查用户是否为创作者
  useEffect(() => {
    if (!authLoading && user && profile) {
      const userRoles = profile.roles 
        ? (Array.isArray(profile.roles) ? profile.roles : [profile.roles]) 
        : (profile.role ? [profile.role] : []);
      
      if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
        router.push(route(routes.BUSINESS.HOME));
        toast.error('只有创作者可以编辑方案');
      }
    }
  }, [authLoading, user, profile, router, route]);

  // 加载方案数据
  useEffect(() => {
    if (solutionId && user && !authLoading) {
      fetchSolution();
      fetchReviewHistory();
    }
  }, [solutionId, user, authLoading]);

  const fetchSolution = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${solutionId}`, {
        credentials: 'include',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.message || '获取方案失败');
      }

      const solutionData = result.data;

      // 检查权限：仅允许编辑 DRAFT 或 REJECTED 状态的方案
      if (solutionData.status !== SolutionStatus.DRAFT && 
          solutionData.status !== SolutionStatus.REJECTED) {
        toast.error('只能编辑草稿或已拒绝状态的方案');
        router.push(route(routes.CREATORS.SOLUTIONS));
        return;
      }

      setSolution(solutionData);

      // 解析 technicalSpecs（可能是字符串或对象）
      let parsedTechnicalSpecs: Record<string, any> = {};
      if (solutionData.technicalSpecs) {
        if (typeof solutionData.technicalSpecs === 'string') {
          try {
            parsedTechnicalSpecs = JSON.parse(solutionData.technicalSpecs);
          } catch (e) {
            console.error('解析 technicalSpecs 失败:', e);
            parsedTechnicalSpecs = {};
          }
        } else if (typeof solutionData.technicalSpecs === 'object' && solutionData.technicalSpecs !== null) {
          parsedTechnicalSpecs = solutionData.technicalSpecs;
        }
      } else if (solutionData.specs) {
        let parsedSpecs: any = {};
        if (typeof solutionData.specs === 'string') {
          try {
            parsedSpecs = JSON.parse(solutionData.specs);
          } catch (e) {
            console.error('解析 specs 失败:', e);
            parsedSpecs = {};
          }
        } else if (typeof solutionData.specs === 'object' && solutionData.specs !== null) {
          parsedSpecs = solutionData.specs;
        }
        
        // 如果 specs 包含 technicalSpecs 字段，使用它；否则使用整个 specs 对象，但排除 useCases 和 architecture
        if (parsedSpecs.technicalSpecs && typeof parsedSpecs.technicalSpecs === 'object') {
          parsedTechnicalSpecs = parsedSpecs.technicalSpecs;
        } else {
          // 排除 useCases 和 architecture 字段
          parsedTechnicalSpecs = Object.fromEntries(
            Object.entries(parsedSpecs).filter(([key]) => 
              key !== 'useCases' && key !== 'architecture'
            )
          );
        }
      }
      
      // 确保 technicalSpecs 只包含简单值（字符串、数字、布尔值），不包含嵌套对象
      parsedTechnicalSpecs = Object.fromEntries(
        Object.entries(parsedTechnicalSpecs).filter(([_, value]) => 
          value !== null && 
          value !== undefined && 
          typeof value !== 'object' && 
          !Array.isArray(value)
        )
      );

      // 解析 useCases（可能是字符串或对象），转换为数组格式
      let useCasesArray: Array<{ title: string; description: string }> = [];
      if (solutionData.useCases) {
        let parsedUseCases: any = {};
        if (typeof solutionData.useCases === 'string') {
          try {
            parsedUseCases = JSON.parse(solutionData.useCases);
          } catch (e) {
            console.error('解析 useCases 失败:', e);
            parsedUseCases = {};
          }
        } else if (typeof solutionData.useCases === 'object' && solutionData.useCases !== null) {
          parsedUseCases = solutionData.useCases;
        }

        if (Array.isArray(parsedUseCases)) {
          useCasesArray = parsedUseCases;
        } else if (parsedUseCases.scenarios && Array.isArray(parsedUseCases.scenarios)) {
          useCasesArray = parsedUseCases.scenarios;
        } else if (parsedUseCases.description) {
          useCasesArray = [{ title: '主要应用场景', description: parsedUseCases.description }];
        } else {
          // 尝试将对象的键值对转换为场景
          useCasesArray = Object.entries(parsedUseCases).map(([key, value]) => ({
            title: key,
            description: typeof value === 'string' ? value : JSON.stringify(value),
          }));
        }
      }

      // 解析 architecture（可能是字符串或对象），转换为数组格式
      let architectureArray: Array<{ title: string; content: string }> = [];
      if (solutionData.architecture) {
        let parsedArchitecture: any = {};
        if (typeof solutionData.architecture === 'string') {
          try {
            parsedArchitecture = JSON.parse(solutionData.architecture);
          } catch (e) {
            console.error('解析 architecture 失败:', e);
            parsedArchitecture = {};
          }
        } else if (typeof solutionData.architecture === 'object' && solutionData.architecture !== null) {
          parsedArchitecture = solutionData.architecture;
        }

        if (Array.isArray(parsedArchitecture)) {
          architectureArray = parsedArchitecture;
        } else if (parsedArchitecture.sections && Array.isArray(parsedArchitecture.sections)) {
          architectureArray = parsedArchitecture.sections;
        } else if (parsedArchitecture.description) {
          architectureArray = [{ title: '架构概述', content: parsedArchitecture.description }];
        } else {
          // 尝试将对象的键值对转换为部分
          architectureArray = Object.entries(parsedArchitecture).map(([key, value]) => ({
            title: key,
            content: typeof value === 'string' ? value : JSON.stringify(value),
          }));
        }
      }

      // 填充表单数据
      setFormData({
        title: solutionData.title || '',
        summary: solutionData.summary || '',
        description: solutionData.description || '',
        category: solutionData.category || SolutionCategory.OTHER,
        price: solutionData.price || 0,
        tags: solutionData.tags || solutionData.features || [],
        technicalSpecs: parsedTechnicalSpecs,
        useCases: useCasesArray.length > 0 ? { scenarios: useCasesArray } : {},
        architecture: architectureArray.length > 0 ? { sections: architectureArray } : {},
        bom: Array.isArray(solutionData.bomItems) ? solutionData.bomItems : (Array.isArray(solutionData.bom) ? solutionData.bom : []),
        assets: Array.isArray(solutionData.assets) ? solutionData.assets : [],
      });

      // 设置卡片式输入的状态
      setUseCases(useCasesArray.length > 0 ? useCasesArray : [{ title: '', description: '' }]);
      setArchitectureSections(architectureArray.length > 0 ? architectureArray : [{ title: '', content: '' }]);
    } catch (error) {
      console.error('获取方案失败:', error);
      toast.error(error instanceof Error ? error.message : '获取方案失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewHistory = async () => {
    try {
      const response = await fetch(`/api/admin/solutions/${solutionId}/review`, {
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success && result.data) {
        setReviewHistory(result.data);
      }
    } catch (error) {
      console.error('获取审核历史失败:', error);
    }
  };

  // 草稿自动保存（防抖 2 秒）
  const saveDraftCallback = useCallback(async (data: SolutionFormData) => {
    if (!data.title.trim() || !solutionId) return;

    try {
      // 更新方案
      const response = await fetch(`/api/solutions/${solutionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: data.title,
          summary: data.summary,
          description: data.description,
          category: data.category,
          price: data.price,
          features: data.tags,
          technicalSpecs: data.technicalSpecs,
          useCases: data.useCases,
          architecture: data.architecture,
        }),
      });

      if (!response.ok) {
        console.warn('自动保存失败');
      }
    } catch (error) {
      console.error('保存草稿失败:', error);
    }
  }, [solutionId]);

  const saveDraft = useCallback(
    debounce(saveDraftCallback, 2000),
    [saveDraftCallback]
  );

  // 监听表单变化，自动保存草稿
  useEffect(() => {
    if (formData.title.trim() && solutionId) {
      saveDraft(formData);
    }
  }, [formData, saveDraft, solutionId]);

  const handleInputChange = (field: keyof SolutionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 实时验证
    validateField(field, value);
  };

  // 字段验证函数
  const validateField = (field: keyof SolutionFormData, value: any) => {
    const errors: Record<string, string> = { ...validationErrors };
    
    switch (field) {
      case 'title':
        if (!value || value.trim().length < 5) {
          errors.title = '标题至少需要5个字符';
        } else if (value.length > 100) {
          errors.title = '标题不能超过100个字符';
        } else {
          delete errors.title;
        }
        break;
      case 'description':
        if (!value || value.trim().length < 20) {
          errors.description = '描述至少需要20个字符';
        } else if (value.length > 2000) {
          errors.description = '描述不能超过2000个字符';
        } else {
          delete errors.description;
        }
        break;
      case 'summary':
        // 摘要完全可选，只检查长度上限
        if (value && value.length > 500) {
          errors.summary = '摘要不能超过500个字符';
        } else {
          delete errors.summary;
        }
        break;
      case 'price':
        if (value < 0) {
          errors.price = '价格不能为负数';
        } else if (value > 100000) {
          errors.price = '价格不能超过100000';
        } else {
          delete errors.price;
        }
        break;
    }
    
    setValidationErrors(errors);
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

  const removeAsset = async (index: number) => {
    const asset = formData.assets[index];
    if (asset.id) {
      // 如果资产有 ID，调用 API 删除
      try {
        const response = await fetch(`/api/solutions/${solutionId}/assets`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ assetIds: [asset.id] }),
        });

        if (!response.ok) {
          toast.error('删除资产失败');
          return;
        }
      } catch (error) {
        console.error('删除资产失败:', error);
        toast.error('删除资产失败');
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      assets: prev.assets.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (isDraft: boolean = false) => {
    setSaving(true);
    try {
      const errors: Record<string, string> = {};
      
      if (isDraft) {
        // 草稿保存：宽松验证，只检查格式，允许空值
        if (formData.title && formData.title.trim().length > 0) {
          if (formData.title.length < 5) {
            errors.title = '标题至少需要5个字符';
          } else if (formData.title.length > 100) {
            errors.title = '标题不能超过100个字符';
          }
        }

        if (formData.description && formData.description.trim().length > 0) {
          if (formData.description.length < 20) {
            errors.description = '描述至少需要20个字符';
          } else if (formData.description.length > 2000) {
            errors.description = '描述不能超过2000个字符';
          }
        }

        // 摘要完全可选，只检查长度上限
        if (formData.summary && formData.summary.length > 500) {
          errors.summary = '摘要不能超过500个字符';
        }

        if (formData.price < 0) {
          errors.price = '价格不能为负数';
        } else if (formData.price > 100000) {
          errors.price = '价格不能超过100000';
        }
      } else {
        // 提交审核：严格验证所有必填字段
        if (!formData.title.trim() || formData.title.length < 5) {
          errors.title = '方案标题至少需要5个字符';
        } else if (formData.title.length > 100) {
          errors.title = '方案标题不能超过100个字符';
        }

        if (!formData.description.trim() || formData.description.length < 20) {
          errors.description = '方案描述至少需要20个字符';
        } else if (formData.description.length > 2000) {
          errors.description = '方案描述不能超过2000个字符';
        }

        if (!formData.category) {
          errors.category = '请选择应用分类';
        }

        if (formData.price < 0) {
          errors.price = '价格不能为负数';
        } else if (formData.price > 100000) {
          errors.price = '价格不能超过100000';
        }

        // 摘要可选，但如果有内容则检查长度
        if (formData.summary && formData.summary.length > 500) {
          errors.summary = '摘要不能超过500个字符';
        }

        // 提交审核需要BOM和资产
        if (formData.bom.length === 0) {
          errors.bom = '请至少添加一个BOM项';
        }

        if (formData.assets.length === 0) {
          errors.assets = '请至少上传一个资产';
        }
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        // 滚动到第一个错误字段
        const firstErrorField = Object.keys(errors)[0];
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
        toast.error(isDraft ? '请修正表单错误后再保存' : '请修正表单错误后再提交');
        setSaving(false);
        return;
      }

      // 更新方案基本信息
      const response = await fetch(`/api/solutions/${solutionId}`, {
        method: 'PUT',
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
          bom: formData.bom, // 包含 BOM 数据
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.message || '更新方案失败');
      }

      // 更新 BOM（即使为空数组也发送，用于清空 BOM）
      const bomResponse = await fetch(`/api/solutions/${solutionId}/bom`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          items: formData.bom.map(item => ({
            name: item.name || '',
            model: item.model || undefined,
            quantity: item.quantity || 1, // 确保至少为 1
            unit: item.unit || '个',
            notes: item.notes || undefined,
            unitPrice: item.unitPrice || undefined,
            supplier: item.supplier || undefined,
            partNumber: item.partNumber || undefined,
            manufacturer: item.manufacturer || undefined,
            category: item.category || undefined,
            position: item.position || undefined,
            weight: item.weight || undefined,
            specifications: item.specifications || undefined,
            productId: item.productId || undefined,
          })),
        }),
      });

      if (!bomResponse.ok) {
        const errorData = await bomResponse.json();
        console.warn('更新 BOM 失败:', errorData);
        // 如果是验证错误，显示更详细的错误信息
        if (errorData.details) {
          toast.warning('BOM 更新失败：' + JSON.stringify(errorData.details));
        }
      }

      // 添加新资产（已存在的资产不需要重新添加）
      const newAssets = formData.assets.filter(a => !a.id);
      if (newAssets.length > 0) {
        const assetsResponse = await fetch(`/api/solutions/${solutionId}/assets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            assets: newAssets,
          }),
        });

        if (!assetsResponse.ok) {
          console.warn('添加资产失败:', await assetsResponse.json());
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
          toast.warning('方案已更新，但提交审核失败：' + (submitResult.error || submitResult.message));
          // 提交失败时不跳转，让用户继续编辑
          return;
        } else {
          toast.success('方案已提交审核');
          // 提交成功后才跳转到方案列表
          router.push(route(routes.CREATORS.SOLUTIONS));
          return;
        }
      } else {
        toast.success('草稿已保存');
        // 保存草稿时不跳转，让用户继续编辑
      }
    } catch (error) {
      console.error('保存方案失败:', error);
      toast.error(error instanceof Error ? error.message : '保存方案失败，请稍后重试');
    } finally {
      setSaving(false);
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
        <p className="text-gray-600 ml-2">加载中...</p>
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <ErrorMessage message="方案不存在或无权访问" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">编辑方案</h1>
          <p className="mt-2 text-gray-600">修改方案信息并重新提交审核</p>
        </div>

        {/* 审核历史 */}
        {reviewHistory.length > 0 && (
          <div className="mb-6">
            <ReviewHistory reviews={reviewHistory} />
          </div>
        )}

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
                  <Label htmlFor="title">
                    方案标题 <span className="text-red-500">*</span>
                    <span className="text-gray-400 text-sm font-normal ml-2">(提交审核时必填)</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="请输入方案标题（草稿保存时可留空）"
                    className={`mt-1 ${validationErrors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      至少5个字符，最多100个字符（提交审核时必填）
                    </p>
                    <span className={`text-xs ${formData.title.length > 0 && formData.title.length < 5 ? 'text-red-500' : formData.title.length > 100 ? 'text-red-500' : 'text-gray-500'}`}>
                      {formData.title.length}/100
                    </span>
                  </div>
                  {validationErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="summary">
                    方案摘要 <span className="text-gray-400 text-sm font-normal">(可选)</span>
                  </Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => handleInputChange('summary', e.target.value)}
                    placeholder="简要描述方案的核心特点（可选，保存草稿时可不填写）"
                    rows={3}
                    className={`mt-1 ${validationErrors.summary ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      可选字段，最多500个字符
                    </p>
                    <span className={`text-xs ${formData.summary.length > 500 ? 'text-red-500' : 'text-gray-500'}`}>
                      {formData.summary.length}/500
                    </span>
                  </div>
                  {validationErrors.summary && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.summary}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">
                    方案描述 <span className="text-red-500">*</span>
                    <span className="text-gray-400 text-sm font-normal ml-2">(提交审核时必填)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="请详细描述您的方案特点和应用场景（草稿保存时可留空）"
                    rows={6}
                    className={`mt-1 ${validationErrors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      至少20个字符，最多2000个字符（提交审核时必填）
                    </p>
                    <span className={`text-xs ${formData.description.length > 0 && formData.description.length < 20 ? 'text-red-500' : formData.description.length > 2000 ? 'text-red-500' : 'text-gray-500'}`}>
                      {formData.description.length}/2000
                    </span>
                  </div>
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">
                    应用分类 <span className="text-red-500">*</span>
                    <span className="text-gray-400 text-sm font-normal ml-2">(提交审核时必填)</span>
                  </Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value as SolutionCategory)}
                    className={`mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${validationErrors.category ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  {validationErrors.category && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.category}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="price">建议售价 (元)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100000"
                    step="0.01"
                    placeholder="0.00"
                    className={`mt-1 ${validationErrors.price ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  <div className="mt-1">
                    <p className="text-xs text-gray-500">
                      价格范围：0 - 100,000 元
                    </p>
                  </div>
                  {validationErrors.price && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.price}</p>
                  )}
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
                    {formData.technicalSpecs && 
                     typeof formData.technicalSpecs === 'object' && 
                     !Array.isArray(formData.technicalSpecs) &&
                     Object.entries(formData.technicalSpecs)
                       .filter(([key, value]) => {
                         // 过滤掉嵌套对象和数组，只显示简单的键值对
                         return value !== null && 
                                value !== undefined && 
                                typeof value !== 'object' && 
                                !Array.isArray(value);
                       })
                       .map(([key, value]) => (
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
                    {(!formData.technicalSpecs || 
                      typeof formData.technicalSpecs !== 'object' || 
                      Array.isArray(formData.technicalSpecs) ||
                      Object.entries(formData.technicalSpecs || {})
                        .filter(([_, value]) => 
                          value !== null && 
                          value !== undefined && 
                          typeof value !== 'object' && 
                          !Array.isArray(value)
                        ).length === 0) && (
                      <p className="text-sm text-gray-500 py-4 text-center">暂无技术规格，请添加</p>
                    )}
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
                {/* 应用场景描述 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>应用场景描述</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUseCases([...useCases, { title: '', description: '' }])}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加场景
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">描述您的方案可以应用的具体场景和用途</p>
                  
                  <div className="space-y-4">
                    {useCases.map((useCase, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">场景 {index + 1}</span>
                          {useCases.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setUseCases(useCases.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`useCase-title-${index}`} className="text-sm">场景标题</Label>
                            <Input
                              id={`useCase-title-${index}`}
                              value={useCase.title}
                              onChange={(e) => {
                                const updated = [...useCases];
                                updated[index].title = e.target.value;
                                setUseCases(updated);
                              }}
                              placeholder="例如：农业植保、巡检检测、物流配送等"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`useCase-desc-${index}`} className="text-sm">场景描述</Label>
                            <Textarea
                              id={`useCase-desc-${index}`}
                              value={useCase.description}
                              onChange={(e) => {
                                const updated = [...useCases];
                                updated[index].description = e.target.value;
                                setUseCases(updated);
                              }}
                              placeholder="详细描述该应用场景的具体用途、优势和使用方法"
                              rows={4}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* 架构描述 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>架构描述</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setArchitectureSections([...architectureSections, { title: '', content: '' }])}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加部分
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">描述您的方案的技术架构、系统组成和工作流程</p>
                  
                  <div className="space-y-4">
                    {architectureSections.map((section, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">部分 {index + 1}</span>
                          {architectureSections.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setArchitectureSections(architectureSections.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`arch-title-${index}`} className="text-sm">部分标题</Label>
                            <Input
                              id={`arch-title-${index}`}
                              value={section.title}
                              onChange={(e) => {
                                const updated = [...architectureSections];
                                updated[index].title = e.target.value;
                                setArchitectureSections(updated);
                              }}
                              placeholder="例如：系统架构、硬件组成、软件架构、工作流程等"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`arch-content-${index}`} className="text-sm">内容描述</Label>
                            <Textarea
                              id={`arch-content-${index}`}
                              value={section.content}
                              onChange={(e) => {
                                const updated = [...architectureSections];
                                updated[index].content = e.target.value;
                                setArchitectureSections(updated);
                              }}
                              placeholder="详细描述该部分的组成、功能和技术特点"
                              rows={5}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
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
                      onClick={() => handleSave(true)}
                      disabled={saving}
                      variant="outline"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? '保存中...' : '保存草稿'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowSubmitDialog(true)}
                      disabled={saving || !isStepValid(currentStep)}
                      className="bg-primary-600 hover:bg-primary-700 text-white"
                    >
                      {saving ? '提交中...' : '提交审核'}
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

      {/* 提交确认对话框 */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>提交方案审核确认</DialogTitle>
            <DialogDescription>
              请仔细阅读以下协议和条款，确认无误后提交审核
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">1. 内容真实性承诺</h4>
              <p className="text-sm text-gray-600">
                我承诺提交的方案信息真实、准确、完整，不存在虚假、误导性内容。如有不实信息，愿意承担相应责任。
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">2. 知识产权声明</h4>
              <p className="text-sm text-gray-600">
                我确认提交的方案及相关内容（包括但不限于技术规格、BOM清单、设计图纸等）为原创或已获得合法授权，不存在侵犯他人知识产权的情况。
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">3. 审核流程说明</h4>
              <p className="text-sm text-gray-600">
                提交后，方案将进入审核流程。审核时间通常为3-5个工作日。审核期间，方案状态为"待审核"，无法进行编辑。审核结果将通过系统通知告知。
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">4. 平台使用规范</h4>
              <p className="text-sm text-gray-600">
                我同意遵守平台的使用规范，包括但不限于：不发布违法违规内容、不进行恶意竞争、尊重其他用户权益等。
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">5. 数据使用授权</h4>
              <p className="text-sm text-gray-600">
                我授权平台在审核、展示、推广等合理范围内使用方案信息，并同意平台对方案进行必要的技术处理和优化。
              </p>
            </div>

            <div className="flex items-start space-x-2 pt-4 border-t">
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="agree-terms" className="text-sm text-gray-700 cursor-pointer">
                我已仔细阅读并同意以上所有协议和条款，确认提交方案进行审核
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSubmitDialog(false);
                setAgreedToTerms(false);
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!agreedToTerms) {
                  toast.error('请先同意协议和条款');
                  return;
                }
                setShowSubmitDialog(false);
                setAgreedToTerms(false);
                // 执行实际的提交操作
                await handleSave(false);
              }}
              disabled={!agreedToTerms || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {saving ? '提交中...' : '确认提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

