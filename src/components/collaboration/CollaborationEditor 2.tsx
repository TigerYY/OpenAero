'use client';

import { useSession } from 'next-auth/react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getCollaborationManager, CollaborationUser, CollaborationOperation } from '@/lib/collaboration';


// Simple Avatar component
interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

function Avatar({ src, alt, size = 'md', className = '', style }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const initials = alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-gray-300 text-gray-700 font-medium ${className}`}
      style={style}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

interface CollaborationEditorProps {
  documentId: string;
  documentType: 'solution' | 'proposal' | 'document';
  initialContent?: string;
  onContentChange?: (content: string) => void;
  className?: string;
}

interface CursorInfo {
  userId: string;
  line: number;
  column: number;
  color: string;
  userName: string;
}

interface SelectionInfo {
  userId: string;
  start: { line: number; column: number };
  end: { line: number; column: number };
  color: string;
  userName: string;
}

export default function CollaborationEditor({
  documentId,
  documentType,
  initialContent = '',
  onContentChange,
  className = ''
}: CollaborationEditorProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState(initialContent);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [cursors, setCursors] = useState<CursorInfo[]>([]);
  const [selections, setSelections] = useState<SelectionInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const collaborationManager = getCollaborationManager();
  const lastCursorPosition = useRef({ line: 0, column: 0 });
  const isLocalChange = useRef(false);

  // 加入协作会话
  const joinSession = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const document = await collaborationManager.joinSession(documentId, session.user.id);
      if (document) {
        setContent(document.content);
        setActiveUsers(document.activeUsers);
        setIsConnected(true);
        
        if (onContentChange) {
          onContentChange(document.content);
        }
      }
    } catch (error) {
      console.error('加入协作会话失败:', error);
      setError(error instanceof Error ? error.message : '加入协作会话失败');
    } finally {
      setIsLoading(false);
    }
  }, [documentId, session?.user?.id, collaborationManager, onContentChange]);

  // 离开协作会话
  const leaveSession = useCallback(async () => {
    try {
      await collaborationManager.leaveSession();
      setIsConnected(false);
      setActiveUsers([]);
      setCursors([]);
      setSelections([]);
    } catch (error) {
      console.error('离开协作会话失败:', error);
    }
  }, [collaborationManager]);

  // 处理文本变化
  const handleContentChange = useCallback(async (newContent: string) => {
    if (!isConnected || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart || 0;
    
    // 计算行列位置
    const lines = newContent.substring(0, cursorPosition).split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1]?.length || 0;

    // 检测操作类型
    const oldContent = content;
    const oldLength = oldContent.length;
    const newLength = newContent.length;

    isLocalChange.current = true;

    try {
      if (newLength > oldLength) {
        // 插入操作
        const insertedText = newContent.substring(cursorPosition - (newLength - oldLength), cursorPosition);
        await collaborationManager.sendOperation({
          type: 'insert',
          position: { line, column: column - insertedText.length },
          content: insertedText
        });
      } else if (newLength < oldLength) {
        // 删除操作
        const deletedLength = oldLength - newLength;
        await collaborationManager.sendOperation({
          type: 'delete',
          position: { line, column },
          length: deletedLength
        });
      }

      setContent(newContent);
      if (onContentChange) {
        onContentChange(newContent);
      }
    } catch (error) {
      console.error('发送操作失败:', error);
    } finally {
      isLocalChange.current = false;
    }
  }, [content, isConnected, collaborationManager, onContentChange]);

  // 处理光标位置变化
  const handleCursorChange = useCallback(() => {
    if (!isConnected || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart || 0;
    const lines = content.substring(0, cursorPosition).split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1]?.length || 0;

    // 避免频繁发送相同位置
    if (line !== lastCursorPosition.current.line || column !== lastCursorPosition.current.column) {
      lastCursorPosition.current = { line, column };
      collaborationManager.sendCursorPosition(line, column);
    }
  }, [content, isConnected, collaborationManager]);

  // 处理选择变化
  const handleSelectionChange = useCallback(() => {
    if (!isConnected || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;

    if (start !== end) {
      const startLines = content.substring(0, start).split('\n');
      const endLines = content.substring(0, end).split('\n');
      
      const startPos = {
        line: startLines.length - 1,
        column: startLines[startLines.length - 1]?.length || 0
      };
      
      const endPos = {
        line: endLines.length - 1,
        column: endLines[endLines.length - 1]?.length || 0
      };

      collaborationManager.sendSelection(startPos, endPos);
    }
  }, [content, isConnected, collaborationManager]);

  // 设置事件监听器
  useEffect(() => {
    const handleOperationApplied = (operation: CollaborationOperation) => {
      if (!isLocalChange.current && operation.userId !== session?.user?.id) {
        // 应用远程操作到本地内容
        const document = collaborationManager.getCurrentDocument();
        if (document) {
          setContent(document.content);
          if (onContentChange) {
            onContentChange(document.content);
          }
        }
      }
    };

    const handleCursorUpdate = (data: any) => {
      if (data.userId !== session?.user?.id) {
        setCursors(prev => {
          const filtered = prev.filter(cursor => cursor.userId !== data.userId);
          return [...filtered, {
            userId: data.userId,
            line: data.cursor.line,
            column: data.cursor.column,
            color: data.color || '#FF6B6B',
            userName: data.userName || 'Unknown User'
          }];
        });
      }
    };

    const handleSelectionUpdate = (data: any) => {
      if (data.userId !== session?.user?.id) {
        setSelections(prev => {
          const filtered = prev.filter(selection => selection.userId !== data.userId);
          return [...filtered, {
            userId: data.userId,
            start: data.selection.start,
            end: data.selection.end,
            color: data.color || '#FF6B6B',
            userName: data.userName || 'Unknown User'
          }];
        });
      }
    };

    const handleUserJoined = (data: any) => {
      setActiveUsers(prev => {
        const exists = prev.some(user => user.id === data.user.id);
        if (!exists) {
          return [...prev, data.user];
        }
        return prev;
      });
    };

    const handleUserLeft = (data: any) => {
      setActiveUsers(prev => prev.filter(user => user.id !== data.userId));
      setCursors(prev => prev.filter(cursor => cursor.userId !== data.userId));
      setSelections(prev => prev.filter(selection => selection.userId !== data.userId));
    };

    collaborationManager.on('operation_applied', handleOperationApplied);
    collaborationManager.on('cursor_update', handleCursorUpdate);
    collaborationManager.on('selection_update', handleSelectionUpdate);
    collaborationManager.on('user_joined', handleUserJoined);
    collaborationManager.on('user_left', handleUserLeft);

    return () => {
      collaborationManager.off('operation_applied', handleOperationApplied);
      collaborationManager.off('cursor_update', handleCursorUpdate);
      collaborationManager.off('selection_update', handleSelectionUpdate);
      collaborationManager.off('user_joined', handleUserJoined);
      collaborationManager.off('user_left', handleUserLeft);
    };
  }, [collaborationManager, session?.user?.id, onContentChange]);

  // 组件挂载时加入会话
  useEffect(() => {
    if (session?.user?.id) {
      joinSession();
    }

    return () => {
      leaveSession();
    };
  }, [session?.user?.id, joinSession, leaveSession]);

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">正在连接协作会话...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={joinSession} variant="outline">
            重新连接
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 协作状态栏 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">活跃用户:</span>
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="relative"
                    title={user.name}
                  >
                    <Avatar
                      src={user.avatar}
                      alt={user.name}
                      size="sm"
                      className="border-2 border-white"
                      style={{ borderColor: user.color }}
                    />
                  </div>
                ))}
                {activeUsers.length > 5 && (
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full border-2 border-white text-xs font-medium">
                    +{activeUsers.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {documentType}
            </Badge>
            <Button
              onClick={leaveSession}
              variant="outline"
              size="sm"
            >
              离开会话
            </Button>
          </div>
        </div>
      </Card>

      {/* 编辑器 */}
      <Card className="p-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onSelect={handleSelectionChange}
            onKeyUp={handleCursorChange}
            onClick={handleCursorChange}
            className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="开始协作编辑..."
            disabled={!isConnected}
          />
          
          {/* 光标指示器 */}
          {cursors.map((cursor) => (
            <div
              key={cursor.userId}
              className="absolute pointer-events-none"
              style={{
                // 这里需要根据实际的行列位置计算像素位置
                // 简化实现，实际项目中需要更精确的计算
                top: `${cursor.line * 20 + 16}px`,
                left: `${cursor.column * 8 + 16}px`,
              }}
            >
              <div
                className="w-0.5 h-5 animate-pulse"
                style={{ backgroundColor: cursor.color }}
              ></div>
              <div
                className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.userName}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 用户列表 */}
      {activeUsers.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">协作用户</h3>
          <div className="space-y-2">
            {activeUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-3">
                <Avatar
                  src={user.avatar}
                  alt={user.name}
                  size="sm"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: user.color }}
                ></div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}