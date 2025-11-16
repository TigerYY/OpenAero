'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function TestBasicInfoEdit() {
  const [userId, setUserId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testUpdateBasicInfo = async () => {
    if (!userId) {
      toast.error('请输入用户ID');
      return;
    }

    // 构建请求载荷，只包含非空字段
    const payload: any = {};
    if (firstName.trim()) {
      payload.firstName = firstName.trim();
    }
    if (lastName.trim()) {
      payload.lastName = lastName.trim();
    }

    if (Object.keys(payload).length === 0) {
      toast.error('至少需要填写一个字段');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('测试基本信息更新:', { userId, payload });
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('API响应:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      const data = await response.json();
      console.log('响应数据:', data);

      setResult({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: data
      });

      if (response.ok) {
        toast.success('基本信息更新成功');
      } else {
        // 提供更详细的错误信息
        let errorMessage = data.error || '基本信息更新失败';
        
        if (response.status === 400) {
          errorMessage = '表单验证错误: ' + (data.details?.validationErrors?.map((e: any) => `${e.field}: ${e.message}`).join(', ') || errorMessage);
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('请求失败:', error);
      setResult({
        error: error instanceof Error ? error.message : '请求失败'
      });
      toast.error('请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">基本信息编辑测试</h1>
      
      <div className="space-y-6">
        {/* 用户ID输入 */}
        <div>
          <label className="block text-sm font-medium mb-2">用户ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="输入要测试的用户ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 基本信息表单 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">名字</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="输入名字"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">姓氏</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="输入姓氏"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 测试按钮 */}
        <div>
          <button
            onClick={testUpdateBasicInfo}
            disabled={loading || !userId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '测试中...' : '测试基本信息更新'}
          </button>
        </div>

        {/* 结果显示 */}
        {result && (
          <div className="p-4 border border-gray-200 rounded-md">
            <h3 className="font-medium mb-2">测试结果:</h3>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* 常见错误说明 */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="font-medium mb-2 text-yellow-800">常见错误说明:</h3>
          <ul className="text-sm space-y-1 text-yellow-700">
            <li><strong>400 错误</strong>: 表单验证失败，检查输入格式</li>
            <li><strong>403 错误</strong>: 权限不足，需要管理员权限</li>
            <li><strong>404 错误</strong>: 用户不存在</li>
            <li><strong>500 错误</strong>: 服务器内部错误，检查日志</li>
          </ul>
        </div>

        {/* 使用说明 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-medium mb-2">使用说明:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>确保已登录管理员账户</li>
            <li>输入一个有效的用户ID</li>
            <li>填写要更新的基本信息（名字或姓氏）</li>
            <li>点击测试按钮</li>
            <li>查看结果和控制台日志</li>
          </ol>
          <p className="text-sm text-gray-600 mt-2">
            提示: 可以先访问 <a href="/zh-CN/admin/users" className="text-blue-600 hover:underline">用户管理页面</a> 获取用户ID
          </p>
        </div>
      </div>
    </div>
  );
}