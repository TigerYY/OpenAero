'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function CreatorApplyPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    bio: '',
    website: '',
    experience: '',
    specialties: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 检查用户是否已登录
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      // 未登录用户重定向到登录页面
      router.push('/auth/login?callbackUrl=/creators/apply');
      return;
    }

    // 检查用户是否已经是创作者
    if (session.user.role === 'CREATOR') {
      router.push('/creators/dashboard');
      return;
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/creators/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // 申请提交成功，重定向到申请状态页面
        router.push('/creators/apply/status');
      } else {
        setError(data.error || '申请提交失败');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // 重定向中
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8 sm:p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold text-gray-900">
                创作者申请
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                填写以下信息申请成为OpenAero平台的创作者
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  个人简介 *
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请简要介绍您的背景、经验和专长..."
                  value={formData.bio}
                  onChange={handleChange}
                />
                <p className="mt-1 text-sm text-gray-500">
                  请用200-500字介绍自己
                </p>
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  个人网站或作品集
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={handleChange}
                />
                <p className="mt-1 text-sm text-gray-500">
                  可选，有助于我们了解您的作品
                </p>
              </div>

              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
                  相关经验 *
                </label>
                <textarea
                  id="experience"
                  name="experience"
                  rows={3}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请描述您在相关领域的经验..."
                  value={formData.experience}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="specialties" className="block text-sm font-medium text-gray-700">
                  专长领域 *
                </label>
                <input
                  id="specialties"
                  name="specialties"
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：UI/UX设计、前端开发、产品设计等"
                  value={formData.specialties}
                  onChange={handleChange}
                />
                <p className="mt-1 text-sm text-gray-500">
                  请用逗号分隔不同的专长领域
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '提交中...' : '提交申请'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}