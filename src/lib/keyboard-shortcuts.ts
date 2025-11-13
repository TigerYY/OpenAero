/**
 * 键盘快捷键工具
 * 统一管理键盘快捷键功能
 */

'use client';

import { useCallback, useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

/**
 * 键盘快捷键 Hook
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;
        const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * 常用快捷键定义
 */
export const CommonShortcuts = {
  SAVE: {
    key: 's',
    ctrlKey: true,
    description: '保存',
  },
  SEARCH: {
    key: 'k',
    ctrlKey: true,
    description: '搜索',
  },
  NEW: {
    key: 'n',
    ctrlKey: true,
    description: '新建',
  },
  DELETE: {
    key: 'Delete',
    description: '删除',
  },
  ESCAPE: {
    key: 'Escape',
    description: '关闭/取消',
  },
  ENTER: {
    key: 'Enter',
    description: '确认/提交',
  },
} as const;

/**
 * 创建快捷键组合
 */
export function createShortcut(
  key: string,
  action: () => void,
  options?: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    description?: string;
    preventDefault?: boolean;
  }
): KeyboardShortcut {
  return {
    key,
    action,
    ...options,
  };
}

