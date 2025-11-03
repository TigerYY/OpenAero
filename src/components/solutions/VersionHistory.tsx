'use client';

import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Clock, 
  GitBranch, 
  Eye, 
  RotateCcw, 
  GitCompare,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

import { VersionCompare } from './VersionCompare';

interface SolutionVersion {
  id: string;
  version: number;
  title: string;
  description: string;
  category: string;
  price: number;
  images: string[];
  features: string[];
  specs?: any;
  bom?: any;
  changeLog?: string;
  isActive: boolean;
  createdAt: string;
  creator: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

interface VersionComparison {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'modified';
}

interface VersionHistoryProps {
  solutionId: string;
  currentVersion: number;
  onVersionChange?: (version: number) => void;
}

export function VersionHistory({ 
  solutionId, 
  currentVersion, 
  onVersionChange 
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<SolutionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<[number, number] | null>(null);
  const [comparison, setComparison] = useState<VersionComparison[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  // 加载版本历史
  useEffect(() => {
    loadVersionHistory();
  }, [solutionId]);

  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${solutionId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions);
      }
    } catch (error) {
      console.error('加载版本历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 比较版本
  const compareVersions = async (v1: number, v2: number) => {
    try {
      setCompareLoading(true);
      const response = await fetch(
        `/api/solutions/${solutionId}/versions/compare?v1=${v1}&v2=${v2}`
      );
      if (response.ok) {
        const data = await response.json();
        setComparison(data.comparison);
        setSelectedVersions([v1, v2]);
      }
    } catch (error) {
      console.error('版本比较失败:', error);
    } finally {
      setCompareLoading(false);
    }
  };

  // 回滚版本
  const rollbackVersion = async (targetVersion: number) => {
    try {
      setRollbackLoading(true);
      const response = await fetch(
        `/api/solutions/${solutionId}/versions/rollback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetVersion }),
        }
      );
      
      if (response.ok) {
        await loadVersionHistory();
        onVersionChange?.(targetVersion);
      }
    } catch (error) {
      console.error('版本回滚失败:', error);
    } finally {
      setRollbackLoading(false);
    }
  };

  const getVersionBadgeVariant = (version: SolutionVersion) => {
    if (version.isActive) return 'default';
    return 'secondary';
  };

  const formatFieldName = (field: string) => {
    const fieldNames: Record<string, string> = {
      title: '标题',
      description: '描述',
      category: '分类',
      price: '价格',
      images: '图片',
      features: '功能特性',
      specs: '技术规格',
      bom: 'BOM清单',
    };
    return fieldNames[field] || field;
  };

  const formatValue = (value: any, field: string) => {
    if (field === 'price') {
      return `¥${Number(value).toFixed(2)}`;
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            版本历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={getVersionBadgeVariant(version)}>
                      v{version.version}
                      {version.isActive && ' (当前)'}
                    </Badge>
                    <h4 className="font-medium">{version.title}</h4>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {version.creator.firstName || version.creator.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDistanceToNow(new Date(version.createdAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </div>
                    {version.changeLog && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {version.changeLog}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>版本详情 - v{version.version}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>标题</Label>
                          <p className="text-sm text-gray-600">{version.title}</p>
                        </div>
                        <div>
                          <Label>描述</Label>
                          <p className="text-sm text-gray-600">{version.description}</p>
                        </div>
                        <div>
                            <Label>变更日志</Label>
                            <p className="text-sm text-gray-600">{version.changeLog || '无变更记录'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>价格</Label>
                              <p className="text-sm text-gray-600">¥{Number(version.price).toFixed(2)}</p>
                            </div>
                            <div>
                              <Label>创建者</Label>
                              <p className="text-sm text-gray-600">{version.creator.firstName || version.creator.email}</p>
                            </div>
                          </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {versions.length > 1 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <GitCompare className="h-4 w-4 mr-1" />
                          比较
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>版本比较</DialogTitle>
                        </DialogHeader>
                        <VersionCompare 
                          solutionId={solutionId}
                          versions={versions}
                          defaultVersionA={version.id}
                        />
                      </DialogContent>
                    </Dialog>
                  )}

                  {!version.isActive && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <RotateCcw className="h-4 w-4 mr-1" />
                          回滚
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>确认回滚</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                            确定要回滚到版本 v{version.version} 吗？这将创建一个新版本并设为当前版本。
                          </p>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => {}}>
                              取消
                            </Button>
                            <Button 
                              onClick={() => rollbackVersion(version.version)}
                              disabled={rollbackLoading}
                            >
                              {rollbackLoading ? '回滚中...' : '确认回滚'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 版本比较对话框 */}
      {selectedVersions && (
        <Dialog open={!!selectedVersions} onOpenChange={() => setSelectedVersions(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                版本比较: v{selectedVersions[0]} vs v{selectedVersions[1]}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {comparison.length === 0 ? (
                <p className="text-center text-gray-500">两个版本没有差异</p>
              ) : (
                comparison.map((diff, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">{formatFieldName(diff.field)}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-red-600">版本 {selectedVersions[0]}</Label>
                        <div className="bg-red-50 p-2 rounded text-sm">
                          {formatValue(diff.oldValue, diff.field)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-green-600">版本 {selectedVersions[1]}</Label>
                        <div className="bg-green-50 p-2 rounded text-sm">
                          {formatValue(diff.newValue, diff.field)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}