'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouting } from '@/lib/routing';
import { useAuth } from '@/contexts/AuthContext';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { getLocalizedErrorMessage } from '@/lib/error-messages';
import { InputSanitizer } from '@/lib/security';

export default function ResetPasswordPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { route, routes, routeWithParams } = useRouting();
  const { resetPassword } = useAuth();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // 检查是否有有效的 token (从 URL hash 获取)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    // Supabase 密码重置链接格式: #access_token=xxx&type=recovery
    if (!accessToken || type !== 'recovery') {
      setTokenValid(false);
      setError(t('errors.invalidResetLink', { defaultValue: '无效的重置链接，请重新申请密码重置' }));
    } else {
      setTokenValid(true);
    }
  }, [t]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, password: newPassword });
    
    // 验证密码强度
    const validation = InputSanitizer.validatePassword(newPassword);
    setPasswordValid(validation.isValid && validation.score >= 4);
    
    // 清除密码错误
    if (fieldErrors.password) {
      const { password: _, ...rest } = fieldErrors;
      setFieldErrors(rest);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: t('errors.passwordsMismatch', { defaultValue: '两次输入的密码不一致' }) });
      setLoading(false);
      return;
    }

    // 验证密码强度
    if (!passwordValid) {
      setFieldErrors({ password: t('errors.passwordTooWeak', { defaultValue: '密码强度不足' }) });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: formData.password }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        
        // 3秒后跳转到登录页
        setTimeout(() => {
          router.push(routeWithParams(routes.AUTH.LOGIN, { reset: 'success' }));
        }, 3000);
      } else {
        setError(data.message || getLocalizedErrorMessage(data.error || '密码重置失败，请稍后重试', 'zh-CN'));
      }
    } catch (err: unknown) {
      console.error('Reset password error:', err);
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
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">密码重置成功！</h2>
              <p className="mt-2 text-sm text-gray-600">
                您的密码已成功重置，即将跳转到登录页面...
              </p>
              <div className="mt-6">
                <Link
                  href={route(routes.AUTH.LOGIN)}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  立即登录
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
            设置新密码
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            请输入您的新密码
          </p>
        </div>

        {tokenValid === false && error && (
          <ErrorMessage error={error} className="mb-4" />
        )}

        {tokenValid === true && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && <ErrorMessage error={error} className="mb-4" />}

            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('auth.newPassword', { defaultValue: '新密码' })}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handlePasswordChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder={t('auth.passwordPlaceholder', { defaultValue: '至少 8 个字符' })}
                  disabled={loading}
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                )}
                {formData.password && (
                  <div className="mt-2">
                    <PasswordStrengthIndicator
                      password={formData.password}
                      onValidationChange={(isValid) => setPasswordValid(isValid)}
                      showRequirements={true}
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  {t('auth.confirmPassword', { defaultValue: '确认新密码' })}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (fieldErrors.confirmPassword) {
                      const { confirmPassword: _, ...rest } = fieldErrors;
                      setFieldErrors(rest);
                    }
                  }}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    fieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder={t('auth.confirmPasswordPlaceholder', { defaultValue: '再次输入新密码' })}
                  disabled={loading}
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !passwordValid || formData.password !== formData.confirmPassword}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <LoadingSpinner size="sm" message={t('auth.resetting', { defaultValue: '重置中...' })} />
                ) : (
                  t('auth.resetPassword', { defaultValue: '重置密码' })
                )}
              </button>
            </div>
          </form>
        )}

        {tokenValid === true && (
          <div className="text-center mt-4">
            <Link
              href={route(routes.AUTH.LOGIN)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {t('auth.login', { defaultValue: '返回登录' })}
            </Link>
          </div>
        )}
        </div>
      </div>
    </DefaultLayout>
  );
}
