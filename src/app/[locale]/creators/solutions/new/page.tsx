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
import { Save, ArrowRight, ArrowLeft, Upload, X, Plus, Trash2 } from 'lucide-react';
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
  const { route, routes, routeWithDynamicParams } = useRouting();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [solutionId, setSolutionId] = useState<string | null>(null); // 当前编辑的方案ID
  
  // 提交确认对话框状态
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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
  
  // 应用场景管理
  const [useCases, setUseCases] = useState<Array<{ title: string; description: string }>>([{ title: '', description: '' }]);
  
  // 架构描述管理
  const [architectureSections, setArchitectureSections] = useState<Array<{ title: string; content: string }>>([{ title: '', content: '' }]);

  // 检查用户是否为创作者
  useEffect(() => {
    if (!authLoading && user && profile) {
      const userRoles = profile.roles 
        ? (Array.isArray(profile.roles) ? profile.roles : [profile.roles]) 
        : (profile.role ? [profile.role] : []);
      
      if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
        router.push(route(routes.BUSINESS.HOME));
        toast.error('只有创作者可以创建方案');
      }
    }
  }, [authLoading, user, profile, router, route]);

  // 草稿自动保存到 localStorage（防抖 2 秒）
  // 注意：每个方案都有独立的草稿，通过 solutionId 区分
  const saveDraftToLocal = useCallback(
    debounce(async (data: SolutionFormData) => {
      if (!data.title.trim() && !solutionId) return; // 新方案至少需要标题才保存

      try {
        // 使用 solutionId 作为 key，支持多个草稿
        const draftKey = solutionId ? `solution_draft_${solutionId}` : 'solution_draft_new';
        localStorage.setItem(draftKey, JSON.stringify({
          ...data,
          solutionId: solutionId,
          timestamp: new Date().toISOString(), // 添加时间戳用于排序
        }));
        
        // 同时保存草稿列表（用于显示所有草稿）
        const draftList = JSON.parse(localStorage.getItem('solution_drafts_list') || '[]');
        const draftInfo = {
          id: solutionId || 'new',
          title: data.title || '未命名方案',
          timestamp: new Date().toISOString(),
        };
        
        // 更新或添加草稿信息
        const existingIndex = draftList.findIndex((d: any) => d.id === (solutionId || 'new'));
        if (existingIndex >= 0) {
          draftList[existingIndex] = draftInfo;
        } else {
          draftList.push(draftInfo);
        }
        
        // 只保留最近20个草稿
        draftList.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const recentDrafts = draftList.slice(0, 20);
        localStorage.setItem('solution_drafts_list', JSON.stringify(recentDrafts));
      } catch (error) {
        console.error('保存草稿到本地失败:', error);
      }
    }, 2000),
    [solutionId]
  );

  // 同步 useCases 和 architecture 到 formData
  useEffect(() => {
    const useCasesData = useCases.length > 0 && (useCases[0].title || useCases[0].description)
      ? { scenarios: useCases.filter(uc => uc.title || uc.description) }
      : {};
    const architectureData = architectureSections.length > 0 && (architectureSections[0].title || architectureSections[0].content)
      ? { sections: architectureSections.filter(arch => arch.title || arch.content) }
      : {};
    
    setFormData(prev => ({
      ...prev,
      useCases: useCasesData,
      architecture: architectureData,
    }));
  }, [useCases, architectureSections]);
  
  // 监听表单变化，自动保存草稿到 localStorage
  useEffect(() => {
    if (formData.title.trim()) {
      saveDraftToLocal(formData);
    }
  }, [formData, saveDraftToLocal]);

  // 加载草稿（从 localStorage 或已有方案）
  useEffect(() => {
    const loadDraft = async () => {
      // 如果没有 solutionId，尝试加载最新的新方案草稿
      if (!solutionId) {
        const newDraft = localStorage.getItem('solution_draft_new');
        if (newDraft) {
          try {
            const parsed = JSON.parse(newDraft);
            // 如果草稿有 solutionId，说明已经保存到服务器，跳转到编辑页面
            if (parsed.solutionId) {
              router.push(routeWithDynamicParams(routes.CREATORS.SOLUTION_EDIT, { id: parsed.solutionId }));
              return;
            }
            // 否则加载本地草稿
            setFormData(parsed);
            // 解析 useCases 和 architecture
            if (parsed.useCases) {
              const parsedUseCases = parsed.useCases;
              let useCasesArray: Array<{ title: string; description: string }> = [];
              if (Array.isArray(parsedUseCases)) {
                useCasesArray = parsedUseCases;
              } else if (typeof parsedUseCases === 'object' && parsedUseCases !== null) {
                if (parsedUseCases.scenarios && Array.isArray(parsedUseCases.scenarios)) {
                  useCasesArray = parsedUseCases.scenarios;
                } else if (parsedUseCases.description) {
                  useCasesArray = [{ title: '主要应用场景', description: parsedUseCases.description }];
                }
              }
              setUseCases(useCasesArray.length > 0 ? useCasesArray : [{ title: '', description: '' }]);
            }
            if (parsed.architecture) {
              const parsedArchitecture = parsed.architecture;
              let architectureArray: Array<{ title: string; content: string }> = [];
              if (Array.isArray(parsedArchitecture)) {
                architectureArray = parsedArchitecture;
              } else if (typeof parsedArchitecture === 'object' && parsedArchitecture !== null) {
                if (parsedArchitecture.sections && Array.isArray(parsedArchitecture.sections)) {
                  architectureArray = parsedArchitecture.sections;
                } else if (parsedArchitecture.description) {
                  architectureArray = [{ title: '架构概述', content: parsedArchitecture.description }];
                }
              }
              setArchitectureSections(architectureArray.length > 0 ? architectureArray : [{ title: '', content: '' }]);
            }
            return;
          } catch (error) {
            console.warn('加载本地草稿失败:', error);
          }
        }
      } else {
        // 如果有 solutionId，尝试从服务器加载已有方案
        try {
          const response = await fetch(`/api/solutions/${solutionId}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const solution = result.data;
              // 解析 useCases
              const parsedUseCases = solution.specs?.useCases || solution.useCases || {};
              let useCasesArray: Array<{ title: string; description: string }> = [];
              if (Array.isArray(parsedUseCases)) {
                useCasesArray = parsedUseCases;
              } else if (typeof parsedUseCases === 'object' && parsedUseCases !== null) {
                // 如果是对象，转换为数组
                if (parsedUseCases.scenarios && Array.isArray(parsedUseCases.scenarios)) {
                  useCasesArray = parsedUseCases.scenarios;
                } else if (parsedUseCases.description) {
                  // 如果只有 description，创建一个默认场景
                  useCasesArray = [{ title: '主要应用场景', description: parsedUseCases.description }];
                } else {
                  // 尝试将对象的键值对转换为场景
                  useCasesArray = Object.entries(parsedUseCases).map(([key, value]) => ({
                    title: key,
                    description: typeof value === 'string' ? value : JSON.stringify(value),
                  }));
                }
              }
              
              // 解析 architecture
              const parsedArchitecture = solution.specs?.architecture || solution.architecture || {};
              let architectureArray: Array<{ title: string; content: string }> = [];
              if (Array.isArray(parsedArchitecture)) {
                architectureArray = parsedArchitecture;
              } else if (typeof parsedArchitecture === 'object' && parsedArchitecture !== null) {
                if (parsedArchitecture.sections && Array.isArray(parsedArchitecture.sections)) {
                  architectureArray = parsedArchitecture.sections;
                } else if (parsedArchitecture.description) {
                  architectureArray = [{ title: '架构概述', content: parsedArchitecture.description }];
                } else {
                  architectureArray = Object.entries(parsedArchitecture).map(([key, value]) => ({
                    title: key,
                    content: typeof value === 'string' ? value : JSON.stringify(value),
                  }));
                }
              }
              
              setFormData({
                title: solution.title || '',
                summary: solution.summary || solution.description?.substring(0, 200) || '',
                description: solution.description || '',
                category: solution.category as SolutionCategory || SolutionCategory.OTHER,
                price: solution.price || 0,
                tags: solution.tags || [],
                technicalSpecs: solution.specs?.technicalSpecs || solution.technicalSpecs || {},
                useCases: parsedUseCases,
                architecture: parsedArchitecture,
                bom: solution.bomItems || solution.bom || [],
                assets: solution.assets || [],
              });
              setUseCases(useCasesArray.length > 0 ? useCasesArray : [{ title: '', description: '' }]);
              setArchitectureSections(architectureArray.length > 0 ? architectureArray : [{ title: '', content: '' }]);
              return;
            }
          }
        } catch (error) {
          console.warn('加载已有方案失败:', error);
        }
      }
    };
    
    if (user && !authLoading) {
      loadDraft();
    }
  }, [user, authLoading]);

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

  // 保存草稿（不提交审核）
  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      toast.error('请至少输入方案标题');
      return;
    }

    setSaving(true);
    try {
      let currentSolutionId = solutionId;

      // 如果已有 solutionId，更新方案；否则创建新方案
      if (currentSolutionId) {
        // 更新已有方案（使用独立字段格式，API 会合并到 specs 中）
        const response = await fetch(`/api/solutions/${currentSolutionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            title: formData.title,
            summary: formData.summary,
            description: formData.description || formData.summary || '',
            category: formData.category,
            price: formData.price,
            features: formData.tags,
            technicalSpecs: formData.technicalSpecs,
            useCases: formData.useCases,
            architecture: formData.architecture,
            bom: formData.bom,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || result.message || '保存草稿失败');
        }
      } else {
        // 创建新方案（使用 specs 对象格式）
        const response = await fetch('/api/solutions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            title: formData.title,
            description: formData.description || formData.summary || '',
            category: formData.category,
            price: formData.price,
            features: formData.tags,
            specs: {
              summary: formData.summary,
              technicalSpecs: formData.technicalSpecs,
              useCases: formData.useCases,
              architecture: formData.architecture,
            },
            bom: formData.bom,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || result.message || '创建方案失败');
        }

        currentSolutionId = result.data.id;
        setSolutionId(currentSolutionId);
      }

      // 保存 BOM
      if (formData.bom.length > 0 && currentSolutionId) {
        const bomResponse = await fetch(`/api/solutions/${currentSolutionId}/bom`, {
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
      if (formData.assets.length > 0 && currentSolutionId) {
        const assetsResponse = await fetch(`/api/solutions/${currentSolutionId}/assets`, {
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

      // 更新 localStorage（使用 solutionId 作为 key）
      if (currentSolutionId) {
        const draftKey = `solution_draft_${currentSolutionId}`;
        localStorage.setItem(draftKey, JSON.stringify({
          ...formData,
          solutionId: currentSolutionId,
          timestamp: new Date().toISOString(),
        }));
        
        // 更新草稿列表
        const draftList = JSON.parse(localStorage.getItem('solution_drafts_list') || '[]');
        const draftInfo = {
          id: currentSolutionId,
          title: formData.title || '未命名方案',
          timestamp: new Date().toISOString(),
        };
        const existingIndex = draftList.findIndex((d: any) => d.id === currentSolutionId);
        if (existingIndex >= 0) {
          draftList[existingIndex] = draftInfo;
        } else {
          draftList.push(draftInfo);
        }
        draftList.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        localStorage.setItem('solution_drafts_list', JSON.stringify(draftList.slice(0, 20)));
      }

      toast.success('草稿已保存');
    } catch (error) {
      console.error('保存草稿失败:', error);
      toast.error(error instanceof Error ? error.message : '保存草稿失败，请稍后重试');
    } finally {
      setSaving(false);
    }
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

      let currentSolutionId = solutionId;

      // 如果已有 solutionId，更新方案；否则创建新方案
      if (currentSolutionId) {
        // 更新已有方案（使用独立字段格式，API 会合并到 specs 中）
        const response = await fetch(`/api/solutions/${currentSolutionId}`, {
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
            bom: formData.bom,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || result.message || '更新方案失败');
        }
      } else {
        // 创建新方案（使用 specs 对象格式）
        const response = await fetch('/api/solutions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            price: formData.price,
            features: formData.tags,
            specs: {
              summary: formData.summary,
              technicalSpecs: formData.technicalSpecs,
              useCases: formData.useCases,
              architecture: formData.architecture,
            },
            bom: formData.bom,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || result.message || '创建方案失败');
        }

        currentSolutionId = result.data.id;
        setSolutionId(currentSolutionId);
      }

      // 保存 BOM
      if (formData.bom.length > 0) {
        const bomResponse = await fetch(`/api/solutions/${currentSolutionId}/bom`, {
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
      if (formData.assets.length > 0 && currentSolutionId) {
        const assetsResponse = await fetch(`/api/solutions/${currentSolutionId}/assets`, {
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
        const submitResponse = await fetch(`/api/solutions/${currentSolutionId}/submit`, {
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

      // 清除草稿（使用新的多草稿系统）
      if (currentSolutionId) {
        localStorage.removeItem(`solution_draft_${currentSolutionId}`);
        // 从草稿列表中移除
        const draftList = JSON.parse(localStorage.getItem('solution_drafts_list') || '[]');
        const filteredList = draftList.filter((d: any) => d.id !== currentSolutionId);
        localStorage.setItem('solution_drafts_list', JSON.stringify(filteredList));
      } else {
        localStorage.removeItem('solution_draft_new');
      }

      // 跳转到方案列表
      router.push(route(routes.CREATORS.DASHBOARD) + '?tab=solutions');
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
                {/* 保存草稿按钮 - 在所有步骤都显示 */}
                <Button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving || !formData.title.trim()}
                  variant="outline"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? '保存中...' : '保存草稿'}
                </Button>

                {currentStep === STEPS.length && (
                  <Button
                    type="button"
                    onClick={() => setShowSubmitDialog(true)}
                    disabled={loading || !isStepValid(currentStep)}
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    {loading ? '提交中...' : '提交审核'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
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
                id="agree-terms-new"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="agree-terms-new" className="text-sm text-gray-700 cursor-pointer">
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
                await handleSubmit(false);
              }}
              disabled={!agreedToTerms || loading}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {loading ? '提交中...' : '确认提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

