'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouting } from '@/lib/routing';
import { useAuth } from '@/contexts/AuthContext';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { isValidEmail } from '@/lib/utils';
import { getLocalizedErrorMessage } from '@/lib/error-messages';

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations();
  const { route, routes } = useRouting();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordValid, setPasswordValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 验证邮箱格式
  const validateEmail = (email: string): string | null => {
    if (!email) {
      return '邮箱地址是必填项';
    }
    if (!isValidEmail(email)) {
      return '请输入有效的邮箱地址';
    }
    return null;
  };

  // 验证密码
  const validatePassword = (password: string): string | null => {
    if (!password) {
      return '密码是必填项';
    }
    if (password.length < 8) {
      return '密码至少需要8个字符';
    }
    if (!/[A-Z]/.test(password)) {
      return '密码必须包含大写字母';
    }
    if (!/[a-z]/.test(password)) {
      return '密码必须包含小写字母';
    }
    if (!/[0-9]/.test(password)) {
      return '密码必须包含数字';
    }
    return null;
  };

  // 实时验证邮箱
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    
    if (email && !isValidEmail(email)) {
      setFieldErrors({ ...fieldErrors, email: '请输入有效的邮箱地址' });
    } else {
      const { email: _, ...rest } = fieldErrors;
      setFieldErrors(rest);
    }
  };

  // 实时验证密码确认
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const confirmPassword = e.target.value;
    setFormData({ ...formData, confirmPassword });
    
    if (confirmPassword && confirmPassword !== formData.password) {
      setFieldErrors({ ...fieldErrors, confirmPassword: '两次输入的密码不一致' });
    } else {
      const { confirmPassword: _, ...rest } = fieldErrors;
      setFieldErrors(rest);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    // 验证邮箱
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      setLoading(false);
      return;
    }

    // 验证密码
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setFieldErrors({ password: passwordError });
      setLoading(false);
      return;
    }

    // 验证密码确认
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: '两次输入的密码不一致' });
      setLoading(false);
      return;
    }

    // 验证密码强度
    if (!passwordValid) {
      setError('密码强度不足，请使用更强的密码');
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          display_name: `${formData.firstName} ${formData.lastName}`.trim(),
        }
      );

      if (signUpError) {
        // 使用统一的错误消息处理
        const localizedError = getLocalizedErrorMessage(signUpError, 'zh-CN');
        setError(localizedError);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err: unknown) {
      // 使用统一的错误消息处理
      const localizedError = getLocalizedErrorMessage(err, 'zh-CN');
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-600">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">注册成功！</h2>
            <p className="mt-2 text-sm text-gray-600">
              我们已向您的邮箱发送了验证邮件，请查收并点击链接验证您的账户。
            </p>
            <div className="mt-6">
              <Link
                href={route('/login')}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                返回登录
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            注册 OpenAero 账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            已有账户？{' '}
            <Link href={route(routes.AUTH.LOGIN)} className="font-medium text-blue-600 hover:text-blue-500">
              立即登录
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <ErrorMessage
              error={error}
              type="error"
              showIcon={true}
            />
          )}

          <div className="rounded-md shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  名字
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="张"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  姓氏
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="三"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱地址 *
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
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                手机号码
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="13800138000"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码 *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  // 清除密码错误
                  if (fieldErrors.password) {
                    const { password: _, ...rest } = fieldErrors;
                    setFieldErrors(rest);
                  }
                }}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="至少 8 个字符"
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
                确认密码 *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleConfirmPasswordChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  fieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="再次输入密码"
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !passwordValid}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <LoadingSpinner size="sm" message="" />
                  <span className="ml-2">{t('auth.registering', { defaultValue: '注册中...' })}</span>
                </span>
              ) : (
                t('auth.register', { defaultValue: '注册' })
              )}
            </button>
            {!passwordValid && formData.password && (
              <p className="mt-2 text-sm text-yellow-600 text-center">
                请确保密码满足所有要求
              </p>
            )}
          </div>

          <div className="text-xs text-center text-gray-500">
            点击注册即表示您同意我们的{' '}
            <Link href={route('/terms')} className="text-blue-600 hover:text-blue-500">
              服务条款
            </Link>{' '}
            和{' '}
            <Link href={route('/privacy')} className="text-blue-600 hover:text-blue-500">
              隐私政策
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
