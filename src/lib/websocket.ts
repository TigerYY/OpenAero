import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  id?: string;
}

export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  userId?: string;
  actionUrl?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId?: string;
  roomId?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: string;
}

export interface UserStatus {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: number;
}

class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageQueue: WebSocketMessage[] = [];
  private userId: string | null = null;
  private token: string | null = null;

  constructor(url?: string) {
    super();
    this.url = url || this.getWebSocketUrl();
  }

  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') return '';
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/ws`;
  }

  public connect(userId: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.userId = userId;
      this.token = token;
      this.isConnecting = true;

      try {
        const wsUrl = `${this.url}?userId=${userId}&token=${token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket 连接已建立');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('解析 WebSocket 消息失败:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket 连接已关闭:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnected', event);
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error);
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, '用户主动断开连接');
      this.ws = null;
    }
    this.stopHeartbeat();
    this.reconnectAttempts = this.maxReconnectAttempts;
  }

  public send(message: Omit<WebSocketMessage, 'timestamp' | 'id'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now(),
      id: this.generateMessageId()
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      // 如果连接未建立，将消息加入队列
      this.messageQueue.push(fullMessage);
      
      // 尝试重新连接
      if (this.userId && this.token) {
        this.connect(this.userId, this.token);
      }
    }
  }

  public sendChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp' | 'status'>): void {
    const chatMessage: ChatMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now(),
      status: 'sending'
    };

    this.send({
      type: 'chat_message',
      data: chatMessage
    });

    // 立即触发本地事件，显示发送中状态
    this.emit('chat_message', chatMessage);
  }

  public markMessageAsRead(messageId: string): void {
    this.send({
      type: 'mark_as_read',
      data: { messageId }
    });
  }

  public joinRoom(roomId: string): void {
    this.send({
      type: 'join_room',
      data: { roomId }
    });
  }

  public leaveRoom(roomId: string): void {
    this.send({
      type: 'leave_room',
      data: { roomId }
    });
  }

  public updateUserStatus(status: UserStatus['status']): void {
    this.send({
      type: 'user_status',
      data: { status }
    });
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'notification':
        this.emit('notification', message.data as NotificationData);
        break;
      
      case 'chat_message':
        this.emit('chat_message', message.data as ChatMessage);
        break;
      
      case 'message_status':
        this.emit('message_status', message.data);
        break;
      
      case 'user_status':
        this.emit('user_status', message.data as UserStatus);
        break;
      
      case 'user_joined':
        this.emit('user_joined', message.data);
        break;
      
      case 'user_left':
        this.emit('user_left', message.data);
        break;
      
      case 'typing':
        this.emit('typing', message.data);
        break;
      
      case 'pong':
        // 心跳响应
        break;
      
      default:
        console.log('未知消息类型:', message.type, message.data);
        this.emit('message', message);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`);
    
    setTimeout(() => {
      if (this.userId && this.token) {
        this.connect(this.userId, this.token).catch(console.error);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          data: {}
        });
      }
    }, 30000); // 每30秒发送一次心跳
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 单例实例
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

export default WebSocketManager;