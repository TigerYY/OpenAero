'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FileUpload } from '@/components/ui/FileUpload';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

export default function TestPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          方案管理功能测试页面
        </h1>
        <p className="text-gray-600">
          测试各个组件和功能是否正常工作
        </p>
      </div>

      {/* 导航测试 */}
      <Card>
        <CardHeader>
          <CardTitle>页面导航测试</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/solutions">
              <Button variant="outline" className="w-full">
                方案列表
              </Button>
            </Link>
            <Link href="/solutions/create">
              <Button variant="outline" className="w-full">
                创建方案
              </Button>
            </Link>
            <Link href="/solutions/manage">
              <Button variant="outline" className="w-full">
                管理方案
              </Button>
            </Link>
            <Link href="/solutions/1">
              <Button variant="outline" className="w-full">
                方案详情
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 组件测试 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Badge 组件测试 */}
        <Card>
          <CardHeader>
            <CardTitle>Badge 组件测试</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">默认</Badge>
                <Badge variant="secondary">次要</Badge>
                <Badge variant="destructive">危险</Badge>
                <Badge variant="outline">轮廓</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">已发布</Badge>
                <Badge variant="secondary">草稿</Badge>
                <Badge variant="destructive">已拒绝</Badge>
                <Badge variant="outline">待审核</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs 组件测试 */}
        <Card>
          <CardHeader>
            <CardTitle>Tabs 组件测试</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tab1">
              <TabsList>
                <TabsTrigger value="tab1">标签1</TabsTrigger>
                <TabsTrigger value="tab2">标签2</TabsTrigger>
                <TabsTrigger value="tab3">标签3</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">
                <p className="text-gray-600">这是标签1的内容</p>
              </TabsContent>
              <TabsContent value="tab2">
                <p className="text-gray-600">这是标签2的内容</p>
              </TabsContent>
              <TabsContent value="tab3">
                <p className="text-gray-600">这是标签3的内容</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 文件上传组件测试 */}
      <Card>
        <CardHeader>
          <CardTitle>文件上传组件测试</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            multiple
            accept="image/*"
            maxFiles={3}
            maxSize={5 * 1024 * 1024} // 5MB
            onUpload={(results) => {
              console.log('上传结果:', results);
              alert(`上传完成！成功: ${results.filter(r => r.success).length}, 失败: ${results.filter(r => !r.success).length}`);
            }}
            onProgress={(filename, progress) => {
              console.log(`${filename}: ${progress}%`);
            }}
          />
        </CardContent>
      </Card>

      {/* API 测试 */}
      <Card>
        <CardHeader>
          <CardTitle>API 端点测试</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/solutions');
                  const data = await response.json();
                  console.log('方案列表:', data);
                  alert('方案列表 API 测试成功！请查看控制台');
                } catch (error) {
                  console.error('API 测试失败:', error);
                  alert('方案列表 API 测试失败！');
                }
              }}
            >
              测试方案列表 API
            </Button>
            
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/solutions/1');
                  const data = await response.json();
                  console.log('方案详情:', data);
                  alert('方案详情 API 测试成功！请查看控制台');
                } catch (error) {
                  console.error('API 测试失败:', error);
                  alert('方案详情 API 测试失败！');
                }
              }}
            >
              测试方案详情 API
            </Button>

            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/upload', {
                    method: 'OPTIONS'
                  });
                  console.log('上传 API 状态:', response.status);
                  alert(`上传 API 测试完成！状态码: ${response.status}`);
                } catch (error) {
                  console.error('API 测试失败:', error);
                  alert('上传 API 测试失败！');
                }
              }}
            >
              测试上传 API
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 功能状态 */}
      <Card>
        <CardHeader>
          <CardTitle>功能实现状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>方案列表页面</span>
              <Badge variant="default">✓ 已完成</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>方案详情页面</span>
              <Badge variant="default">✓ 已完成</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>方案创建页面</span>
              <Badge variant="default">✓ 已完成</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>方案管理页面</span>
              <Badge variant="default">✓ 已完成</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>文件上传功能</span>
              <Badge variant="default">✓ 已完成</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>UI 组件库</span>
              <Badge variant="default">✓ 已完成</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>API 端点</span>
              <Badge variant="secondary">部分完成</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}