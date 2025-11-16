'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function TestRoleEdit() {
  const [userId, setUserId] = useState('');
  const [roles, setRoles] = useState(['USER']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const availableRoles = ['USER', 'CREATOR', 'REVIEWER', 'FACTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN'];

  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setRoles(prev => [...prev, role]);
    } else {
      setRoles(prev => prev.filter(r => r !== role));
    }
  };

  const testUpdateRole = async () => {
    if (!userId) {
      toast.error('请输入用户ID');
      return;
    }

    if (roles.length === 0) {
      toast.error('至少需要选择一个角色');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('测试角色更新:', { userId, roles });
      
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          roles,
          reason: '测试页面更新'
        }),
      });

      const responseClone = response.clone(); // 保存一个副本用于日志
      
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
        toast.success('角色更新成功');
      } else {
        toast.error(data.error || '角色更新失败');
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
      <h1 className="text-2xl font-bold mb-6">角色编辑测试</h1>
      
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

        {/* 角色选择 */}
        <div>
          <label className="block text-sm font-medium mb-2">角色选择</label>
          <div className="space-y-2 p-4 border border-gray-200 rounded-md bg-gray-50">
            {availableRoles.map(role => (
              <label key={role} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={(e) => handleRoleChange(role, e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>{role}</span>
              </label>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            已选择: {roles.join(', ') || '无'}
          </p>
        </div>

        {/* 测试按钮 */}
        <div>
          <button
            onClick={testUpdateRole}
            disabled={loading || !userId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '测试中...' : '测试角色更新'}
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

        {/* 使用说明 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-medium mb-2">使用说明:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>确保已登录管理员账户</li>
            <li>输入一个有效的用户ID</li>
            <li>选择要设置的角色</li>
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