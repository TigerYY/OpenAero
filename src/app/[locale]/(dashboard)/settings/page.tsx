'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useRouting } from '@/lib/routing';
import Link from 'next/link';
import PasswordChangeForm from '@/components/profile/PasswordChangeForm';
import EmailChangeForm from '@/components/profile/EmailChangeForm';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { DefaultLayout } from '@/components/layout/DefaultLayout';

/**
 * 用户设置页面
 */
export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <DefaultLayout>
        <SettingsContent />
      </DefaultLayout>
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { route, routes } = useRouting();
  const [activeTab, setActiveTab] = useState('general');
  const [initializing, setInitializing] = useState(false);

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">无法加载用户资料</h2>
          <p className="text-gray-600 mb-6">请先登录您的账号</p>
          <div className="space-y-3">
            <Link
              href={route('/login')}
              className="block w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-center"
            >
              前往登录
            </Link>
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
    const { refreshProfile } = useAuth();
    const [initializing, setInitializing] = useState(false);

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">无法加载用户资料</h2>
          <p className="text-gray-600 mb-6">您的账号资料正在初始化中，请稍候...</p>
          <div className="space-y-3">
            <button
              onClick={async () => {
                setInitializing(true);
                await refreshProfile();
                setTimeout(() => setInitializing(false), 1000);
              }}
              disabled={initializing}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initializing ? '初始化中...' : '重新初始化'}
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

  const tabs = [
    { id: 'general', name: '通用设置', icon: '⚙️' },
    { id: 'security', name: '安全设置', icon: '🔒' },
    { id: 'notifications', name: '通知设置', icon: '🔔' },
    { id: 'privacy', name: '隐私设置', icon: '👁️' },
  ];

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">设置</h1>
              <p className="mt-2 text-gray-600">管理您的账号设置和偏好</p>
            </div>
            <Link
              href={route('/profile')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              ← 返回个人资料
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 侧边栏标签 */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3 text-lg">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* 内容区域 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {activeTab === 'general' && <GeneralSettings profile={profile} user={user} />}
              {activeTab === 'security' && <SecuritySettings />}
              {activeTab === 'notifications' && <NotificationSettings />}
              {activeTab === 'privacy' && <PrivacySettings />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 通用设置组件
function GeneralSettings({ profile, user }: any) {
  const { route } = useRouting();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [timezone, setTimezone] = useState('Asia/Shanghai');

  // 从 localStorage 读取时区设置
  useEffect(() => {
    const savedTimezone = localStorage.getItem('user-timezone');
    if (savedTimezone) {
      setTimezone(savedTimezone);
    }
  }, []);

  // 切换语言
  const handleLocaleChange = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
    router.refresh();
  };

  // 保存时区设置
  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    localStorage.setItem('user-timezone', newTimezone);
    // 可以调用 API 保存到服务器
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">通用设置</h2>
        <p className="text-gray-600 mb-6">管理您的基本账号信息</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">个人资料</h3>
            <p className="text-sm text-gray-600">更新您的姓名、头像和个人简介</p>
          </div>
          <Link
            href={route('/profile')}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            编辑
          </Link>
        </div>

        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">语言设置</h3>
            <p className="text-sm text-gray-600">选择您偏好的界面语言</p>
          </div>
          <select
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">时区</h3>
            <p className="text-sm text-gray-600">设置您所在的时区</p>
          </div>
          <select
            value={timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="Asia/Shanghai">北京时间 (GMT+8)</option>
            <option value="Asia/Tokyo">东京时间 (GMT+9)</option>
            <option value="Asia/Hong_Kong">香港时间 (GMT+8)</option>
            <option value="America/New_York">纽约时间 (GMT-5)</option>
            <option value="America/Los_Angeles">洛杉矶时间 (GMT-8)</option>
            <option value="Europe/London">伦敦时间 (GMT+0)</option>
            <option value="Europe/Paris">巴黎时间 (GMT+1)</option>
            <option value="Australia/Sydney">悉尼时间 (GMT+10)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// 安全设置组件
function SecuritySettings() {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">安全设置</h2>
        <p className="text-gray-600 mb-6">保护您的账号安全</p>
      </div>

      {showEmailForm ? (
        <div>
          <button
            onClick={() => setShowEmailForm(false)}
            className="mb-4 text-sm text-gray-600 hover:text-gray-900"
          >
            ← 返回
          </button>
          <EmailChangeForm />
        </div>
      ) : showPasswordForm ? (
        <div>
          <button
            onClick={() => setShowPasswordForm(false)}
            className="mb-4 text-sm text-gray-600 hover:text-gray-900"
          >
            ← 返回
          </button>
          <PasswordChangeForm />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b">
            <div>
              <h3 className="font-medium text-gray-900">修改邮箱</h3>
              <p className="text-sm text-gray-600">更改您的登录邮箱地址</p>
            </div>
            <button
              onClick={() => setShowEmailForm(true)}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              修改
            </button>
          </div>

          <div className="flex items-center justify-between py-4 border-b">
            <div>
              <h3 className="font-medium text-gray-900">修改密码</h3>
              <p className="text-sm text-gray-600">定期更新您的密码以保护账号安全</p>
            </div>
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              修改
            </button>
          </div>

        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">两步验证</h3>
            <p className="text-sm text-gray-600">为您的账号添加额外的安全层</p>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
            启用
          </button>
        </div>

        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">活动会话</h3>
            <p className="text-sm text-gray-600">管理您在其他设备上的登录会话</p>
          </div>
          <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            查看
          </button>
        </div>

        <div className="flex items-center justify-between py-4">
          <div>
            <h3 className="font-medium text-gray-900">登录历史</h3>
            <p className="text-sm text-gray-600">查看最近的登录活动</p>
          </div>
          <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            查看
          </button>
        </div>
        </div>
      )}
    </div>
  );
}

// 通知设置组件
function NotificationSettings() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [saving, setSaving] = useState(false);

  // 从 localStorage 读取设置
  useEffect(() => {
    const savedEmailNotifications = localStorage.getItem('email-notifications');
    if (savedEmailNotifications !== null) {
      setEmailNotifications(savedEmailNotifications === 'true');
    }
  }, []);

  // 保存通知设置
  const saveNotificationSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem('email-notifications', emailNotifications.toString());
      localStorage.setItem('push-notifications', pushNotifications.toString());
      localStorage.setItem('order-updates', orderUpdates.toString());
      localStorage.setItem('marketing-emails', marketingEmails.toString());
      // TODO: 调用 API 保存到服务器
      // await fetch('/api/users/notifications', { method: 'PATCH', body: JSON.stringify({...}) });
    } catch (error) {
      console.error('保存通知设置失败:', error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (user) {
      saveNotificationSettings();
    }
  }, [emailNotifications, pushNotifications, orderUpdates, marketingEmails]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">通知设置</h2>
        <p className="text-gray-600 mb-6">管理您接收通知的方式</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">邮件通知</h3>
            <p className="text-sm text-gray-600">接收重要更新的邮件通知</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">推送通知</h3>
            <p className="text-sm text-gray-600">在浏览器中接收实时通知</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pushNotifications}
              onChange={(e) => setPushNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">订单更新</h3>
            <p className="text-sm text-gray-600">接收订单状态变更通知</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={orderUpdates}
              onChange={(e) => setOrderUpdates(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between py-4">
          <div>
            <h3 className="font-medium text-gray-900">营销邮件</h3>
            <p className="text-sm text-gray-600">接收产品更新和促销信息</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={marketingEmails}
              onChange={(e) => setMarketingEmails(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

// 隐私设置组件
function PrivacySettings() {
  const { user } = useAuth();
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  // 从 localStorage 读取设置
  useEffect(() => {
    const savedVisibility = localStorage.getItem('profile-visibility');
    if (savedVisibility) {
      setProfileVisibility(savedVisibility);
    }
    const savedShowEmail = localStorage.getItem('show-email');
    if (savedShowEmail !== null) {
      setShowEmail(savedShowEmail === 'true');
    }
    const savedShowPhone = localStorage.getItem('show-phone');
    if (savedShowPhone !== null) {
      setShowPhone(savedShowPhone === 'true');
    }
  }, []);

  // 保存隐私设置
  const savePrivacySettings = async () => {
    try {
      localStorage.setItem('profile-visibility', profileVisibility);
      localStorage.setItem('show-email', showEmail.toString());
      localStorage.setItem('show-phone', showPhone.toString());
      // TODO: 调用 API 保存到服务器
    } catch (error) {
      console.error('保存隐私设置失败:', error);
    }
  };

  useEffect(() => {
    if (user) {
      savePrivacySettings();
    }
  }, [profileVisibility, showEmail, showPhone]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">隐私设置</h2>
        <p className="text-gray-600 mb-6">控制您的信息如何被展示和使用</p>
      </div>

      <div className="space-y-4">
        <div className="py-4 border-b">
          <h3 className="font-medium text-gray-900 mb-2">个人资料可见性</h3>
          <p className="text-sm text-gray-600 mb-4">选择谁可以查看您的个人资料</p>
          <select
            value={profileVisibility}
            onChange={(e) => setProfileVisibility(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="public">公开 - 所有人可见</option>
            <option value="members">仅成员 - 仅注册用户可见</option>
            <option value="private">私密 - 仅自己可见</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">显示邮箱地址</h3>
            <p className="text-sm text-gray-600">在个人资料中公开显示邮箱</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showEmail}
              onChange={(e) => setShowEmail(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">数据下载</h3>
            <p className="text-sm text-gray-600">下载您在平台上的所有数据</p>
          </div>
          <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            下载数据
          </button>
        </div>

        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">显示手机号</h3>
            <p className="text-sm text-gray-600">是否在个人资料中显示手机号码</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showPhone}
              onChange={(e) => setShowPhone(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {/* 账户删除 */}
        <div className="mt-8 pt-8 border-t border-red-200">
          <div>
            <h3 className="font-medium text-red-900 mb-2">危险操作</h3>
            <p className="text-sm text-red-600 mb-4">
              删除账户将永久删除您的所有数据，此操作不可恢复
            </p>
            <DeleteAccountButton />
          </div>
        </div>
      </div>
    </div>
  );
}

// 账户删除按钮组件
function DeleteAccountButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const { route, routes } = useRouting();
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('请输入 DELETE 以确认删除');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          confirmText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 登出并跳转到首页
        await signOut();
        router.push(route(routes.BUSINESS.HOME));
      } else {
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
      >
        删除账户
      </button>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-red-900 mb-2">
          请输入密码以确认删除
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
          placeholder="当前密码"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-red-900 mb-2">
          输入 DELETE 以确认
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
          placeholder="DELETE"
        />
      </div>
      {error && <ErrorMessage error={error} type="error" />}
      <div className="flex space-x-3">
        <button
          onClick={handleDelete}
          disabled={loading || password === '' || confirmText !== 'DELETE'}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? '删除中...' : '确认删除'}
        </button>
        <button
          onClick={() => {
            setShowConfirm(false);
            setPassword('');
            setConfirmText('');
            setError(null);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
        >
          取消
        </button>
      </div>
    </div>
  );
}
