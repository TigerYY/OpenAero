/**
 * 邮箱修改表单组件
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { isValidEmail } from '@/lib/utils';
import { getLocalizedErrorMessage } from '@/lib/error-messages';

export default function EmailChangeForm() {
  const { user, refreshProfile } = useAuth();
  const t = useTranslations();
  const [formData, setFormData] = useState({
    newEmail: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setLoading(true);

    // 验证输入
    const errors: Record<string, string> = {};
    if (!formData.newEmail) {
      errors.newEmail = t('errors.emailRequired', { defaultValue: '新邮箱地址是必填项' });
    } else if (!isValidEmail(formData.newEmail)) {
      errors.newEmail = t('errors.invalidEmail', { defaultValue: '请输入有效的邮箱地址' });
    } else if (formData.newEmail === user?.email) {
      errors.newEmail = t('errors.sameEmail', { defaultValue: '新邮箱不能与当前邮箱相同' });
    }

    if (!formData.password) {
      errors.password = t('errors.passwordRequired', { defaultValue: '密码是必填项' });
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/email/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 确保发送 cookies
        body: JSON.stringify({
          newEmail: formData.newEmail,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setFormData({ newEmail: '', password: '' });
        // 刷新用户信息
        await refreshProfile();
      } else {
        setGeneralError(data.message || getLocalizedErrorMessage(data.error || '修改邮箱失败', 'zh-CN'));
      }
    } catch (err: unknown) {
      console.error('Email change error:', err);
      setGeneralError(getLocalizedErrorMessage(err, 'zh-CN'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4 border border-green-200">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-green-800">
              {t('emailChange.success', { defaultValue: '验证邮件已发送到新邮箱，请查收并点击链接确认邮箱修改' })}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {t('emailChange.checkEmail', { defaultValue: '请检查新邮箱的收件箱（包括垃圾邮件文件夹）' })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {generalError && <ErrorMessage error={generalError} />}

      <div>
        <label htmlFor="currentEmail" className="block text-sm font-medium text-gray-700 mb-2">
          {t('emailChange.currentEmail', { defaultValue: '当前邮箱' })}
        </label>
        <input
          type="email"
          id="currentEmail"
          value={user?.email || ''}
          disabled
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
        />
      </div>

      <div>
        <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 mb-2">
          {t('emailChange.newEmail', { defaultValue: '新邮箱地址' })}
        </label>
        <input
          type="email"
          id="newEmail"
          value={formData.newEmail}
          onChange={(e) => {
            setFormData({ ...formData, newEmail: e.target.value });
            if (fieldErrors.newEmail) {
              const { newEmail: _, ...rest } = fieldErrors;
              setFieldErrors(rest);
            }
          }}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            fieldErrors.newEmail ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="new@example.com"
          disabled={loading}
        />
        {fieldErrors.newEmail && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.newEmail}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          {t('emailChange.password', { defaultValue: '当前密码' })}
        </label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value });
            if (fieldErrors.password) {
              const { password: _, ...rest } = fieldErrors;
              setFieldErrors(rest);
            }
          }}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            fieldErrors.password ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder={t('emailChange.passwordPlaceholder', { defaultValue: '请输入当前密码以确认' })}
          disabled={loading}
        />
        {fieldErrors.password && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {t('emailChange.passwordHint', { defaultValue: '需要输入当前密码以确认身份' })}
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !formData.newEmail || !formData.password}
        >
          {loading ? (
            <LoadingSpinner size="sm" message={t('common.saving', { defaultValue: '保存中...' })} />
          ) : (
            t('emailChange.submit', { defaultValue: '发送验证邮件' })
          )}
        </button>
      </div>
    </form>
  );
}

