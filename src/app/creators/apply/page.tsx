'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { creatorApplySchema } from '@/lib/validations';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export default function CreatorApplyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    website: '',
    experience: '',
    specialties: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const specialties = [
    'FPV飞行',
    '航拍摄影',
    '农业植保',
    '安防巡检',
    '物流配送',
    '测绘航拍',
    '应急救援',
    '环境监测',
  ];

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      // 验证表单数据
      const validatedData = creatorApplySchema.parse(formData);

      // 提交申请
      const response = await fetch('/api/creators/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/creators/apply/success');
      } else {
        setErrors({ submit: result.message || '提交失败，请重试' });
      }
    } catch (error: any) {
      if (error.errors) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          fieldErrors[err.path[0]] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ submit: error.message || '提交失败，请重试' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout locale="zh-CN">
      <div className="min-h-screen bg-secondary-50">
        <div className="container py-16">
          <div className="max-w-3xl mx-auto">
            {/* 页面标题 */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-secondary-900 mb-4">
                成为开元空御创作者
              </h1>
              <p className="text-xl text-secondary-600">
                加入我们的创作者社区，将您的无人机创新设计转化为商业价值
              </p>
            </div>

            {/* 申请表单 */}
            <div className="bg-white rounded-xl shadow-sm p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* 个人简介 */}
                <div>
                  <label className="label block mb-2">
                    个人简介 <span className="text-error-500">*</span>
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="请简要介绍您的背景、专业领域和创作经验..."
                    className="input min-h-[120px] resize-none"
                    rows={5}
                  />
                  {errors.bio && (
                    <p className="text-error-500 text-sm mt-1">{errors.bio}</p>
                  )}
                  <p className="text-secondary-500 text-sm mt-1">
                    {formData.bio.length}/500 字符
                  </p>
                </div>

                {/* 个人网站 */}
                <div>
                  <label className="label block mb-2">个人网站</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://your-website.com"
                    className="input"
                  />
                  {errors.website && (
                    <p className="text-error-500 text-sm mt-1">{errors.website}</p>
                  )}
                </div>

                {/* 专业经验 */}
                <div>
                  <label className="label block mb-2">
                    专业经验 <span className="text-error-500">*</span>
                  </label>
                  <textarea
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    placeholder="请详细描述您在无人机领域的工作经验、项目经历和技术专长..."
                    className="input min-h-[120px] resize-none"
                    rows={5}
                  />
                  {errors.experience && (
                    <p className="text-error-500 text-sm mt-1">{errors.experience}</p>
                  )}
                  <p className="text-secondary-500 text-sm mt-1">
                    {formData.experience.length}/1000 字符
                  </p>
                </div>

                {/* 专业领域 */}
                <div>
                  <label className="label block mb-2">
                    专业领域 <span className="text-error-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {specialties.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => handleSpecialtyToggle(specialty)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.specialties.includes(specialty)
                            ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                            : 'bg-secondary-100 text-secondary-700 border-2 border-transparent hover:bg-secondary-200'
                        }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                  {errors.specialties && (
                    <p className="text-error-500 text-sm mt-1">{errors.specialties}</p>
                  )}
                  <p className="text-secondary-500 text-sm mt-1">
                    已选择 {formData.specialties.length}/5 个专业领域
                  </p>
                </div>

                {/* 提交按钮 */}
                <div className="flex justify-center pt-6">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 text-lg"
                  >
                    {isSubmitting ? '提交中...' : '提交申请'}
                  </Button>
                </div>

                {errors.submit && (
                  <div className="text-center">
                    <p className="text-error-500">{errors.submit}</p>
                  </div>
                )}
              </form>
            </div>

            {/* 申请须知 */}
            <div className="mt-12 bg-primary-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-primary-900 mb-4">
                申请须知
              </h3>
              <ul className="space-y-2 text-primary-800">
                <li>• 我们会在3-5个工作日内审核您的申请</li>
                <li>• 通过审核后，您将获得创作者权限和专属后台</li>
                <li>• 创作者可获得50%的利润分成</li>
                <li>• 我们提供技术支持和市场推广协助</li>
                <li>• 如有疑问，请联系我们的客服团队</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
