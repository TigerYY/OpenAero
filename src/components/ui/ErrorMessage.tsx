/**
 * 统一错误消息显示组件
 * 支持国际化、不同类型的错误样式和操作按钮
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedErrorMessage } from '@/lib/error-messages';

export interface ErrorMessageProps {
  error: unknown;
  type?: 'error' | 'warning' | 'info';
  showIcon?: boolean;
  showRetry?: boolean;
  onRetry?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export default function ErrorMessage({
  error,
  type = 'error',
  showIcon = true,
  showRetry = false,
  onRetry,
  className = '',
  children,
}: ErrorMessageProps) {
  const t = useTranslations();
  const locale = useLocale() as 'zh-CN' | 'en-US';
  
  const message = getLocalizedErrorMessage(error, locale);
  
  const typeStyles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-600',
      text: 'text-red-800',
      button: 'text-red-600 hover:text-red-700',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-800',
      button: 'text-yellow-600 hover:text-yellow-700',
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-800',
      button: 'text-blue-600 hover:text-blue-700',
    },
  };

  const styles = typeStyles[type];

  return (
    <div className={`rounded-md p-4 border ${styles.container} ${className}`}>
      <div className="flex items-start">
        {showIcon && (
          <svg
            className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${styles.icon}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            {type === 'error' ? (
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            ) : type === 'warning' ? (
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            )}
          </svg>
        )}
        <div className="flex-1">
          <p className={`text-sm ${styles.text}`}>{message}</p>
          {children && <div className="mt-2">{children}</div>}
          {showRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`mt-2 text-sm font-medium underline ${styles.button}`}
            >
              {t('common.retry', { defaultValue: '重试' })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

