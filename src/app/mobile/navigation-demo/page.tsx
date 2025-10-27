'use client';

import React, { useState } from 'react';
import EnhancedMobileNavigation from '@/components/layout/EnhancedMobileNavigation';
import EnhancedMobileBottomNavigation from '@/components/layout/EnhancedMobileBottomNavigation';

export default function NavigationDemoPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [demoContent, setDemoContent] = useState('home');

  const contentSections = {
    home: {
      title: '首页内容',
      content: '这里是首页的主要内容区域。您可以看到各种功能模块和最新信息。',
      color: 'bg-blue-50 border-blue-200'
    },
    solutions: {
      title: '解决方案',
      content: '浏览我们的无人机解决方案，包括硬件套件、软件系统和技术支持。',
      color: 'bg-indigo-50 border-indigo-200'
    },
    supply: {
      title: '供应链管理',
      content: '管理您的供应链网络，包括工厂合作、订单跟踪和质量控制。',
      color: 'bg-green-50 border-green-200'
    },
    profile: {
      title: '个人中心',
      content: '查看和管理您的个人信息、订单历史和偏好设置。',
      color: 'bg-purple-50 border-purple-200'
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="打开导航菜单"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OA</span>
              </div>
              <span className="text-lg font-bold text-gray-900">导航演示</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v2H4v-2zM4 15h8v2H4v-2zM4 11h10v2H4v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="pb-20 px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* 功能介绍 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">增强移动导航演示</h1>
            <p className="text-gray-600 mb-4">
              这个页面展示了增强版的移动端导航组件，包括侧边栏导航和底部导航栏。
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>支持触摸手势（向左滑动关闭侧边栏）</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>智能搜索功能（按 / 快速搜索）</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>自动隐藏底部导航（滚动时）</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>触觉反馈和动画效果</span>
              </div>
            </div>
          </div>

          {/* 内容切换演示 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">内容区域演示</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(contentSections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setDemoContent(key)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    demoContent === key 
                      ? section.color + ' border-current' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{section.title}</div>
                </button>
              ))}
            </div>

            {/* 当前内容显示 */}
            <div className={`p-6 rounded-xl border-2 ${contentSections[demoContent as keyof typeof contentSections].color}`}>
              <h3 className="text-lg font-semibold mb-3">
                {contentSections[demoContent as keyof typeof contentSections].title}
              </h3>
              <p className="text-gray-700">
                {contentSections[demoContent as keyof typeof contentSections].content}
              </p>
            </div>
          </div>

          {/* 操作指南 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">操作指南</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div className="flex items-start space-x-3">
                <span className="font-semibold">1.</span>
                <span>点击左上角菜单按钮打开侧边栏导航</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="font-semibold">2.</span>
                <span>在侧边栏中使用搜索功能查找菜单项</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="font-semibold">3.</span>
                <span>使用底部导航栏快速切换主要功能</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="font-semibold">4.</span>
                <span>向下滚动页面观察底部导航的自动隐藏</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="font-semibold">5.</span>
                <span>在侧边栏中向左滑动可关闭菜单</span>
              </div>
            </div>
          </div>

          {/* 填充内容用于测试滚动 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">滚动测试内容</h3>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">测试卡片 {i + 1}</h4>
                <p className="text-gray-600 text-sm">
                  这是用于测试滚动效果的内容卡片。当您向下滚动时，底部导航栏会自动隐藏，
                  向上滚动时会重新显示。这样可以为内容提供更多的显示空间。
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 增强版侧边栏导航 */}
      <EnhancedMobileNavigation 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* 增强版底部导航 */}
      <EnhancedMobileBottomNavigation />
    </div>
  );
}