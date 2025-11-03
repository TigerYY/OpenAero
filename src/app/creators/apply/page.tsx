'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import CreatorApplicationForm from '@/components/forms/CreatorApplicationForm';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';

// 图标组件
const User = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const Award = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const FileText = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Upload = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const CheckCircle = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface CreatorApplication {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    bio: string;
  };
  experience: {
    yearsOfExperience: string;
    education: string;
    specialties: string[];
    previousWork: string;
    skills: string[];
  };
  portfolio: {
    portfolioUrl: string;
    githubUrl: string;
    linkedinUrl: string;
    certifications: string[];
  };
  documents: {
    resume: string[];
    portfolio: string[];
    certificates: string[];
  };
  agreement: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    qualityStandards: boolean;
  };
}

const experienceOptions = [
  '1年以下',
  '1-3年',
  '3-5年',
  '5-10年',
  '10年以上'
];

const specialtyOptions = [
  '无人机设计',
  '飞控开发',
  '航拍摄影',
  '竞速飞行',
  '农业应用',
  '安防巡检',
  '测绘勘探',
  '教育培训'
];

const skillOptions = [
  'CAD设计',
  '3D建模',
  '电路设计',
  '编程开发',
  '飞行操控',
  '后期制作',
  '项目管理',
  '技术写作'
];

