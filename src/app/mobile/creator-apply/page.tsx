'use client';
import { useRouting } from '@/lib/routing';

import React from 'react';

import CreatorApplicationForm from '@/components/forms/CreatorApplicationForm';

export default function MobileCreatorApplyPage() {
  const handleApplicationSubmit = async (data: any) => {
  const { route } = useRouting()
    // 这里可以添加额外的处理逻辑
    console.log('创作者申请提交:', data);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">成为创作者</h1>
          <p className="text-gray-600">
            加入我们的创作者社区，分享您的专业知识
          </p>
        </div>

        {/* 创作者权益说明 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">创作者权益</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">丰厚收益</p>
                <p className="text-xs text-gray-600">根据内容质量和受欢迎程度获得分成收益</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">专业认证</p>
                <p className="text-xs text-gray-600">获得平台官方认证，提升个人品牌价值</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">技术支持</p>
                <p className="text-xs text-gray-600">享受专业的技术支持和创作工具</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">社区交流</p>
                <p className="text-xs text-gray-600">与其他创作者交流学习，共同成长</p>
              </div>
            </div>
          </div>
        </div>

        {/* 申请流程说明 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">申请流程</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">填写申请表</p>
                <p className="text-xs text-gray-600">完整填写个人信息和专业背景</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">审核评估</p>
                <p className="text-xs text-gray-600">我们会在3-5个工作日内完成审核</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">开始创作</p>
                <p className="text-xs text-gray-600">通过审核后即可开始发布内容</p>
              </div>
            </div>
          </div>
        </div>

        {/* 申请表单 */}
        <CreatorApplicationForm onSubmit={handleApplicationSubmit} />

        {/* 帮助信息 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-2">
            申请过程中遇到问题？
          </p>
          <a 
            href={route('/mobile/contact')} 
            className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
          >
            联系我们获取帮助
          </a>
        </div>
      </div>
    </div>
  );
}