'use client';

import { ArrowLeft, Users, Clock, Save } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import React, { useState, useEffect } from 'react';

import CollaborationEditor from '@/components/collaboration/CollaborationEditor';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';


interface Solution {
  id: string;
  title: string;
  description: string;
  status: string;
  creator: {
    name: string;
    email: string;
  };
  updatedAt: string;
}

export default function SolutionCollaboratePage() {
  const params = useParams();
  const { data: session } = useSession();
  const [solution, setSolution] = useState<Solution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const solutionId = params?.id as string;

  // 获取方案信息
  useEffect(() => {
    const fetchSolution = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/solutions/${solutionId}`);
        
        if (!response.ok) {
          throw new Error('获取方案信息失败');
        }

        const data = await response.json();
        setSolution({
          id: data.data.id,
          title: data.data.title,
          description: data.data.description,
          status: data.data.status,
          creator: {
            name: data.data.creatorName,
            email: data.data.creatorName // 使用 creatorName 作为临时邮箱显示
          },
          updatedAt: data.data.updatedAt
        });
        setContent(data.data.description || '');
      } catch (error) {
        console.error('获取方案失败:', error);
        setError(error instanceof Error ? error.message : '获取方案失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (solutionId) {
      fetchSolution();
    }
  }, [solutionId]);

  // 处理内容变化
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    // 自动保存逻辑可以在这里实现
  };

  // 手动保存
  const handleSave = async () => {
    if (!solution) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/solutions/${solutionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: content,
        }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载方案...</p>
        </div>
      </div>
    );
  }

  if (error || !solution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              {error || '方案不存在'}
            </div>
            <Link href="/solutions">
              <Button variant="outline">
                返回方案列表
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部导航 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/solutions/${solutionId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回方案
                </Button>
              </Link>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  协作编辑: {solution.title}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  创建者: {solution.creator.name} • 
                  最后更新: {new Date(solution.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Badge 
                variant={solution.status === 'PUBLISHED' ? 'default' : 'secondary'}
              >
                {solution.status}
              </Badge>
              
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? '保存中...' : '保存'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 协作编辑器 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 主编辑区域 */}
          <div className="lg:col-span-3">
            <CollaborationEditor
              documentId={solutionId}
              documentType="solution"
              initialContent={content}
              onContentChange={handleContentChange}
              className="h-full"
            />
          </div>

          {/* 侧边栏信息 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 方案信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  方案信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">标题</label>
                  <p className="text-sm text-gray-900 mt-1">{solution.title}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">状态</label>
                  <div className="mt-1">
                    <Badge variant={solution.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                      {solution.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">创建者</label>
                  <p className="text-sm text-gray-900 mt-1">{solution.creator.name}</p>
                  <p className="text-xs text-gray-500">{solution.creator.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* 保存状态 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  保存状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastSaved ? (
                  <div className="text-sm text-green-600">
                    最后保存: {lastSaved.toLocaleTimeString()}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    尚未保存
                  </div>
                )}
                
                {isSaving && (
                  <div className="text-sm text-blue-600 mt-2">
                    正在保存...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 协作提示 */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-gray-900 mb-2">协作提示</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 实时查看其他用户的编辑</li>
                  <li>• 光标位置会同步显示</li>
                  <li>• 自动保存编辑历史</li>
                  <li>• 支持多人同时编辑</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}