'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouting } from '@/lib/routing';
import { useAuth } from '@/contexts/AuthContext';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { isValidEmail } from '@/lib/utils';
import { getLocalizedErrorMessage } from '@/lib/error-messages';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const { route, routes } = useRouting();
  const { signIn, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const verified = searchParams.get('verified') === 'true';

  // 实时验证邮箱
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    setEmailNotVerified(false);
    
    if (email && !isValidEmail(email)) {
      setFieldErrors({ ...fieldErrors, email: '请输入有效的邮箱地址' });
    } else {
      const { email: _, ...rest } = fieldErrors;
      setFieldErrors(rest);
    }
  };

  // 重新发送验证邮件
  const handleResendVerification = async () => {
    if (!formData.email) {
      setError('请先输入邮箱地址');
      return;
    }

    setResendingVerification(true);
    setError('');
    setVerificationSent(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationSent(true);
        setEmailNotVerified(false);
      } else {
        setError(data.error || '发送验证邮件失败');
      }
    } catch (err) {
      setError('发送验证邮件失败，请稍后重试');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setEmailNotVerified(false);
    setLoading(true);

    // 验证邮箱格式
    if (!isValidEmail(formData.email)) {
      setFieldErrors({ email: '请输入有效的邮箱地址' });
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await signIn(formData.email, formData.password);

      if (signInError) {
        // 使用统一的错误消息处理
        const localizedError = getLocalizedErrorMessage(signInError, 'zh-CN');
        
        // 检查是否是邮箱未验证错误
        if (signInError.message.includes('验证') || 
            signInError.message.includes('Email not confirmed') ||
            signInError.message.includes('email_not_confirmed')) {
          setEmailNotVerified(true);
        }
        
        setError(localizedError);
        setLoading(false);
        return;
      }

      // 登录成功，AuthContext 会自动更新状态
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      // 使用统一的错误消息处理
      const localizedError = getLocalizedErrorMessage(err, 'zh-CN');
      setError(localizedError);
      
      // 检查是否是邮箱未验证错误
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('验证') || 
          errorMessage.includes('Email not confirmed') ||
          errorMessage.includes('email_not_confirmed')) {
        setEmailNotVerified(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录到 OpenAero
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            还没有账户？{' '}
            <Link href={route(routes.AUTH.REGISTER)} className="font-medium text-blue-600 hover:text-blue-500">
              立即注册
            </Link>
          </p>
        </div>

        {verified && (
          <div className="rounded-md bg-green-50 p-4 border border-green-200">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-green-800">
                邮箱验证成功！现在可以登录了。
              </div>
            </div>
          </div>
        )}

        {verificationSent && (
          <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <div className="text-sm text-blue-800">
                验证邮件已发送，请查收您的邮箱。
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <ErrorMessage
              error={error}
              type={emailNotVerified ? 'warning' : 'error'}
              showIcon={true}
            >
              {emailNotVerified && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium underline disabled:opacity-50"
                >
                  {resendingVerification 
                    ? t('auth.resendingVerification', { defaultValue: '发送中...' })
                    : t('auth.resendVerification', { defaultValue: '重新发送验证邮件' })
                  }
                </button>
              )}
            </ErrorMessage>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱地址
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleEmailChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="your@email.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="您的密码"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                href={route(routes.AUTH.FORGOT_PASSWORD)}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                忘记密码？
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <LoadingSpinner size="sm" message="" />
                  <span className="ml-2">{t('auth.loggingIn', { defaultValue: '登录中...' })}</span>
                </span>
              ) : (
                t('auth.login', { defaultValue: '登录' })
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
