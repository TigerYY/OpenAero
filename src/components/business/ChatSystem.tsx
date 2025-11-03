'use client';

import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Phone,
  Video,
  Search,
  X,
  Check,
  CheckCheck,
  Clock
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { getWebSocketManager, ChatMessage, UserStatus } from '@/lib/websocket';

interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  status: UserStatus['status'];
  lastSeen: number;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  participants: ChatUser[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

interface ChatSystemProps {
  currentUserId: string;
  className?: string;
}

export default function ChatSystem({ currentUserId, className = '' }: ChatSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  const wsManager = getWebSocketManager();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOpen) {
      loadChatRooms();
      setupWebSocketListeners();
    }

    return () => {
      cleanupWebSocketListeners();
    };
  }, [isOpen]);

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom.id);
      wsManager.joinRoom(activeRoom.id);
    }
  }, [activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupWebSocketListeners = () => {
    wsManager.on('chat_message', handleNewMessage);
    wsManager.on('message_status', handleMessageStatus);
    wsManager.on('user_status', handleUserStatus);
    wsManager.on('typing', handleTyping);
  };

  const cleanupWebSocketListeners = () => {
    wsManager.off('chat_message', handleNewMessage);
    wsManager.off('message_status', handleMessageStatus);
    wsManager.off('user_status', handleUserStatus);
    wsManager.off('typing', handleTyping);
  };

  const handleNewMessage = (message: ChatMessage) => {
    if (activeRoom && (message.roomId === activeRoom.id || 
        (message.senderId === currentUserId || message.receiverId === currentUserId))) {
      setMessages(prev => [...prev, message]);
      
      // 标记消息为已读
      if (message.senderId !== currentUserId) {
        wsManager.markMessageAsRead(message.id);
      }
    }

    // 更新房间列表中的最后消息
    setRooms(prev => prev.map(room => {
      if (room.id === message.roomId || 
          room.participants.some(p => p.id === message.senderId || p.id === message.receiverId)) {
        return {
          ...room,
          lastMessage: message,
          unreadCount: message.senderId !== currentUserId ? room.unreadCount + 1 : room.unreadCount
        };
      }
      return room;
    }));
  };

  const handleMessageStatus = (data: { messageId: string; status: ChatMessage['status'] }) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId ? { ...msg, status: data.status } : msg
    ));
  };

  const handleUserStatus = (userStatus: UserStatus) => {
    if (userStatus.status === 'online') {
      setOnlineUsers(prev => new Set([...prev, userStatus.userId]));
    } else {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userStatus.userId);
        return newSet;
      });
    }

    // 更新房间中用户状态
    setRooms(prev => prev.map(room => ({
      ...room,
      participants: room.participants.map(user => 
        user.id === userStatus.userId 
          ? { ...user, status: userStatus.status, lastSeen: userStatus.lastSeen }
          : user
      )
    })));
  };

  const handleTyping = (data: { userId: string; roomId: string; isTyping: boolean }) => {
    if (data.roomId === activeRoom?.id && data.userId !== currentUserId) {
      setTypingUsers(prev => {
        if (data.isTyping) {
          return [...prev.filter(id => id !== data.userId), data.userId];
        } else {
          return prev.filter(id => id !== data.userId);
        }
      });
    }
  };

  const loadChatRooms = async () => {
    try {
      const response = await fetch('/api/chat/rooms');
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('加载聊天室失败:', error);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !activeRoom) return;

    const message: Omit<ChatMessage, 'id' | 'timestamp' | 'status'> = {
      senderId: currentUserId,
      senderName: '当前用户', // 应该从用户信息中获取
      roomId: activeRoom.id,
      content: newMessage.trim(),
      type: 'text'
    };

    wsManager.sendChatMessage(message);
    setNewMessage('');
    stopTyping();
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    
    if (value.trim() && !isTyping) {
      startTyping();
    } else if (!value.trim() && isTyping) {
      stopTyping();
    }
  };

  const startTyping = () => {
    if (!activeRoom) return;
    
    setIsTyping(true);
    wsManager.send({
      type: 'typing',
      data: { roomId: activeRoom.id, isTyping: true }
    });

    // 清除之前的定时器
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // 3秒后停止输入状态
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (!activeRoom || !isTyping) return;
    
    setIsTyping(false);
    wsManager.send({
      type: 'typing',
      data: { roomId: activeRoom.id, isTyping: false }
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`relative ${className}`}>
      {/* 聊天按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <MessageCircle className="w-6 h-6" />
        {rooms.reduce((total, room) => total + room.unreadCount, 0) > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {rooms.reduce((total, room) => total + room.unreadCount, 0)}
          </span>
        )}
      </button>

      {/* 聊天窗口 */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col">
          {!activeRoom ? (
            // 聊天室列表
            <>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">消息</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 搜索 */}
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索聊天..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 聊天室列表 */}
              <div className="flex-1 overflow-y-auto">
                {filteredRooms.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无聊天</p>
                  </div>
                ) : (
                  filteredRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => setActiveRoom(room)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            {room.type === 'direct' ? (
                              room.participants[0]?.avatar ? (
                                <img
                                  src={room.participants[0].avatar}
                                  alt={room.participants[0].name}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <span className="text-sm font-medium text-gray-600">
                                  {room.participants[0]?.name.charAt(0)}
                                </span>
                              )
                            ) : (
                              <span className="text-sm font-medium text-gray-600">群</span>
                            )}
                          </div>
                          {room.type === 'direct' && room.participants[0]?.id && onlineUsers.has(room.participants[0].id) && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {room.name}
                            </h4>
                            {room.lastMessage && (
                              <span className="text-xs text-gray-500">
                                {formatTime(room.lastMessage.timestamp)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 truncate">
                              {room.lastMessage?.content || '暂无消息'}
                            </p>
                            {room.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                {room.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            // 聊天界面
            <>
              {/* 聊天头部 */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setActiveRoom(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{activeRoom.name}</h3>
                    <p className="text-xs text-gray-500">
                      {activeRoom.type === 'direct' && activeRoom.participants[0]?.id && onlineUsers.has(activeRoom.participants[0].id)
                        ? '在线'
                        : '离线'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Video className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.senderId === currentUserId
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center justify-end space-x-1 mt-1 ${
                        message.senderId === currentUserId ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">{formatTime(message.timestamp)}</span>
                        {message.senderId === currentUserId && getMessageStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 正在输入提示 */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg">
                      <p className="text-sm">正在输入...</p>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* 输入框 */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="输入消息..."
                    value={newMessage}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}