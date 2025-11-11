'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function CreatorApplyStatusPage() {
  const router = useRouter();
  const [applicationStatus, setApplicationStatus] = useState('loading');
  const [applicationData, setApplicationData] = useState<any>(null);

  // 获取申请状态
  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      // 这里应该调用API获取申请状态
      // 暂时使用模拟数据
      setApplicationStatus('PENDING');
      setApplicationData({
        id: 'temp-application-id',
        submittedAt: new Date().toISOString(),
        estimatedReviewTime: '3-5个工作日'
      });
    } catch (error) {
      console.error('获取申请状态失败:', error);
      setApplicationStatus('error');
    }
  };

  if (applicationStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载申请状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8 sm:p-10">
            <div className="text-center">
              {applicationStatus === 'PENDING' && (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                    <svg
                      className="h-6 w-6 text-yellow-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="mt-6 text-2xl font-extrabold text-gray-900">
                    申请已提交
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">
                    您的创作者申请已成功提交，我们将在{applicationData?.estimatedReviewTime}内完成审核。
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    审核结果将通过邮件通知您。
                  </p>
                </>
              )}

              {applicationStatus === 'APPROVED' && (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="mt-6 text-2xl font-extrabold text-gray-900">
                    申请已通过
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">
                    恭喜！您的创作者申请已通过审核。
                  </p>
                </>
              )}

              {applicationStatus === 'REJECTED' && (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <h2 className="mt-6 text-2xl font-extrabold text-gray-900">
                    申请未通过
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">
                    很遗憾，您的创作者申请未通过审核。
                  </p>
                </>
              )}

              {applicationStatus === 'error' && (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <h2 className="mt-6 text-2xl font-extrabold text-gray-900">
                    获取状态失败
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">
                    无法获取申请状态，请稍后重试。
                  </p>
                </>
              )}

              <div className="mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  返回首页
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}