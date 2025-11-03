// 协作编辑服务
import { EventEmitter } from 'events';

import { getWebSocketManager } from './websocket';

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  color: string; // 用户标识颜色
}

export interface CollaborationOperation {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  position: {
    line: number;
    column: number;
  };
  content?: string;
  length?: number; // 删除操作的长度
  userId: string;
  timestamp: number;
  version: number; // 文档版本号
}

export interface CollaborationDocument {
  id: string;
  content: string;
  version: number;
  lastModified: number;
  activeUsers: CollaborationUser[];
  operations: CollaborationOperation[];
}

export interface CollaborationSession {
  documentId: string;
  userId: string;
  sessionId: string;
  joinedAt: number;
  lastActivity: number;
}

export interface CursorPosition {
  userId: string;
  line: number;
  column: number;
  timestamp: number;
}

export interface SelectionRange {
  userId: string;
  start: { line: number; column: number };
  end: { line: number; column: number };
  timestamp: number;
}

export class CollaborationManager extends EventEmitter {
  private wsManager = getWebSocketManager();
  private currentSession: CollaborationSession | null = null;
  private document: CollaborationDocument | null = null;
  private operationQueue: CollaborationOperation[] = [];
  private isProcessingQueue = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30秒

  constructor() {
    super();
    this.setupWebSocketListeners();
  }

