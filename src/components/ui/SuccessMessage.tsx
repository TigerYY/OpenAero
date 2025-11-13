/**
 * 成功消息组件
 * 用于显示操作成功的反馈
 */

'use client';

import { CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface SuccessMessageProps {
  message: string;
  showIcon?: boolean;
  className?: string;
  onClose?: () => void;
}

export default function SuccessMessage({
  message,
  showIcon = true,
  className = '',
  onClose,
}: SuccessMessageProps) {
  const t = useTranslations();

  return (
    <div
      className={`rounded-md p-4 bg-green-50 border border-green-200 ${className}`}
      role="alert"
    >
      <div className="flex items-start">
        {showIcon && (
          <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-green-600" />
        )}
        <div className="flex-1">
          <p className="text-sm text-green-800">{message}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-2 text-green-600 hover:text-green-700"
            aria-label={t('common.close', { defaultValue: '关闭' })}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

