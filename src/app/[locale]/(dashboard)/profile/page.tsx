'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useRouting } from '@/lib/routing';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { DefaultLayout } from '@/components/layout/DefaultLayout';

/**
 * 用户资料页面
 */
export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <DefaultLayout>
        <ProfileContent />
      </DefaultLayout>
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { route } = useRouting();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    bio: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile && user) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        phone: user.phone || '',
      });
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 确保发送 cookies
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message || '资料更新成功!' });
        setFieldErrors({});
        setIsEditing(false);
        await refreshProfile();
      } else {
        // 处理验证错误
        if (data.details && typeof data.details === 'object') {
          const errors: Record<string, string> = {};
          Object.entries(data.details).forEach(([key, value]) => {
            if (Array.isArray(value) && value.length > 0) {
              errors[key] = value[0];
            }
          });
          setFieldErrors(errors);
          setMessage({ type: 'error', text: '请检查表单错误' });
        } else {
          setMessage({ type: 'error', text: data.error || '更新失败' });
          setFieldErrors({});
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: '更新失败,请重试' });
      setFieldErrors({});
    } finally {
      setLoading(false);
    }
  };

  // 如果认证还在加载中，显示加载状态
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 如果用户未登录，显示登录提示
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">无法加载用户资料</h2>
          <p className="text-gray-600 mb-6">请先登录您的账号</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(route('/login'))}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              前往登录
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 如果 profile 不存在，尝试初始化或显示友好提示
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">无法加载用户资料</h2>
          <p className="text-gray-600 mb-6">您的账号资料正在初始化中，请稍候...</p>
          <div className="space-y-3">
            <button
              onClick={async () => {
                setLoading(true);
                await refreshProfile();
                setLoading(false);
              }}
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '初始化中...' : '重新初始化'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              刷新页面
            </button>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            如果问题持续存在，请联系技术支持
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">个人资料</h1>
          <p className="mt-2 text-gray-600">管理您的个人信息和账号设置</p>
        </div>

        {/* 提示消息 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 用户卡片 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 封面图 */}
          <div className="h-32 bg-gradient-to-r from-primary-400 to-primary-600"></div>

          {/* 用户信息 */}
          <div className="px-6 pb-6">
            {/* 头像 */}
            <div className="-mt-16 mb-4">
              {isEditing ? (
                <AvatarUpload
                  currentAvatar={profile.avatar}
                  onUploadSuccess={async (avatarUrl) => {
                    await refreshProfile();
                    setMessage({ type: 'success', text: '头像更新成功' });
                  }}
                  size="lg"
                />
              ) : (
                <div className="inline-block relative">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.display_name || '用户'}
                      className="h-32 w-32 rounded-full border-4 border-white object-cover"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-full border-4 border-white bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white">
                        {profile.display_name?.[0] || user?.email?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
                    title="编辑头像"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* 用户基本信息 */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{profile.display_name || '未设置名称'}</h2>
              <p className="text-gray-600">@{profile.display_name || user.email?.split('@')[0]}</p>
              <div className="mt-2 flex items-center space-x-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                  {profile.role === 'ADMIN' && '管理员'}
                  {profile.role === 'CREATOR' && '创作者'}
                  {profile.role === 'USER' && '普通用户'}
                  {profile.role === 'SUPER_ADMIN' && '超级管理员'}
                  {profile.role === 'REVIEWER' && '审核员'}
                  {profile.role === 'FACTORY_MANAGER' && '工厂管理员'}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  profile.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile.status === 'ACTIVE' && '活跃'}
                  {profile.status === 'INACTIVE' && '未激活'}
                  {profile.status === 'SUSPENDED' && '已暂停'}
                </span>
              </div>
            </div>

            {/* 编辑/查看表单 */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本信息部分 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center justify-between">
                  基本信息
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      编辑
                    </button>
                  )}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 名字 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      名字
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            fieldErrors.first_name ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {fieldErrors.first_name && (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.first_name}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-900">{profile.first_name || '未设置'}</p>
                    )}
                  </div>

                  {/* 姓氏 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      姓氏
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            fieldErrors.last_name ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {fieldErrors.last_name && (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.last_name}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-900">{profile.last_name || '未设置'}</p>
                    )}
                  </div>

                  {/* 显示名称 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      显示名称
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={formData.display_name}
                          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            fieldErrors.display_name ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {fieldErrors.display_name && (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.display_name}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-900">{profile.display_name || '未设置'}</p>
                    )}
                  </div>

                  {/* 手机号码 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      手机号码
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            fieldErrors.phone ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="+86 138 0013 8000"
                        />
                        {fieldErrors.phone && (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-900">{user?.phone || '未设置'}</p>
                    )}
                  </div>

                  {/* 邮箱 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      邮箱地址
                    </label>
                    <p className="text-gray-900 flex items-center">
                      {user?.email}
                      {user?.email_confirmed_at && (
                        <svg className="ml-2 w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </p>
                  </div>
                </div>

                {/* 个人简介 */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    个人简介
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="介绍一下自己..."
                    />
                  ) : (
                    <p className="text-gray-900">{profile.bio || '暂无简介'}</p>
                  )}
                </div>
              </div>

              {/* 账号信息 */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">账号信息</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">账号ID:</span>
                    <span className="text-gray-900 font-mono">{profile.user_id.substring(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">创建时间:</span>
                    <span className="text-gray-900">{new Date(profile.created_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最后更新:</span>
                    <span className="text-gray-900">{new Date(profile.updated_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              {isEditing && (
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFieldErrors({});
                      setFormData({
                        first_name: profile.first_name || '',
                        last_name: profile.last_name || '',
                        display_name: profile.display_name || '',
                        bio: profile.bio || '',
                        phone: user?.phone || '',
                      });
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '保存中...' : '保存更改'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* 其他设置卡片 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 安全设置 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">安全设置</h3>
            <button
              onClick={() => router.push(route('/settings/security'))}
              className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">修改密码</p>
                  <p className="text-sm text-gray-600">更新您的登录密码</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          {/* 通知设置 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">通知设置</h3>
            <button
              onClick={() => router.push(route('/settings/notifications'))}
              className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">通知偏好</p>
                  <p className="text-sm text-gray-600">管理邮件和推送通知</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
