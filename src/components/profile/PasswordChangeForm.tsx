/**
 * 密码修改表单组件
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { useRouting } from '@/lib/routing';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { InputSanitizer } from '@/lib/security';

export default function PasswordChangeForm() {
  const router = useRouter();
  const { signOut } = useAuth();
  const t = useTranslations();
  const { route, routes } = useRouting();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordValid, setPasswordValid] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      // 验证新密码和确认密码是否一致
      if (formData.newPassword !== formData.confirmPassword) {
        setFieldErrors({
          confirmPassword: '两次输入的密码不一致',
        });
        setLoading(false);
        return;
      }

      // 验证密码强度
      const validation = InputSanitizer.validatePassword(formData.newPassword);
      if (!validation.valid) {
        setFieldErrors({
          newPassword: validation.error || '密码强度不足',
        });
        setLoading(false);
        return;
      }

      // 调用 API
      const response = await fetch('/api/users/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 确保发送 cookies
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // 3秒后登出并跳转到登录页
        setTimeout(async () => {
          await signOut();
          router.push(route(routes.AUTH.LOGIN));
        }, 3000);
      } else {
        if (data.details && typeof data.details === 'object') {
          const errors: Record<string, string> = {};
          Object.entries(data.details).forEach(([key, value]) => {
            if (Array.isArray(value) && value.length > 0) {
              errors[key] = value[0];
            }
          });
          setFieldErrors(errors);
        } else {
          setError(data.error || '密码修改失败');
        }
      }
    } catch (err) {
      setError('密码修改失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, newPassword: value });
    
    // 验证密码强度
    const validation = InputSanitizer.validatePassword(value);
    setPasswordValid(validation.valid);
    
    // 清除错误
    if (fieldErrors.newPassword) {
      setFieldErrors({ ...fieldErrors, newPassword: '' });
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-lg font-medium text-green-800">密码修改成功</h3>
            <p className="text-sm text-green-600 mt-1">
              为了安全，系统将在3秒后自动登出，请使用新密码重新登录
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">修改密码</h2>
        <p className="text-sm text-gray-600 mb-6">
          为了账户安全，请定期更新您的密码
        </p>
      </div>

      {error && <ErrorMessage error={error} type="error" />}

      {/* 当前密码 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          当前密码
        </label>
        <input
          type="password"
          value={formData.currentPassword}
          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            fieldErrors.currentPassword ? 'border-red-300' : 'border-gray-300'
          }`}
          required
        />
        {fieldErrors.currentPassword && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.currentPassword}</p>
        )}
      </div>

      {/* 新密码 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          新密码
        </label>
        <input
          type="password"
          value={formData.newPassword}
          onChange={handleNewPasswordChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            fieldErrors.newPassword ? 'border-red-300' : 'border-gray-300'
          }`}
          required
        />
        {fieldErrors.newPassword && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.newPassword}</p>
        )}
        {formData.newPassword && (
          <div className="mt-2">
            <PasswordStrengthIndicator password={formData.newPassword} />
          </div>
        )}
      </div>

      {/* 确认新密码 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          确认新密码
        </label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => {
            setFormData({ ...formData, confirmPassword: e.target.value });
            if (fieldErrors.confirmPassword) {
              setFieldErrors({ ...fieldErrors, confirmPassword: '' });
            }
          }}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            fieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
          }`}
          required
        />
        {fieldErrors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
        )}
        {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">两次输入的密码不一致</p>
        )}
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setError(null);
            setFieldErrors({});
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading || !passwordValid || formData.newPassword !== formData.confirmPassword}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              修改中...
            </>
          ) : (
            '修改密码'
          )}
        </button>
      </div>
    </form>
  );
}

