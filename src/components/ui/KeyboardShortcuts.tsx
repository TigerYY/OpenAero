/**
 * 键盘快捷键显示组件
 * 显示可用的键盘快捷键
 */

'use client';

import { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useKeyboardShortcuts, CommonShortcuts, createShortcut } from '@/lib/keyboard-shortcuts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

export interface KeyboardShortcutsProps {
  shortcuts?: Array<{
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    description: string;
    action: () => void;
  }>;
  showToggle?: boolean;
}

export function KeyboardShortcuts({ shortcuts = [], showToggle = true }: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations();

  // 默认快捷键：Ctrl+K 打开快捷键帮助
  const defaultShortcuts = [
    createShortcut('k', () => setIsOpen(true), {
      ctrlKey: true,
      description: t('keyboardShortcuts', { defaultValue: '键盘快捷键' }),
    }),
    ...shortcuts,
  ];

  useKeyboardShortcuts(defaultShortcuts);

  const formatShortcut = (shortcut: typeof shortcuts[0]) => {
    const parts: string[] = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.metaKey) parts.push('Cmd');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  return (
    <>
      {showToggle && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2"
          aria-label={t('keyboardShortcuts', { defaultValue: '键盘快捷键' })}
        >
          <Keyboard className="w-4 h-4" />
          <span className="hidden sm:inline">
            {t('keyboardShortcuts', { defaultValue: '快捷键' })}
          </span>
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              {t('keyboardShortcuts', { defaultValue: '键盘快捷键' })}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {shortcuts.length > 0 ? (
              shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded">
                    {formatShortcut(shortcut)}
                  </kbd>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>{t('common.noData', { defaultValue: '暂无快捷键' })}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

