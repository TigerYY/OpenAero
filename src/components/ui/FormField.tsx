/**
 * 表单字段组件
 * 统一的表单字段样式和验证提示
 */

'use client';

import { ReactNode } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface FormFieldProps {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  success?: boolean;
  helperText?: string;
  children: ReactNode;
  className?: string;
}

export default function FormField({
  label,
  name,
  required = false,
  error,
  success = false,
  helperText,
  children,
  className = '',
}: FormFieldProps) {
  const t = useTranslations();

  return (
    <div className={`mb-4 ${className}`}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {children}
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
        {success && !error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}

      {success && !error && (
        <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          {t('common.valid', { defaultValue: '输入正确' })}
        </p>
      )}
    </div>
  );
}

