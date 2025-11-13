/**
 * Toast 通知工具
 * 统一管理操作成功/失败的反馈提示
 */

'use client';

import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

/**
 * 显示成功消息
 */
export function showSuccess(message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) {
  return toast.success(message, {
    duration: options?.duration || 3000,
    ...(options?.action && {
      action: {
        label: options.action.label,
        onClick: options.action.onClick,
      },
    }),
  });
}

/**
 * 显示错误消息
 */
export function showError(message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) {
  return toast.error(message, {
    duration: options?.duration || 5000,
    ...(options?.action && {
      action: {
        label: options.action.label,
        onClick: options.action.onClick,
      },
    }),
  });
}

/**
 * 显示警告消息
 */
export function showWarning(message: string, options?: { duration?: number }) {
  return toast.warning(message, {
    duration: options?.duration || 4000,
  });
}

/**
 * 显示信息消息
 */
export function showInfo(message: string, options?: { duration?: number }) {
  return toast.info(message, {
    duration: options?.duration || 3000,
  });
}

/**
 * 显示加载消息
 */
export function showLoading(message: string) {
  return toast.loading(message);
}

/**
 * 更新 toast（用于加载状态更新）
 */
export function updateToast(toastId: string | number, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
  toast.dismiss(toastId);
  switch (type) {
    case 'success':
      return showSuccess(message);
    case 'error':
      return showError(message);
    case 'warning':
      return showWarning(message);
    case 'info':
      return showInfo(message);
  }
}

/**
 * 使用翻译的 Toast Hook
 * 注意：需要在组件内使用 useTranslations
 */
export function createToastHelpers(t: (key: string, params?: Record<string, any>) => string) {
  return {
    success: (key: string, params?: Record<string, any>) => {
      const message = t(key, params);
      return showSuccess(message);
    },
    error: (key: string, params?: Record<string, any>) => {
      const message = t(key, params);
      return showError(message);
    },
    warning: (key: string, params?: Record<string, any>) => {
      const message = t(key, params);
      return showWarning(message);
    },
    info: (key: string, params?: Record<string, any>) => {
      const message = t(key, params);
      return showInfo(message);
    },
    loading: (key: string, params?: Record<string, any>) => {
      const message = t(key, params);
      return showLoading(message);
    },
  };
}