  // 加入协作会话
  async joinSession(documentId: string, userId: string): Promise<CollaborationDocument> {
    try {
      // 发送加入请求
      this.wsManager.send({
        type: 'collaboration_join',
        data: {
          documentId,
          userId,
          timestamp: Date.now()
        }
      });

      // 等待服务器响应
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('加入协作会话超时'));
        }, 10000);

        this.once('session_joined', (data) => {
          clearTimeout(timeout);
          this.currentSession = {
            documentId,
            userId,
            sessionId: data.sessionId,
            joinedAt: Date.now(),
            lastActivity: Date.now()
          };
          this.document = data.document;
          this.startHeartbeat();
          resolve(data.document);
        });

        this.once('session_join_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(error.message));
        });
      });
    } catch (error) {
      console.error('加入协作会话失败:', error);
      throw error;
    }
  }

  // 离开协作会话
  async leaveSession(): Promise<void> {
    if (!this.currentSession) return;

    try {
      this.wsManager.send({
        type: 'collaboration_leave',
        data: {
          documentId: this.currentSession.documentId,
          userId: this.currentSession.userId,
          sessionId: this.currentSession.sessionId
        }
      });

      this.stopHeartbeat();
      this.currentSession = null;
      this.document = null;
      this.operationQueue = [];
    } catch (error) {
      console.error('离开协作会话失败:', error);
    }
  }

  // 发送编辑操作
  async sendOperation(operation: Omit<CollaborationOperation, 'id' | 'userId' | 'timestamp' | 'version'>): Promise<void> {
    if (!this.currentSession || !this.document) {
      throw new Error('未加入协作会话');
    }

    const fullOperation: CollaborationOperation = {
      ...operation,
      id: this.generateOperationId(),
      userId: this.currentSession.userId,
      timestamp: Date.now(),
      version: this.document.version
    };

    // 添加到操作队列
    this.operationQueue.push(fullOperation);
    
    // 发送到服务器
    this.wsManager.send({
      type: 'collaboration_operation',
      data: {
        documentId: this.currentSession.documentId,
        operation: fullOperation
      }
    });

    // 处理操作队列
    this.processOperationQueue();
    this.updateLastActivity();
  }

  // 发送光标位置
  sendCursorPosition(line: number, column: number): void {
    if (!this.currentSession) return;

    this.wsManager.send({
      type: 'collaboration_cursor',
      data: {
        documentId: this.currentSession.documentId,
        userId: this.currentSession.userId,
        cursor: { line, column },
        timestamp: Date.now()
      }
    });

    this.updateLastActivity();
  }

  // 发送选择范围
  sendSelection(start: { line: number; column: number }, end: { line: number; column: number }): void {
    if (!this.currentSession) return;

    this.wsManager.send({
      type: 'collaboration_selection',
      data: {
        documentId: this.currentSession.documentId,
        userId: this.currentSession.userId,
        selection: { start, end },
        timestamp: Date.now()
      }
    });

    this.updateLastActivity();
  }

  // 获取当前文档
  getCurrentDocument(): CollaborationDocument | null {
    return this.document;
  }

  // 获取当前会话
  getCurrentSession(): CollaborationSession | null {
    return this.currentSession;
  }

  // 获取活跃用户列表
  getActiveUsers(): CollaborationUser[] {
    return this.document?.activeUsers || [];
  }

  // 应用操作到本地文档
  private applyOperation(operation: CollaborationOperation): void {
    if (!this.document) return;

    const lines = this.document.content.split('\n');
    const { line, column } = operation.position;

    switch (operation.type) {
      case 'insert':
        if (operation.content) {
          const currentLine = lines[line] || '';
          const before = currentLine.substring(0, column);
          const after = currentLine.substring(column);
          
          if (operation.content.includes('\n')) {
            const insertLines = operation.content.split('\n');
            lines[line] = before + (insertLines[0] || '');
            for (let i = 1; i < insertLines.length; i++) {
              lines.splice(line + i, 0, insertLines[i] || '');
            }
            if (insertLines.length > 1) {
              const lastLine = lines[line + insertLines.length - 1];
              if (lastLine !== undefined) {
                lines[line + insertLines.length - 1] = lastLine + after;
              }
            }
          } else {
            lines[line] = before + operation.content + after;
          }
        }
        break;

      case 'delete':
        if (operation.length) {
          const currentLine = lines[line] || '';
          const before = currentLine.substring(0, column);
          const after = currentLine.substring(column + operation.length);
          lines[line] = before + after;
        }
        break;

      case 'replace':
        if (operation.content && operation.length) {
          const currentLine = lines[line] || '';
          const before = currentLine.substring(0, column);
          const after = currentLine.substring(column + operation.length);
          lines[line] = before + operation.content + after;
        }
        break;
    }

    this.document.content = lines.join('\n');
    this.document.version++;
    this.document.lastModified = Date.now();
  }

  // 处理操作队列
  private processOperationQueue(): void {
    if (this.isProcessingQueue || this.operationQueue.length === 0) return;

    this.isProcessingQueue = true;

    try {
      while (this.operationQueue.length > 0) {
        const operation = this.operationQueue.shift();
        if (operation) {
          this.applyOperation(operation);
          this.emit('operation_applied', operation);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // 设置WebSocket监听器
  private setupWebSocketListeners(): void {
    this.wsManager.on('collaboration_session_joined', (data) => {
      this.emit('session_joined', data);
    });

    this.wsManager.on('collaboration_session_join_error', (data) => {
      this.emit('session_join_error', data);
    });

    this.wsManager.on('collaboration_operation_received', (data) => {
      if (data.operation.userId !== this.currentSession?.userId) {
        this.operationQueue.push(data.operation);
        this.processOperationQueue();
      }
    });

    this.wsManager.on('collaboration_cursor_update', (data) => {
      this.emit('cursor_update', data);
    });

    this.wsManager.on('collaboration_selection_update', (data) => {
      this.emit('selection_update', data);
    });

    this.wsManager.on('collaboration_user_joined', (data) => {
      if (this.document) {
        this.document.activeUsers.push(data.user);
      }
      this.emit('user_joined', data);
    });

    this.wsManager.on('collaboration_user_left', (data) => {
      if (this.document) {
        this.document.activeUsers = this.document.activeUsers.filter(
          user => user.id !== data.userId
        );
      }
      this.emit('user_left', data);
    });

    this.wsManager.on('collaboration_document_updated', (data) => {
      this.document = data.document;
      this.emit('document_updated', data);
    });
  }

  // 开始心跳
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.currentSession) {
        this.wsManager.send({
          type: 'collaboration_heartbeat',
          data: {
            documentId: this.currentSession.documentId,
            userId: this.currentSession.userId,
            sessionId: this.currentSession.sessionId,
            timestamp: Date.now()
          }
        });
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  // 停止心跳
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 更新最后活动时间
  private updateLastActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = Date.now();
    }
  }

  // 生成操作ID
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // 获取用户颜色
  static getUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}

// 单例实例
let collaborationManager: CollaborationManager | null = null;

export function getCollaborationManager(): CollaborationManager {
  if (!collaborationManager) {
    collaborationManager = new CollaborationManager();
  }
  return collaborationManager;
}

export default CollaborationManager;