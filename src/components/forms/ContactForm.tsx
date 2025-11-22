'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('contact.form');
  
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
        throw new Error(t('submitError'));
      }
    }
  };

  const formFields = [
    {
      name: 'name',
      label: t('fields.name.label'),
      type: 'text' as const,
      placeholder: t('fields.name.placeholder'),
      required: true,
      autoComplete: 'name',
      validation: (value: string) => {
        if (value.length < 2) {
          return t('fields.name.validation');
        }
        return null;
      }
    },
    {
      name: 'email',
      label: t('fields.email.label'),
      type: 'email' as const,
      placeholder: t('fields.email.placeholder'),
      required: true,
      autoComplete: 'email',
      inputMode: 'email' as const
    },
    {
      name: 'company',
      label: t('fields.company.label'),
      type: 'text' as const,
      placeholder: t('fields.company.placeholder'),
      autoComplete: 'organization'
    },
    {
      name: 'phone',
      label: t('fields.phone.label'),
      type: 'tel' as const,
      placeholder: t('fields.phone.placeholder'),
      autoComplete: 'tel',
      inputMode: 'tel' as const
    },
    {
      name: 'subject',
      label: t('fields.subject.label'),
      type: 'text' as const,
      placeholder: t('fields.subject.placeholder'),
      required: true,
      maxLength: 100,
      validation: (value: string) => {
        if (value.length < 5) {
          return t('fields.subject.validation');
        }
        return null;
      }
    },
    {
      name: 'message',
      label: t('fields.message.label'),
      type: 'textarea' as const,
      placeholder: t('fields.message.placeholder'),
      required: true,
      rows: 5,
      maxLength: 1000,
      validation: (value: string) => {
        if (value.length < 10) {
          return t('fields.message.validation');
        }
        return null;
      }
    }
  ];

  return (
    <MobileForm
      title={t('title')}
      description={t('responseTime')}
      fields={formFields}
      onSubmit={handleSubmit}
      submitText={t('submitText')}
      className={className}
      validateOnChange={true}
      resetOnSubmit={true}
    />
  );
};

export default ContactForm;