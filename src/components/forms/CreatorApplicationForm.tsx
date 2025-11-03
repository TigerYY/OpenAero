'use client';

import React from 'react';

import MobileForm from '../MobileForm';

interface CreatorApplicationData {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  experience: string;
  specialties: string[];
  portfolio: string;
  motivation: string;
  availability: string;
}

interface CreatorApplicationFormProps {
  onSubmit?: (data: CreatorApplicationData) => Promise<void>;
  className?: string;
}

const CreatorApplicationForm: React.FC<CreatorApplicationFormProps> = ({ 
  onSubmit,
  className = ''
}) => {
  const handleSubmit = async (data: Record<string, any>) => {
    // 处理专业领域数组
    const processedData = {
      ...data,
      specialties: typeof data.specialties === 'string' 
        ? data.specialties.split(',').map((s: string) => s.trim()).filter(Boolean)
        : data.specialties
    };

    if (onSubmit) {
      await onSubmit(processedData as CreatorApplicationData);
    } else {
      // 默认提交到 API
      const response = await fetch('/api/creators/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        throw new Error('申请提交失败，请重试');
      }
    }
  };

  const formFields = [
    {
      name: 'name',
      label: '姓名',
      type: 'text' as const,
      placeholder: '请输入您的真实姓名',
      required: true,
      autoComplete: 'name',
      validation: (value: string) => {
        if (value.length < 2) {
          return '姓名至少需要2个字符';
        }
        return null;
      }
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'email' as const,
      placeholder: '请输入您的邮箱地址',
      required: true,
      autoComplete: 'email',
      inputMode: 'email' as const,
      helperText: '我们将通过此邮箱与您联系'
    },
    {
      name: 'phone',
      label: '联系电话',
      type: 'tel' as const,
      placeholder: '请输入您的联系电话',
      required: true,
      autoComplete: 'tel',
      inputMode: 'tel' as const
    },
    {
      name: 'company',
      label: '公司/机构',
      type: 'text' as const,
      placeholder: '请输入您所在的公司或机构',
      autoComplete: 'organization'
    },
    {
      name: 'position',
      label: '职位',
      type: 'text' as const,
      placeholder: '请输入您的职位或职业',
      required: true,
      validation: (value: string) => {
        if (value.length < 2) {
          return '职位信息至少需要2个字符';
        }
        return null;
      }
    },
    {
      name: 'experience',
      label: '工作经验',
      type: 'select' as const,
      required: true,
      options: [
        { value: '', label: '请选择工作经验' },
        { value: '0-1', label: '0-1年' },
        { value: '1-3', label: '1-3年' },
        { value: '3-5', label: '3-5年' },
        { value: '5-10', label: '5-10年' },
        { value: '10+', label: '10年以上' }
      ]
    },
    {
      name: 'specialties',
      label: '专业领域',
      type: 'text' as const,
      placeholder: '请输入您的专业领域，用逗号分隔',
      required: true,
      maxLength: 200,
      helperText: '例如：机械设计,电子工程,软件开发',
      validation: (value: string) => {
        const specialties = value.split(',').map(s => s.trim()).filter(Boolean);
        if (specialties.length === 0) {
          return '请至少输入一个专业领域';
        }
        if (specialties.length > 10) {
          return '专业领域不能超过10个';
        }
        return null;
      }
    },
    {
      name: 'portfolio',
      label: '作品集链接',
      type: 'text' as const,
      placeholder: '请输入您的作品集或个人网站链接',
      helperText: '可以是GitHub、个人网站、在线作品集等',
      validation: (value: string) => {
        if (value && !value.match(/^https?:\/\/.+/)) {
          return '请输入有效的网址（以http://或https://开头）';
        }
        return null;
      }
    },
    {
      name: 'motivation',
      label: '申请动机',
      type: 'textarea' as const,
      placeholder: '请描述您为什么想成为我们的创作者，以及您能为平台带来什么价值...',
      required: true,
      rows: 5,
      maxLength: 500,
      validation: (value: string) => {
        if (value.length < 50) {
          return '申请动机至少需要50个字符';
        }
        return null;
      }
    },
    {
      name: 'availability',
      label: '可投入时间',
      type: 'select' as const,
      required: true,
      options: [
        { value: '', label: '请选择可投入时间' },
        { value: 'part-time', label: '兼职（每周10-20小时）' },
        { value: 'full-time', label: '全职（每周40小时以上）' },
        { value: 'flexible', label: '灵活安排' },
        { value: 'project-based', label: '按项目安排' }
      ]
    }
  ];

  return (
    <MobileForm
      title="创作者申请"
      description="加入我们的创作者社区，分享您的专业知识和经验"
      fields={formFields}
      onSubmit={handleSubmit}
      submitText="提交申请"
      className={className}
      validateOnChange={true}
      autoSave={true}
      autoSaveDelay={3000}
      showSaveButton={true}
      saveText="保存草稿"
    />
  );
};

export default CreatorApplicationForm;