'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouting } from '@/lib/routing';
import { useAuth } from '@/contexts/AuthContext';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { isValidEmail } from '@/lib/utils';
import { getLocalizedErrorMessage } from '@/lib/error-messages';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const { route, routes } = useRouting();
  const { sendPasswordResetEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // 清除错误
    if (error) setError(null);
    if (fieldErrors.email) {
      const { email: _, ...rest } = fieldErrors;
      setFieldErrors(rest);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    // 验证邮箱格式
    if (!email) {
      setFieldErrors({ email: t('errors.emailRequired', { defaultValue: '邮箱地址是必填项' }) });
      setLoading(false);
      return;
    }

    if (!isValidEmail(email)) {
      setFieldErrors({ email: t('errors.invalidEmail', { defaultValue: '请输入有效的邮箱地址' }) });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || getLocalizedErrorMessage(data.error || '请求失败，请稍后重试', 'zh-CN'));
      }
    } catch (err: unknown) {
      console.error('Forgot password error:', err);
      setError(getLocalizedErrorMessage(err, 'zh-CN'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 min-h-[60vh]">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-green-600">
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">邮件已发送</h2>
              <p className="mt-2 text-sm text-gray-600">
                如果该邮箱已注册，您将收到重置密码的邮件，请查收并按照邮件中的说明操作。
              </p>
              <div className="mt-6">
                <Link
                  href={route(routes.AUTH.LOGIN)}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  返回登录
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 min-h-[60vh]">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            重置密码
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            输入您的邮箱地址，我们将向您发送重置密码的链接。
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <ErrorMessage error={error} className="mb-4" />}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {t('auth.email', { defaultValue: '邮箱地址' })}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={handleEmailChange}
              className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                fieldErrors.email ? 'border-red-300' : 'border-gray-300'
              } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
              placeholder="your@email.com"
              disabled={loading}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !email}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingSpinner size="sm" message={t('auth.sendingEmail', { defaultValue: '发送中...' })} />
              ) : (
                t('auth.sendResetLink', { defaultValue: '发送重置链接' })
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              href={route(routes.AUTH.LOGIN)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              返回登录
            </Link>
          </div>
        </form>
        </div>
      </div>
    </DefaultLayout>
  );
}
