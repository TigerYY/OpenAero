'use client';

import React, { useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

export type ExportFormat = 'json' | 'csv' | 'excel';
export type ExportType = 'solutions' | 'users';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: ExportType;
  onExport: (params: ExportParams) => Promise<void>;
}

export interface ExportParams {
  format: ExportFormat;
  type: ExportType;
  filters?: {
    status?: string | string[];
    category?: string | string[];
    role?: string | string[];
    dateFrom?: string;
    dateTo?: string;
    priceMin?: number;
    priceMax?: number;
  };
}

export function ExportDialog({
  open,
  onOpenChange,
  exportType,
  onExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ExportParams['filters']>({});

  const handleExport = async () => {
    try {
      setLoading(true);
      await onExport({
        format,
        type: exportType,
        filters,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      
      // 构建请求参数
      const params: any = {
        action: exportType === 'solutions' ? 'export_solutions' : 'export_users',
        params: {
          format,
          ...filters,
        },
      };

      const response = await fetch('/api/admin/dashboard/quick-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      // 如果是文件下载，处理响应
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/vnd.openxmlformats') || contentType?.includes('text/csv')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `export.${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // JSON格式，直接调用onExport
        const result = await response.json();
        if (result.success) {
          await onExport({
            format,
            type: exportType,
            filters,
          });
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>导出数据</DialogTitle>
          <DialogDescription>
            选择导出格式和筛选条件，然后下载数据文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 导出格式选择 */}
          <div className="space-y-2">
            <Label htmlFor="format">导出格式</Label>
            <Select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
            >
              <option value="excel">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="json">JSON (.json)</option>
            </Select>
          </div>

          {/* 筛选条件 */}
          {exportType === 'solutions' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <Select
                  id="status"
                  value={Array.isArray(filters?.status) ? filters.status[0] : filters?.status || ''}
                  onChange={(e) =>
                    setFilters({ ...(filters || {}), status: e.target.value || undefined })
                  }
                >
                  <option value="">全部</option>
                  <option value="DRAFT">草稿</option>
                  <option value="PENDING_REVIEW">待审核</option>
                  <option value="APPROVED">已批准</option>
                  <option value="REJECTED">已拒绝</option>
                  <option value="PUBLISHED">已发布</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">开始日期</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters?.dateFrom || ''}
                    onChange={(e) =>
                      setFilters({ ...(filters || {}), dateFrom: e.target.value || undefined })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">结束日期</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters?.dateTo || ''}
                    onChange={(e) =>
                      setFilters({ ...(filters || {}), dateTo: e.target.value || undefined })
                    }
                  />
                </div>
              </div>
            </>
          )}

          {exportType === 'users' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="role">角色</Label>
                <Select
                  id="role"
                  value={Array.isArray(filters?.role) ? filters.role[0] : filters?.role || ''}
                  onChange={(e) =>
                    setFilters({ ...(filters || {}), role: e.target.value || undefined })
                  }
                >
                  <option value="">全部</option>
                  <option value="USER">用户</option>
                  <option value="CREATOR">创作者</option>
                  <option value="ADMIN">管理员</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">开始日期</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters?.dateFrom || ''}
                    onChange={(e) =>
                      setFilters({ ...(filters || {}), dateFrom: e.target.value || undefined })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">结束日期</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters?.dateTo || ''}
                    onChange={(e) =>
                      setFilters({ ...(filters || {}), dateTo: e.target.value || undefined })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button onClick={handleDownload} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                导出
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

