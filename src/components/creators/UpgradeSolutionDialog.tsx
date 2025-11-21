'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpRight, Copy, Package, FileText } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

interface UpgradeSolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solutionId: string;
  solutionTitle: string;
  onSuccess?: (upgradedSolutionId: string) => void;
}

export function UpgradeSolutionDialog({
  open,
  onOpenChange,
  solutionId,
  solutionTitle,
  onSuccess,
}: UpgradeSolutionDialogProps) {
  const [title, setTitle] = useState(`${solutionTitle} (升级版)`);
  const [upgradeNotes, setUpgradeNotes] = useState('');
  const [upgradeAssets, setUpgradeAssets] = useState(true);
  const [upgradeBom, setUpgradeBom] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    if (!title.trim()) {
      toast.error('请输入升级方案的标题');
      return;
    }

    try {
      setUpgrading(true);
      const response = await fetch(`/api/solutions/${solutionId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          upgradeNotes: upgradeNotes.trim() || undefined,
          upgradeAssets,
          upgradeBom,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('方案升级成功！');
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(result.data.id);
        } else {
          // 默认跳转到编辑页面
          window.location.href = `/zh-CN/creators/solutions/${result.data.id}/edit`;
        }
      } else {
        throw new Error(result.error || '升级失败');
      }
    } catch (error) {
      console.error('升级方案失败:', error);
      toast.error(`升级失败：${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-purple-600" />
            升级方案
          </DialogTitle>
          <DialogDescription>
            基于 "{solutionTitle}" 创建升级版本。升级后的方案将作为新方案，您可以继续编辑和完善。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-2">
            <Label htmlFor="upgrade-title">升级方案标题 *</Label>
            <Input
              id="upgrade-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入升级方案的标题"
            />
            <p className="text-sm text-gray-500">
              建议在原标题后添加版本号或升级说明
            </p>
          </div>

          {/* 升级说明 */}
          <div className="space-y-2">
            <Label htmlFor="upgrade-notes">升级说明（可选）</Label>
            <Textarea
              id="upgrade-notes"
              value={upgradeNotes}
              onChange={(e) => setUpgradeNotes(e.target.value)}
              placeholder="说明本次升级的主要改进和变化..."
              rows={4}
            />
          </div>

          {/* 升级选项 */}
          <div className="space-y-4">
            <Label>升级选项</Label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={upgradeAssets}
                  onChange={(e) => setUpgradeAssets(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">复制资产文件</p>
                    <p className="text-sm text-gray-500">
                      包括所有已上传的图片、文档、CAD文件等
                    </p>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={upgradeBom}
                  onChange={(e) => setUpgradeBom(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">复制 BOM 清单</p>
                    <p className="text-sm text-gray-500">
                      包括所有物料清单项目和配置
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>提示：</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
              <li>升级后的方案将作为新方案创建，状态为"草稿"</li>
              <li>您可以继续编辑升级后的方案，然后提交审核</li>
              <li>升级关系将被记录，可以在方案详情中查看</li>
              <li>每天最多可以升级 5 个方案</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={upgrading || !title.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {upgrading ? '升级中...' : '创建升级方案'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

