'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface UserSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SessionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    fetchSessions();
  }, [session, status, router]);

  const fetchSessions = async () => {
    try {
      // 这里应该调用API获取用户会话列表
      // 暂时使用模拟数据
      const mockSessions: UserSession[] = [
        {
          id: '1',
          device: 'MacBook Pro',
          browser: 'Chrome 119',
          location: '北京, 中国',
          ipAddress: '192.168.1.100',
          lastActive: new Date().toISOString(),
          isCurrent: true
        },
        {
          id: '2',
          device: 'iPhone 15',
          browser: 'Safari 17',
          location: '上海, 中国',
          ipAddress: '192.168.1.101',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isCurrent: false
        },
        {
          id: '3',
          device: 'Windows PC',
          browser: 'Firefox 120',
          location: '广州, 中国',
          ipAddress: '192.168.1.102',
          lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          isCurrent: false
        }
      ];

      setSessions(mockSessions);
    } catch (error) {
      setError('获取会话列表失败');
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      // 这里应该调用API终止指定会话
      // 暂时使用模拟实现
      setSessions(sessions.filter(session => session.id !== sessionId));
    } catch (error) {
      setError('终止会话失败');
    }
  };

  const terminateAllSessions = async () => {
    try {
      // 这里应该调用API终止所有会话（除了当前会话）
      // 暂时使用模拟实现
      setSessions(sessions.filter(session => session.isCurrent));
    } catch (error) {
      setError('终止所有会话失败');
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">会话管理</h1>
              <button
                onClick={() => router.push('/auth/profile')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                返回个人资料
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              管理您在所有设备上的登录会话
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  活跃会话 ({sessions.length})
                </h2>
                {sessions.filter(s => !s.isCurrent).length > 0 && (
                  <button
                    onClick={terminateAllSessions}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    终止所有其他会话
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                这些是您当前登录的设备。如果您发现任何可疑活动，请立即终止相关会话。
              </p>
            </div>

            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${session.isCurrent ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{session.device}</span>
                          {session.isCurrent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              当前会话
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>{session.browser} • {session.location}</p>
                          <p>IP: {session.ipAddress}</p>
                          <p>最后活跃: {formatLastActive(session.lastActive)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {!session.isCurrent && (
                      <button
                        onClick={() => terminateSession(session.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        终止会话
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {sessions.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">没有活跃会话</h3>
                <p className="mt-1 text-sm text-gray-500">
                  您当前没有在其他设备上登录。
                </p>
              </div>
            )}

            <div className="mt-8 bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900">安全提示</h3>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• 定期检查您的活跃会话，确保没有可疑登录</li>
                <li>• 如果您在陌生设备上登录过，请及时终止会话</li>
                <li>• 建议在公共设备上使用后立即终止会话</li>
                <li>• 如果发现可疑活动，请立即修改密码</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}