export default function CreatorApplyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationData, setApplicationData] = useState<CreatorApplication>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
      bio: ''
    },
    experience: {
      yearsOfExperience: '',
      education: '',
      specialties: [],
      previousWork: '',
      skills: []
    },
    portfolio: {
      portfolioUrl: '',
      githubUrl: '',
      linkedinUrl: '',
      certifications: []
    },
    documents: {
      resume: [],
      portfolio: [],
      certificates: []
    },
    agreement: {
      termsAccepted: false,
      privacyAccepted: false,
      qualityStandards: false
    }
  });

  const steps = [
    { id: 0, title: '个人信息', icon: User, description: '填写基本个人信息' },
    { id: 1, title: '专业经验', icon: Award, description: '展示您的专业背景' },
    { id: 2, title: '作品展示', icon: FileText, description: '提供作品链接和证书' },
    { id: 3, title: '文档上传', icon: Upload, description: '上传相关文档' },
    { id: 4, title: '协议确认', icon: CheckCircle, description: '确认服务协议' }
  ];

  const updateApplicationData = (section: keyof CreatorApplication, data: any) => {
    setApplicationData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
  };

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    const currentSpecialties = applicationData.experience.specialties;
    if (checked) {
      updateApplicationData('experience', {
        specialties: [...currentSpecialties, specialty]
      });
    } else {
      updateApplicationData('experience', {
        specialties: currentSpecialties.filter(s => s !== specialty)
      });
    }
  };

  const handleSkillChange = (skill: string, checked: boolean) => {
    const currentSkills = applicationData.experience.skills;
    if (checked) {
      updateApplicationData('experience', {
        skills: [...currentSkills, skill]
      });
    } else {
      updateApplicationData('experience', {
        skills: currentSkills.filter(s => s !== skill)
      });
    }
  };

  const addCertification = () => {
    const input = document.getElementById('newCertification') as HTMLInputElement;
    if (input && input.value.trim()) {
      updateApplicationData('portfolio', {
        certifications: [...applicationData.portfolio.certifications, input.value.trim()]
      });
      input.value = '';
    }
  };

  const removeCertification = (cert: string) => {
    updateApplicationData('portfolio', {
      certifications: applicationData.portfolio.certifications.filter(c => c !== cert)
    });
  };

  const handleFileUpload = (section: keyof CreatorApplication['documents'], results: Array<{ url?: string }>) => {
    const urls = results.map(r => r.url).filter((url): url is string => url !== undefined);
    updateApplicationData('documents', {
      [section]: [...applicationData.documents[section], ...urls]
    });
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return applicationData.personalInfo.name && 
               applicationData.personalInfo.email && 
               applicationData.personalInfo.bio;
      case 1:
        return applicationData.experience.yearsOfExperience && 
               applicationData.experience.specialties.length > 0 && 
               applicationData.experience.previousWork;
      case 2:
        return applicationData.portfolio.portfolioUrl;
      case 3:
        return applicationData.documents.resume.length > 0;
      case 4:
        return applicationData.agreement.termsAccepted && 
               applicationData.agreement.privacyAccepted && 
               applicationData.agreement.qualityStandards;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/creators/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      const result = await response.json();

      if (result.success) {
        alert('申请提交成功！我们将在3-5个工作日内完成审核。');
        router.push('/creators/status');
      } else {
        alert('申请提交失败：' + result.error);
      }
    } catch (error) {
      console.error('提交申请失败:', error);
      alert('申请提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名 *
                </label>
                <input
                  type="text"
                  value={applicationData.personalInfo.name}
                  onChange={(e) => updateApplicationData('personalInfo', { name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入您的真实姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱 *
                </label>
                <input
                  type="email"
                  value={applicationData.personalInfo.email}
                  onChange={(e) => updateApplicationData('personalInfo', { email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入您的邮箱地址"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系电话
                </label>
                <input
                  type="tel"
                  value={applicationData.personalInfo.phone}
                  onChange={(e) => updateApplicationData('personalInfo', { phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入您的联系电话"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所在地区
                </label>
                <input
                  type="text"
                  value={applicationData.personalInfo.location}
                  onChange={(e) => updateApplicationData('personalInfo', { location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入您的所在地区"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                个人简介 *
              </label>
              <textarea
                value={applicationData.personalInfo.bio}
                onChange={(e) => updateApplicationData('personalInfo', { bio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请简要介绍您的背景、技能和经验（200-500字）"
                rows={4}
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工作经验 *
                </label>
                <select
                  value={applicationData.experience.yearsOfExperience}
                  onChange={(e) => updateApplicationData('experience', { yearsOfExperience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择您的工作经验</option>
                  {experienceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  教育背景
                </label>
                <input
                  type="text"
                  value={applicationData.experience.education}
                  onChange={(e) => updateApplicationData('experience', { education: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入您的教育背景"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                专业领域 * (请选择至少一项)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {specialtyOptions.map((specialty) => (
                  <div key={specialty} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={specialty}
                      checked={applicationData.experience.specialties.includes(specialty)}
                      onChange={(e) => handleSpecialtyChange(specialty, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={specialty} className="text-sm">
                      {specialty}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目经验 *
              </label>
              <textarea
                value={applicationData.experience.previousWork}
                onChange={(e) => updateApplicationData('experience', { previousWork: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请详细描述您的项目经验和成果（300-800字）"
                rows={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                技能标签
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {skillOptions.map((skill) => (
                  <div key={skill} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={skill}
                      checked={applicationData.experience.skills.includes(skill)}
                      onChange={(e) => handleSkillChange(skill, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={skill} className="text-sm">
                      {skill}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  作品集链接 *
                </label>
                <input
                  type="url"
                  value={applicationData.portfolio.portfolioUrl}
                  onChange={(e) => updateApplicationData('portfolio', { portfolioUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://your-portfolio.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub链接
                </label>
                <input
                  type="url"
                  value={applicationData.portfolio.githubUrl}
                  onChange={(e) => updateApplicationData('portfolio', { githubUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://github.com/username"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn链接
              </label>
              <input
                type="url"
                value={applicationData.portfolio.linkedinUrl}
                onChange={(e) => updateApplicationData('portfolio', { linkedinUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                专业认证
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {applicationData.portfolio.certifications.map((cert, index) => (
                  <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {cert}
                    <button
                      type="button"
                      onClick={() => removeCertification(cert)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="newCertification"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入认证名称"
                />
                <Button type="button" onClick={addCertification} variant="outline">
                  添加
                </Button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                简历文件 *
              </label>
              <FileUpload
                multiple={false}
                accept=".pdf,.doc,.docx"
                maxSize={5 * 1024 * 1024}
                onUpload={(results) => handleFileUpload('resume', results)}
              />
              <p className="text-sm text-gray-500 mt-1">
                支持PDF、DOC、DOCX格式，文件大小不超过5MB
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作品文件
              </label>
              <FileUpload
                multiple={true}
                accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov"
                maxSize={10 * 1024 * 1024}
                maxFiles={5}
                onUpload={(results) => handleFileUpload('portfolio', results)}
              />
              <p className="text-sm text-gray-500 mt-1">
                支持图片、视频、PDF格式，单个文件不超过10MB，最多5个文件
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                证书文件
              </label>
              <FileUpload
                multiple={true}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={5 * 1024 * 1024}
                maxFiles={3}
                onUpload={(results) => handleFileUpload('certificates', results)}
              />
              <p className="text-sm text-gray-500 mt-1">
                支持图片、PDF格式，单个文件不超过5MB，最多3个文件
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={applicationData.agreement.termsAccepted}
                  onChange={(e) => updateApplicationData('agreement', { termsAccepted: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div className="space-y-1">
                  <label htmlFor="terms" className="text-sm font-medium">
                    我已阅读并同意《创作者服务协议》*
                  </label>
                  <p className="text-xs text-gray-600">
                    包括创作者权利义务、收益分成、知识产权等条款
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="privacy"
                  checked={applicationData.agreement.privacyAccepted}
                  onChange={(e) => updateApplicationData('agreement', { privacyAccepted: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div className="space-y-1">
                  <label htmlFor="privacy" className="text-sm font-medium">
                    我已阅读并同意《隐私政策》*
                  </label>
                  <p className="text-xs text-gray-600">
                    包括个人信息收集、使用、存储和保护等条款
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="quality"
                  checked={applicationData.agreement.qualityStandards}
                  onChange={(e) => updateApplicationData('agreement', { qualityStandards: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div className="space-y-1">
                  <label htmlFor="quality" className="text-sm font-medium">
                    我承诺遵守平台质量标准 *
                  </label>
                  <p className="text-xs text-gray-600">
                    包括技术规范、安全标准、测试要求等质量要求
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">申请须知</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 审核周期：3-5个工作日</li>
                <li>• 审核标准：技术能力、作品质量、行业经验</li>
                <li>• 通过后将获得创作者认证和平台收益分成权限</li>
                <li>• 如有疑问，请联系客服：support@openaero.com</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">创作者申请</h1>
          <p className="text-gray-600">
            加入开元空御创作者社区，分享您的专业知识和经验
          </p>
        </div>

        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-2
                    ${isActive ? 'bg-blue-600 text-white' : 
                      isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}
                  `}>
                    <Icon />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-400 max-w-20">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 表单内容 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {steps[currentStep]?.title}
            </h2>
            <p className="text-gray-600">
              {steps[currentStep]?.description}
            </p>
          </div>

          {renderStepContent()}
        </div>

        {/* 导航按钮 */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            上一步
          </Button>

          <div className="flex space-x-3">
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!validateCurrentStep()}
              >
                下一步
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!validateCurrentStep() || isSubmitting}
              >
                {isSubmitting ? '提交中...' : '提交申请'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
