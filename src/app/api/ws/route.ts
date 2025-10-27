import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

interface ExtendedSocket extends Socket {
  server: any;
}

interface WebSocketConnection {
  ws: any;
  userId: string;
  rooms: Set<string>;
  lastPing: number;
}

// 存储所有活跃连接
const connections = new Map<string, WebSocketConnection>();
const rooms = new Map<string, Set<string>>(); // roomId -> Set of userIds
const userSockets = new Map<string, any>(); // userId -> WebSocket

let wss: WebSocketServer | null = null;

function initWebSocketServer(server: any) {
  if (wss) return wss;

  wss = new WebSocketServer({ 
    server,
    path: '/api/ws'
  });

  wss.on('connection', (ws: any, request: IncomingMessage) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const userId = url.searchParams.get('userId');
    const token = url.searchParams.get('token');

    if (!userId || !token) {
      ws.close(1008, '缺少必要参数');
      return;
    }

    // 验证 token（这里应该实现真实的 token 验证）
    if (!validateToken(token, userId)) {
      ws.close(1008, '无效的认证信息');
      return;
    }

    // 创建连接记录
    const connection: WebSocketConnection = {
      ws,
      userId,
      rooms: new Set(),
      lastPing: Date.now()
    };

    connections.set(userId, connection);
    userSockets.set(userId, ws);

    console.log(`用户 ${userId} 已连接`);

    // 广播用户上线状态
    broadcastUserStatus(userId, 'online');

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(userId, message);
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    });

    ws.on('close', () => {
      console.log(`用户 ${userId} 已断开连接`);
      
      // 离开所有房间
      const userConnection = connections.get(userId);
      if (userConnection) {
        userConnection.rooms.forEach(roomId => {
          leaveRoom(userId, roomId);
        });
      }

      // 清理连接
      connections.delete(userId);
      userSockets.delete(userId);

      // 广播用户离线状态
      broadcastUserStatus(userId, 'offline');
    });

    ws.on('error', (error: Error) => {
      console.error(`WebSocket 错误 (用户 ${userId}):`, error);
    });

    // 发送连接成功消息
    sendToUser(userId, {
      type: 'connected',
      data: { userId, timestamp: Date.now() }
    });
  });

  // 心跳检测
  setInterval(() => {
    const now = Date.now();
    connections.forEach((connection, userId) => {
      if (now - connection.lastPing > 60000) { // 60秒无心跳则断开
        connection.ws.terminate();
        connections.delete(userId);
        userSockets.delete(userId);
        broadcastUserStatus(userId, 'offline');
      }
    });
  }, 30000);

  return wss;
}

function validateToken(token: string, userId: string): boolean {
  // 这里应该实现真实的 token 验证逻辑
  // 例如验证 JWT token 或查询数据库
  return token.length > 0 && userId.length > 0;
}

function handleMessage(userId: string, message: any) {
  const connection = connections.get(userId);
  if (!connection) return;

  switch (message.type) {
    case 'ping':
      connection.lastPing = Date.now();
      sendToUser(userId, { type: 'pong', data: {} });
      break;

    case 'join_room':
      joinRoom(userId, message.data.roomId);
      break;

    case 'leave_room':
      leaveRoom(userId, message.data.roomId);
      break;

    case 'chat_message':
      handleChatMessage(userId, message.data);
      break;

    case 'typing':
      handleTyping(userId, message.data);
      break;

    case 'mark_as_read':
      handleMarkAsRead(userId, message.data);
      break;

    case 'user_status':
      broadcastUserStatus(userId, message.data.status);
      break;

    default:
      console.log('未知消息类型:', message.type);
  }
}

function joinRoom(userId: string, roomId: string) {
  const connection = connections.get(userId);
  if (!connection) return;

  connection.rooms.add(roomId);

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId)!.add(userId);

  // 通知房间内其他用户
  broadcastToRoom(roomId, {
    type: 'user_joined',
    data: { userId, roomId, timestamp: Date.now() }
  }, userId);

  console.log(`用户 ${userId} 加入房间 ${roomId}`);
}

