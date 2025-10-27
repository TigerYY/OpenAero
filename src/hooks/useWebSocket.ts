import { useEffect, useState, useCallback } from 'react';
import { getWebSocketManager } from '@/lib/websocket';
import type { WebSocketMessage, ChatMessage, NotificationData } from '@/lib/websocket';

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (message: Omit<WebSocketMessage, 'timestamp' | 'id'>) => void;
  sendChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'status'>) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  markMessageAsRead: (messageId: string) => void;
  updateUserStatus: (status: 'online' | 'offline' | 'away' | 'busy') => void;
}

export function useWebSocket(userId?: string, token?: string): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const wsManager = getWebSocketManager();

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    wsManager.on('connect', handleConnect);
    wsManager.on('disconnect', handleDisconnect);

    // 如果提供了用户信息，尝试连接
    if (userId && token && !wsManager.isConnected()) {
      wsManager.connect(userId, token).catch(console.error);
    }

    return () => {
      wsManager.off('connect', handleConnect);
      wsManager.off('disconnect', handleDisconnect);
    };
  }, [wsManager, userId, token]);

  const send = useCallback((message: Omit<WebSocketMessage, 'timestamp' | 'id'>) => {
    wsManager.send(message);
  }, [wsManager]);

  const sendChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp' | 'status'>) => {
    wsManager.sendChatMessage(message);
  }, [wsManager]);

  const joinRoom = useCallback((roomId: string) => {
    wsManager.joinRoom(roomId);
  }, [wsManager]);

  const leaveRoom = useCallback((roomId: string) => {
    wsManager.leaveRoom(roomId);
  }, [wsManager]);

  const markMessageAsRead = useCallback((messageId: string) => {
    wsManager.markMessageAsRead(messageId);
  }, [wsManager]);

  const updateUserStatus = useCallback((status: 'online' | 'offline' | 'away' | 'busy') => {
    wsManager.updateUserStatus(status);
  }, [wsManager]);

  return {
    isConnected,
    send,
    sendChatMessage,
    joinRoom,
    leaveRoom,
    markMessageAsRead,
    updateUserStatus
  };
}

// 专门用于通知的 Hook
export function useNotifications(userId?: string, token?: string) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsManager = getWebSocketManager();

  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      if (message.type === 'notification') {
        const notification = message.data as NotificationData;
        setNotifications(prev => [notification, ...prev]);
        if (!notification.read) {
          setUnreadCount(prev => prev + 1);
        }

        // 显示浏览器通知
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          });
        }
      }
    };

    wsManager.on('message', handleMessage);

    // 如果提供了用户信息，尝试连接
    if (userId && token && !wsManager.isConnected()) {
      wsManager.connect(userId, token).catch(console.error);
    }

    return () => {
      wsManager.off('message', handleMessage);
    };
  }, [wsManager, userId, token]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification
  };
}

// 专门用于聊天的 Hook
export function useChat(roomId?: string, userId?: string, token?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const wsManager = getWebSocketManager();

  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        case 'chat_message':
          const chatMessage = message.data as ChatMessage;
          if (!roomId || chatMessage.roomId === roomId) {
            setMessages(prev => [...prev, chatMessage]);
          }
          break;
        case 'user_status':
          const userStatus = message.data;
          if (userStatus.status === 'online') {
            setOnlineUsers(prev => new Set([...prev, userStatus.userId]));
          } else {
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(userStatus.userId);
              return newSet;
            });
          }
          break;
        case 'typing_start':
          if (!roomId || message.data.roomId === roomId) {
            setTypingUsers(prev => new Set([...prev, message.data.userId]));
          }
          break;
        case 'typing_stop':
          if (!roomId || message.data.roomId === roomId) {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(message.data.userId);
              return newSet;
            });
          }
          break;
      }
    };

    wsManager.on('message', handleMessage);

    // 如果提供了用户信息，尝试连接
    if (userId && token && !wsManager.isConnected()) {
      wsManager.connect(userId, token).catch(console.error);
    }

    // 加入房间
    if (roomId && wsManager.isConnected()) {
      wsManager.joinRoom(roomId);
    }

    return () => {
      wsManager.off('message', handleMessage);
      if (roomId && wsManager.isConnected()) {
        wsManager.leaveRoom(roomId);
      }
    };
  }, [wsManager, roomId, userId, token]);

  const sendMessage = useCallback((content: string, type: 'text' | 'image' | 'file' | 'system' = 'text') => {
    if (!roomId || !userId) return;

    wsManager.sendChatMessage({
      senderId: userId,
      senderName: '当前用户', // 这里应该从用户信息中获取
      roomId,
      content,
      type
    });
  }, [wsManager, roomId, userId]);

  return {
    messages,
    onlineUsers,
    typingUsers,
    isConnected: wsManager.isConnected(),
    sendMessage
  };
}