'use client';

import { 
  GitCompare, 
  ArrowRight,
  Plus,
  Minus,
  Equal
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

interface SolutionVersion {
  id: string;
  version: number;
  title: string;
  description: string;
  price: number;
  features: string[];
  specifications: Record<string, any>;
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

interface VersionCompareProps {
  solutionId: string;
  versions: SolutionVersion[];
  defaultVersionA?: string;
  defaultVersionB?: string;
}

interface VersionDiff {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
}

export function VersionCompare({ 
  solutionId, 
  versions, 
  defaultVersionA, 
  defaultVersionB 
}: VersionCompareProps) {
  const [versionA, setVersionA] = useState<string>(defaultVersionA || '');
  const [versionB, setVersionB] = useState<string>(defaultVersionB || '');
  const [comparison, setComparison] = useState<VersionDiff[]>([]);
  const [loading, setLoading] = useState(false);

  const compareVersions = async () => {
    if (!versionA || !versionB || versionA === versionB) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/solutions/${solutionId}/versions/compare?versionA=${versionA}&versionB=${versionB}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setComparison(data.differences);
      }
    } catch (error) {
      console.error('版本比较失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (versionA && versionB && versionA !== versionB) {
      compareVersions();
    }
  }, [versionA, versionB]);

  const getVersionOptions = () => {
    return versions.map(v => ({
      value: v.id,
      label: `v${v.version} - ${v.title}${v.isActive ? ' (当前)' : ''}`
    }));
  };

  const getDiffIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <GitCompare className="h-4 w-4 text-blue-600" />;
      default:
        return <Equal className="h-4 w-4 text-gray-400" />;
    }
  };

  const getDiffColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-green-200';
      case 'removed':
        return 'bg-red-50 border-red-200';
      case 'modified':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            版本比较
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>版本 A</Label>
              <select 
                value={versionA} 
                onChange={(e) => setVersionA(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">选择版本 A</option>
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    v{v.version} - {v.title}{v.isActive ? ' (当前)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>版本 B</Label>
              <select 
                value={versionB} 
                onChange={(e) => setVersionB(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">选择版本 B</option>
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    v{v.version} - {v.title}{v.isActive ? ' (当前)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {versionA && versionB && versionA !== versionB && (
            <div className="flex items-center justify-center mb-4">
              <Badge variant="outline">
                {versions.find(v => v.id === versionA)?.version}
              </Badge>
              <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />
              <Badge variant="outline">
                {versions.find(v => v.id === versionB)?.version}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">正在比较版本...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {comparison.length > 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>差异详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comparison.map((diff, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${getDiffColor(diff.type)}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getDiffIcon(diff.type)}
                    <span className="font-medium">{diff.label}</span>
                    <Badge 
                      variant={diff.type === 'added' ? 'default' : 
                              diff.type === 'removed' ? 'destructive' : 
                              diff.type === 'modified' ? 'secondary' : 'outline'}
                    >
                      {diff.type === 'added' ? '新增' :
                       diff.type === 'removed' ? '删除' :
                       diff.type === 'modified' ? '修改' : '无变化'}
                    </Badge>
                  </div>

                  {diff.type === 'modified' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-red-600">旧值</Label>
                        <div className="bg-red-50 p-2 rounded text-sm">
                          {formatValue(diff.oldValue)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-green-600">新值</Label>
                        <div className="bg-green-50 p-2 rounded text-sm">
                          {formatValue(diff.newValue)}
                        </div>
                      </div>
                    </div>
                  )}

                  {diff.type === 'added' && (
                    <div>
                      <Label className="text-green-600">新增内容</Label>
                      <div className="bg-green-50 p-2 rounded text-sm">
                        {formatValue(diff.newValue)}
                      </div>
                    </div>
                  )}

                  {diff.type === 'removed' && (
                    <div>
                      <Label className="text-red-600">删除内容</Label>
                      <div className="bg-red-50 p-2 rounded text-sm">
                        {formatValue(diff.oldValue)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {versionA && versionB && versionA === versionB && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">请选择不同的版本进行比较</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}