function leaveRoom(userId: string, roomId: string) {
  const connection = connections.get(userId);
  if (connection) {
    connection.rooms.delete(roomId);
  }

  const room = rooms.get(roomId);
  if (room) {
    room.delete(userId);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }

  // 通知房间内其他用户
  broadcastToRoom(roomId, {
    type: 'user_left',
    data: { userId, roomId, timestamp: Date.now() }
  }, userId);

  console.log(`用户 ${userId} 离开房间 ${roomId}`);
}

function handleChatMessage(senderId: string, messageData: any) {
  const message = {
    ...messageData,
    id: generateMessageId(),
    timestamp: Date.now(),
    status: 'sent'
  };

  // 保存消息到数据库（这里应该实现真实的数据库操作）
  saveMessageToDatabase(message);

  // 发送给房间内的所有用户
  if (message.roomId) {
    broadcastToRoom(message.roomId, {
      type: 'chat_message',
      data: message
    });
  } else if (message.receiverId) {
    // 私聊消息
    sendToUser(message.receiverId, {
      type: 'chat_message',
      data: message
    });
    
    // 发送状态更新给发送者
    sendToUser(senderId, {
      type: 'message_status',
      data: { messageId: message.id, status: 'delivered' }
    });
  }
}

function handleTyping(userId: string, data: any) {
  if (data.roomId) {
    broadcastToRoom(data.roomId, {
      type: 'typing',
      data: { userId, roomId: data.roomId, isTyping: data.isTyping }
    }, userId);
  }
}

function handleMarkAsRead(userId: string, data: any) {
  // 更新消息状态为已读（这里应该实现真实的数据库操作）
  updateMessageStatus(data.messageId, 'read');

  // 通知发送者消息已被读取
  const message = getMessageFromDatabase(data.messageId);
  if (message && message.senderId !== userId) {
    sendToUser(message.senderId, {
      type: 'message_status',
      data: { messageId: data.messageId, status: 'read' }
    });
  }
}

function broadcastUserStatus(userId: string, status: string) {
  const userStatus = {
    userId,
    status,
    lastSeen: Date.now()
  };

  // 广播给所有连接的用户
  connections.forEach((connection, connectedUserId) => {
    if (connectedUserId !== userId) {
      sendToUser(connectedUserId, {
        type: 'user_status',
        data: userStatus
      });
    }
  });
}

function sendToUser(userId: string, message: any) {
  const ws = userSockets.get(userId);
  if (ws && ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify({
      ...message,
      timestamp: Date.now(),
      id: generateMessageId()
    }));
  }
}

function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.forEach(userId => {
    if (userId !== excludeUserId) {
      sendToUser(userId, message);
    }
  });
}

function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 模拟数据库操作（实际应用中应该使用真实的数据库）
function saveMessageToDatabase(message: any) {
  // 实现消息保存逻辑
  console.log('保存消息:', message.id);
}

function updateMessageStatus(messageId: string, status: string) {
  // 实现消息状态更新逻辑
  console.log('更新消息状态:', messageId, status);
}

function getMessageFromDatabase(messageId: string) {
  // 实现消息查询逻辑
  return {
    id: messageId,
    senderId: 'mock-sender',
    content: 'mock message'
  };
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { socket } = request as any;
  
  if (socket.server.ws) {
    console.log('WebSocket 服务器已存在');
  } else {
    console.log('初始化 WebSocket 服务器');
    socket.server.ws = initWebSocketServer(socket.server);
  }

  return new Response('WebSocket 服务器已启动', { status: 200 });
}

// 处理 WebSocket 升级请求
export async function SOCKET(request: NextRequest) {
  return new Response('WebSocket endpoint', { status: 101 });
}