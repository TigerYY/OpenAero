'use client';

import React from 'react';
import ContactForm from '@/components/forms/ContactForm';

export default function MobileContactPage() {
  const handleContactSubmit = async (data: any) => {
    // 这里可以添加额外的处理逻辑
    console.log('联系表单提交:', data);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">联系我们</h1>
          <p className="text-gray-600">
            有任何问题或建议？我们很乐意听到您的声音
          </p>
        </div>

        {/* 联系方式信息 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">其他联系方式</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">邮箱</p>
                <p className="text-sm text-gray-600">support@openaero.cn</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">客服热线</p>
                <p className="text-sm text-gray-600">400-123-4567</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">工作时间</p>
                <p className="text-sm text-gray-600">周一至周五 9:00-18:00</p>
              </div>
            </div>
          </div>
        </div>

        {/* 联系表单 */}
        <ContactForm onSubmit={handleContactSubmit} />

        {/* 常见问题链接 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-2">
            在联系我们之前，您也可以查看
          </p>
          <a 
            href="/help/faq" 
            className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
          >
            常见问题解答
          </a>
        </div>
      </div>
    </div>
  );
}