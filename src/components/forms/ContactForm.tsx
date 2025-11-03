'use client';

import React from 'react';

import MobileForm from '../MobileForm';

interface ContactFormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  subject: string;
  message: string;
}

interface ContactFormProps {
  onSubmit?: (data: ContactFormData) => Promise<void>;
  className?: string;
}

const ContactForm: React.FC<ContactFormProps> = ({ 
  onSubmit,
  className = ''
}) => {
  const handleSubmit = async (data: Record<string, any>) => {
    if (onSubmit) {
      await onSubmit(data as ContactFormData);
    } else {
      // 默认提交到 API
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('提交失败，请重试');
      }
    }
  };

  const formFields = [
    {
      name: 'name',
      label: '姓名',
      type: 'text' as const,
      placeholder: '请输入您的姓名',
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
      inputMode: 'email' as const
    },
    {
      name: 'company',
      label: '公司',
      type: 'text' as const,
      placeholder: '请输入您的公司名称（可选）',
      autoComplete: 'organization'
    },
    {
      name: 'phone',
      label: '联系电话',
      type: 'tel' as const,
      placeholder: '请输入您的联系电话',
      autoComplete: 'tel',
      inputMode: 'tel' as const
    },
    {
      name: 'subject',
      label: '主题',
      type: 'text' as const,
      placeholder: '请输入咨询主题',
      required: true,
      maxLength: 100,
      validation: (value: string) => {
        if (value.length < 5) {
          return '主题至少需要5个字符';
        }
        return null;
      }
    },
    {
      name: 'message',
      label: '留言内容',
      type: 'textarea' as const,
      placeholder: '请详细描述您的需求或问题...',
      required: true,
      rows: 5,
      maxLength: 1000,
      validation: (value: string) => {
        if (value.length < 10) {
          return '留言内容至少需要10个字符';
        }
        return null;
      }
    }
  ];

  return (
    <MobileForm
      title="联系我们"
      description="我们会在24小时内回复您的咨询"
      fields={formFields}
      onSubmit={handleSubmit}
      submitText="发送咨询"
      className={className}
      validateOnChange={true}
      resetOnSubmit={true}
    />
  );
};

export default ContactForm;