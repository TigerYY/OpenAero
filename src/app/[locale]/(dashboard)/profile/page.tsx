'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
    firstName: '',
    lastName: '',
    displayName: '',
    bio: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [applicationStatus, setApplicationStatus] = useState<{
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // 自动初始化 profile（如果不存在）
  useEffect(() => {
    if (!authLoading && user && !profile) {
      console.log('[ProfilePage] 检测到 profile 不存在，自动尝试初始化...');
      const initProfile = async () => {
        await refreshProfile();
      };
      initProfile();
    }
  }, [authLoading, user, profile, refreshProfile]);

  // 调试日志
  useEffect(() => {
    console.log('[ProfilePage] 状态更新:', {
      authLoading,
      user: user ? { id: user.id, email: user.email } : null,
      profile: profile ? { id: profile.id, display_name: profile.display_name } : null,
    });
  }, [authLoading, user, profile]);

  // 获取创作者申请状态
  useEffect(() => {
    const fetchApplicationStatus = async () => {
      // 获取用户角色数组（支持多角色）
      const userRoles = profile?.roles 
        ? (Array.isArray(profile.roles) ? profile.roles : [profile.roles]) 
        : (profile?.role ? [profile.role] : []);
      
      if (!user || userRoles.includes('CREATOR') || userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN')) {
        setApplicationStatus(null);
        return;
      }

      setLoadingStatus(true);
      try {
        const response = await fetch('/api/creators/application/status', {
          credentials: 'include',
        });
        const result = await response.json();
        
        if (result.success && result.data) {
          setApplicationStatus({
            status: result.data.status,
            submittedAt: result.data.submittedAt ? new Date(result.data.submittedAt) : null,
            reviewedAt: result.data.reviewedAt ? new Date(result.data.reviewedAt) : null,
            reviewNotes: result.data.reviewNotes || null,
          });
        } else {
          setApplicationStatus(null);
        }
      } catch (error) {
        console.error('获取申请状态失败:', error);
        setApplicationStatus(null);
      } finally {
        setLoadingStatus(false);
      }
    };

    if (user && profile) {
      fetchApplicationStatus();
    }
  }, [user, profile]);

  useEffect(() => {
    if (profile && user) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        phone: user.phone || '',
      });
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setFieldErrors({});

    // 前端验证
    const errors: Record<string, string> = {};
    
    // firstName 和 lastName 可以为空，只验证长度
    if (formData.firstName && formData.firstName.length > 50) {
      errors.firstName = '名字不能超过50个字符';
    }
    
    if (formData.lastName && formData.lastName.length > 50) {
      errors.lastName = '姓氏不能超过50个字符';
    }
    
    // displayName 如果填写了，就不能为空
    if (formData.displayName !== undefined && formData.displayName.trim().length === 0) {
      errors.displayName = '显示名称不能为空';
    }
    
    if (formData.displayName && formData.displayName.length > 100) {
      errors.displayName = '显示名称不能超过100个字符';
    }
    
    if (formData.bio && formData.bio.length > 500) {
      errors.bio = '个人简介不能超过500个字符';
    }
    
    if (formData.phone && formData.phone.trim() !== '') {
      const cleaned = formData.phone.replace(/[\s\-().]/g, '');
      const phoneRegex = /^(\+[1-9]\d{0,14}|\d{7,15})$/;
      if (!phoneRegex.test(cleaned)) {
        errors.phone = '手机号格式不正确（支持国际格式如 +86 13800138000 或纯数字如 13800138000）';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      setMessage({ type: 'error', text: firstError });
      setLoading(false);
      return;
    }

    console.log('[ProfilePage] 提交数据:', formData);

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

      console.log('[ProfilePage] 更新响应:', data);

      if (data.success) {
        console.log('[ProfilePage] 更新成功，开始刷新 profile');
        setMessage({ type: 'success', text: data.message || '资料更新成功!' });
        setFieldErrors({});
        setIsEditing(false);
        
        // 刷新 profile
        await refreshProfile();
        
        // 强制重新加载页面数据
        window.location.reload();
      } else {
        // 处理验证错误
        if (data.details && typeof data.details === 'object') {
          console.log('[ProfilePage] 验证错误详情:', data.details);
          const errors: Record<string, string> = {};
          
          // 处理两种可能的格式
          if (data.details.validationErrors && Array.isArray(data.details.validationErrors)) {
            // 格式 1: { validationErrors: [{field: "name", message: "error"}] }
            data.details.validationErrors.forEach((err: { field: string; message: string }) => {
              errors[err.field] = err.message;
            });
          } else {
            // 格式 2: { field_name: ["error1", "error2"] }
            Object.entries(data.details).forEach(([key, value]) => {
              if (Array.isArray(value) && value.length > 0) {
                errors[key] = value[0];
              }
            });
          }
          
          setFieldErrors(errors);
          
          // 显示第一个错误信息
          const firstError = Object.values(errors)[0];
          setMessage({ type: 'error', text: firstError || '请检查表单错误' });
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
                      alt={profile.displayName || '用户'}
                      className="h-32 w-32 rounded-full border-4 border-white object-cover"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-full border-4 border-white bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white">
                        {profile.displayName?.[0] || user?.email?.[0] || 'U'}
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
              <h2 className="text-2xl font-bold text-gray-900">{profile.displayName || '未设置名称'}</h2>
              <p className="text-gray-600">@{profile.displayName || user.email?.split('@')[0]}</p>
              <div className="mt-2 flex items-center space-x-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                  {/* 显示所有角色 */}
                  {(Array.isArray(profile.roles) ? profile.roles : (profile.role ? [profile.role] : [])).map((role) => (
                    <span key={role} className="mr-2">
                      {role === 'ADMIN' && '管理员'}
                      {role === 'CREATOR' && '创作者'}
                      {role === 'USER' && '普通用户'}
                      {role === 'SUPER_ADMIN' && '超级管理员'}
                      {role === 'REVIEWER' && '审核员'}
                      {role === 'FACTORY_MANAGER' && '工厂管理员'}
                    </span>
                  ))}
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
                      <span className="text-xs text-gray-500 ml-2">（可选）</span>
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="例如：+86 13800138000 或 13800138000"
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
                    <span className="text-gray-900 font-mono">
                      {profile.user_id ? `${profile.user_id.substring(0, 16)}...` : user?.id ? `${user.id.substring(0, 16)}...` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">创建时间:</span>
                    <span className="text-gray-900">
                      {profile.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最后更新:</span>
                    <span className="text-gray-900">
                      {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString('zh-CN') : 'N/A'}
                    </span>
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
          {/* 创作者相关 */}
          {(() => {
            // 获取用户角色数组（支持多角色）
            const userRoles = profile?.roles 
              ? (Array.isArray(profile.roles) ? profile.roles : [profile.roles]) 
              : (profile?.role ? [profile.role] : []);
            
            return !userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN') ? (
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg shadow-sm border border-primary-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                成为创作者
              </h3>
              
              {loadingStatus ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">加载中...</p>
                </div>
              ) : applicationStatus?.status === 'PENDING' ? (
                <>
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-yellow-800">审核中</span>
                    </div>
                    <p className="text-xs text-yellow-700">
                      您的创作者申请已提交，我们将在3-5个工作日内完成审核。
                    </p>
                    {applicationStatus.submittedAt && (
                      <p className="text-xs text-yellow-600 mt-1">
                        提交时间: {applicationStatus.submittedAt.toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(route('/creators/apply/status'))}
                    className="w-full px-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    查看申请状态 →
                  </button>
                </>
              ) : applicationStatus?.status === 'REJECTED' ? (
                <>
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm font-medium text-red-800">申请未通过</span>
                    </div>
                    <p className="text-xs text-red-700 mb-2">
                      很遗憾，您的创作者申请未通过审核。
                    </p>
                    {applicationStatus.reviewNotes && (
                      <p className="text-xs text-red-600 mt-1">
                        审核意见: {applicationStatus.reviewNotes}
                      </p>
                    )}
                    {applicationStatus.reviewedAt && (
                      <p className="text-xs text-red-600 mt-1">
                        审核时间: {applicationStatus.reviewedAt.toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(route('/creators/apply'))}
                    className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    重新提交申请
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    加入创作者社区，分享您的专业知识，获得50%的利润分成
                  </p>
                  <button
                    onClick={() => router.push(route('/creators/apply'))}
                    className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    立即申请成为创作者
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                创作者中心
              </h3>
              <button
                onClick={() => router.push(route('/creators/dashboard'))}
                className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">创作者仪表板</p>
                    <p className="text-sm text-gray-600">管理您的解决方案和收益</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          );
          })()}

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
