'use client';

import React from 'react';

import FileUpload from '@/components/FileUpload';

export default function FileUploadTestPage() {
  const handleUploadComplete = (files: any[]) => {
    console.log('上传完成:', files);
    alert(`成功上传 ${files.length} 个文件！`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            文件上传测试页面
          </h1>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              测试文件上传功能
            </h2>
            <p className="text-gray-600 mb-6">
              这是一个测试页面，用于验证文件上传系统的功能。您可以上传图片、视频、PDF 和文本文件。
            </p>
            
            <FileUpload
              onUploadComplete={handleUploadComplete}
              maxFiles={10}
              maxSize={50 * 1024 * 1024} // 50MB
              acceptedTypes={[
                'image/*',
                'video/*',
                'application/pdf',
                'text/*',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              ]}
            />
          </div>

          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              功能说明
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>支持拖拽上传和点击选择文件</li>
              <li>支持多文件同时上传</li>
              <li>自动文件类型验证</li>
              <li>文件大小限制检查</li>
              <li>上传进度显示</li>
              <li>图片文件自动生成缩略图</li>
              <li>文件存储在本地服务器</li>
            </ul>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">
              API 端点
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="font-mono bg-blue-100 px-2 py-1 rounded mr-2">POST</span>
                <span className="text-blue-700">/api/files/upload</span>
                <span className="ml-2 text-gray-600">- 上传文件</span>
              </div>
              <div className="flex">
                <span className="font-mono bg-green-100 px-2 py-1 rounded mr-2">GET</span>
                <span className="text-green-700">/api/files/[filename]</span>
                <span className="ml-2 text-gray-600">- 下载文件</span>
              </div>
              <div className="flex">
                <span className="font-mono bg-red-100 px-2 py-1 rounded mr-2">DELETE</span>
                <span className="text-red-700">/api/files/[filename]</span>
                <span className="ml-2 text-gray-600">- 删除文件</span>
              </div>
              <div className="flex">
                <span className="font-mono bg-purple-100 px-2 py-1 rounded mr-2">GET</span>
                <span className="text-purple-700">/api/files/user</span>
                <span className="ml-2 text-gray-600">- 获取用户文件列表</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}