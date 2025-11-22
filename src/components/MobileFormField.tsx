'use client';

import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

interface MobileFormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'textarea' | 'select';
  value: string | number;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  success?: boolean;
  helperText?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url';
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
}

const MobileFormField: React.FC<MobileFormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  required = false,
  disabled = false,
  error,
  success = false,
  helperText,
  options = [],
  rows = 3,
  min,
  max,
  maxLength,
  pattern,
  autoComplete,
  autoFocus = false,
  className = '',
  inputMode,
  enterKeyHint = 'done'
}) => {
  const t = useTranslations('common.formValidation');
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTouched(true);
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    onChange(newValue);
  };

  const getInputClasses = () => {
    const baseClasses = `
      w-full px-4 py-3 text-base border rounded-lg transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
      placeholder:text-gray-400
    `;

    let stateClasses = '';
    if (error && touched) {
      stateClasses = 'border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50';
    } else if (success && touched) {
      stateClasses = 'border-green-500 focus:border-green-500 focus:ring-green-200 bg-green-50';
    } else if (isFocused) {
      stateClasses = 'border-blue-500 focus:border-blue-500 focus:ring-blue-200';
    } else {
      stateClasses = 'border-gray-300 hover:border-gray-400';
    }

    return `${baseClasses} ${stateClasses}`.trim();
  };

  const getLabelClasses = () => {
    const baseClasses = `
      block text-sm font-medium mb-2 transition-colors duration-200
    `;

    let stateClasses = '';
    if (error && touched) {
      stateClasses = 'text-red-700';
    } else if (success && touched) {
      stateClasses = 'text-green-700';
    } else if (isFocused) {
      stateClasses = 'text-blue-700';
    } else {
      stateClasses = 'text-gray-700';
    }

    return `${baseClasses} ${stateClasses}`.trim();
  };

  const renderInput = () => {
    const commonProps = {
      ref: inputRef as any,
      id: name,
      name,
      value: value || '',
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      placeholder,
      required,
      disabled,
      className: getInputClasses(),
      autoComplete,
      inputMode,
      enterKeyHint,
      ...(min !== undefined && { min }),
      ...(max !== undefined && { max }),
      ...(maxLength && { maxLength }),
      ...(pattern && { pattern }),
    };

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={rows}
            style={{ resize: 'vertical', minHeight: '80px' }}
          />
        );

      case 'select':
        return (
          <select {...commonProps}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'password':
        return (
          <div className="relative">
            <input
              {...commonProps}
              type={showPassword ? 'text' : 'password'}
              className={`${getInputClasses()} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        );

      default:
        return <input {...commonProps} type={type} />;
    }
  };

  const renderStatusIcon = () => {
    if (!touched) return null;

    if (error) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }

    if (success) {
      return <Check className="w-5 h-5 text-green-500" />;
    }

    return null;
  };

  return (
    <div className={`mb-4 ${className}`}>
      {/* 标签 */}
      <label htmlFor={name} className={getLabelClasses()}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* 输入框容器 */}
      <div className="relative">
        {renderInput()}
        
        {/* 状态图标 */}
        {type !== 'password' && type !== 'textarea' && type !== 'select' && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {renderStatusIcon()}
          </div>
        )}
      </div>

      {/* 帮助文本和错误信息 */}
      <div className="mt-2 min-h-[20px]">
        {error && touched && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {!error && helperText && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
        
        {success && touched && !error && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{t('inputValid')}</span>
          </div>
        )}
      </div>

      {/* 字符计数 */}
      {maxLength && type === 'textarea' && (
        <div className="text-right text-xs text-gray-500 mt-1">
          {String(value).length}/{maxLength}
        </div>
      )}
    </div>
  );
};

export default MobileFormField;