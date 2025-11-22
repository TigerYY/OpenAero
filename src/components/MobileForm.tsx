'use client';

import { AlertCircle, CheckCircle, Loader2, Save, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import MobileFormField from './MobileFormField';

interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: (value: any) => string | null;
  helperText?: string;
  rows?: number;
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url';
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
}

interface MobileFormProps {
  title?: string;
  description?: string;
  fields: FormField[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onSave?: (data: Record<string, any>) => Promise<void>;
  submitText?: string;
  saveText?: string;
  className?: string;
  showSaveButton?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
  validateOnChange?: boolean;
  resetOnSubmit?: boolean;
  disabled?: boolean;
}

const MobileForm: React.FC<MobileFormProps> = ({
  title,
  description,
  fields,
  initialData = {},
  onSubmit,
  onSave,
  submitText,
  saveText,
  className = '',
  showSaveButton = false,
  autoSave = false,
  autoSaveDelay = 2000,
  validateOnChange = true,
  resetOnSubmit = false,
  disabled = false
}) => {
  const t = useTranslations('common.formValidation');
  const tCommon = useTranslations('common');
  
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const formRef = useRef<HTMLFormElement>(null);
  
  // 默认文本
  const defaultSubmitText = submitText || tCommon('submit');
  const defaultSaveText = saveText || tCommon('save');

  // 自动保存
  useEffect(() => {
    if (autoSave && onSave && Object.keys(touched).length > 0) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, autoSave, autoSaveDelay]);

  // 验证单个字段
  const validateField = useCallback((name: string, value: any): string | null => {
    const field = fields.find(f => f.name === name);
    if (!field) return null;

    // 必填验证
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${field.label} ${t('required')}`;
    }

    // 自定义验证
    if (field.validation && value) {
      return field.validation(value);
    }

    // 内置验证
    if (value && typeof value === 'string') {
      switch (field.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return t('invalidEmail');
          }
          break;
        case 'tel':
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (!phoneRegex.test(value.replace(/\s|-/g, ''))) {
            return t('invalidPhone');
          }
          break;
      }

      // 长度验证
      if (field.maxLength && value.length > field.maxLength) {
        return `${field.label} ${t('maxLength', { maxLength: field.maxLength })}`;
      }

      // 正则验证
      if (field.pattern && !new RegExp(field.pattern).test(value)) {
        return `${field.label} ${t('invalidFormat')}`;
      }
    }

    // 数字验证
    if (field.type === 'number' && value !== undefined && value !== '') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${field.label} ${t('mustBeNumber')}`;
      }
      if (field.min !== undefined && numValue < field.min) {
        return `${field.label} ${t('minValue', { min: field.min })}`;
      }
      if (field.max !== undefined && numValue > field.max) {
        return `${field.label} ${t('maxValue', { max: field.max })}`;
      }
    }

    return null;
  }, [fields]);

  // 验证所有字段
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field.name, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [fields, formData, validateField]);

  // 处理字段值变化
  const handleFieldChange = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (validateOnChange) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error || '' }));
    }
  }, [validateOnChange, validateField]);

  // 处理字段失焦
  const handleFieldBlur = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    if (!validateOnChange) {
      const error = validateField(name, formData[name]);
      setErrors(prev => ({ ...prev, [name]: error || '' }));
    }
  }, [validateOnChange, validateField, formData]);

  // 处理保存
  const handleSave = useCallback(async () => {
    if (!onSave || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, formData, isSaving]);

  // 处理提交
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || disabled) return;

    // 标记所有字段为已触摸
    const allTouched: Record<string, boolean> = {};
    fields.forEach(field => {
      allTouched[field.name] = true;
    });
    setTouched(allTouched);

    // 验证表单
    if (!validateForm()) {
      setSubmitStatus('error');
      setSubmitMessage(t('checkErrors'));
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');

    try {
      await onSubmit(formData);
      setSubmitStatus('success');
      setSubmitMessage(t('submitSuccess'));
      
      if (resetOnSubmit) {
        setFormData(initialData);
        setTouched({});
        setErrors({});
      }
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage(error instanceof Error ? error.message : t('submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, disabled, fields, validateForm, onSubmit, formData, resetOnSubmit, initialData]);

  // 重置表单
  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
    setSubmitStatus('idle');
    setSubmitMessage('');
  }, [initialData]);

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* 表单标题 */}
      {title && (
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          {description && (
            <p className="text-gray-600">{description}</p>
          )}
        </div>
      )}

      {/* 表单 */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field, index) => (
          <MobileFormField
            key={field.name}
            label={field.label}
            name={field.name}
            type={field.type}
            value={formData[field.name] || ''}
            onChange={(value) => handleFieldChange(field.name, value)}
            onBlur={() => handleFieldBlur(field.name)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            error={touched[field.name] ? errors[field.name] : undefined}
            success={touched[field.name] && !errors[field.name] && formData[field.name]}
            helperText={field.helperText}
            options={field.options}
            rows={field.rows}
            min={field.min}
            max={field.max}
            maxLength={field.maxLength}
            pattern={field.pattern}
            autoComplete={field.autoComplete}
            autoFocus={index === 0}
            inputMode={field.inputMode}
            enterKeyHint={index === fields.length - 1 ? 'send' : 'next'}
          />
        ))}

        {/* 提交状态消息 */}
        {submitMessage && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            submitStatus === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {submitStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{submitMessage}</span>
          </div>
        )}

        {/* 按钮组 */}
        <div className="flex flex-col gap-3 pt-4">
          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isSubmitting || disabled}
            className={`
              w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${isSubmitting || disabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 active:bg-blue-700'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('submitting')}</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>{defaultSubmitText}</span>
              </>
            )}
          </button>

          {/* 保存按钮 */}
          {showSaveButton && onSave && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || disabled}
              className={`
                w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium
                border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${isSaving || disabled
                  ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-gray-500'
                }
              `}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{defaultSaveText}</span>
                </>
              )}
            </button>
          )}

          {/* 重置按钮 */}
          <button
            type="button"
            onClick={resetForm}
            disabled={disabled}
            className="w-full px-6 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {t('resetForm')}
          </button>
        </div>
      </form>

      {/* 自动保存指示器 */}
      {autoSave && isSaving && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('autoSaving')}</span>
        </div>
      )}
    </div>
  );
};

export default MobileForm;