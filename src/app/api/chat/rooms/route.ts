import { NextRequest, NextResponse } from 'next/server';
import { ChatMessage } from '@/lib/websocket';

interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: number;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  participants: ChatUser[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
}

// 模拟聊天室数据
const mockUsers: ChatUser[] = [
  {
    id: 'user2',
    name: '张三',
    avatar: '/avatars/user2.jpg',
    status: 'online',
    lastSeen: Date.now()
  },
  {
    id: 'user3',
    name: '李四',
    avatar: '/avatars/user3.jpg',
    status: 'offline',
    lastSeen: Date.now() - 3600000
  },
  {
    id: 'user4',
    name: '王五',
    avatar: '/avatars/user4.jpg',
    status: 'away',
    lastSeen: Date.now() - 1800000
  }
];

const mockRooms: ChatRoom[] = [
  {
    id: 'room1',
    name: '张三',
    type: 'direct',
    participants: [mockUsers[0]],
    lastMessage: {
      id: 'msg1',
      senderId: 'user2',
      senderName: '张三',
      receiverId: 'user1',
      content: '你好，有什么问题吗？',
      type: 'text',
      timestamp: Date.now() - 300000,
      status: 'read'
    },
    unreadCount: 0,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 300000
  },
  {
    id: 'room2',
    name: '李四',
    type: 'direct',
    participants: [mockUsers[1]],
    lastMessage: {
      id: 'msg2',
      senderId: 'user3',
      senderName: '李四',
      receiverId: 'user1',
      content: '明天的会议准备好了吗？',
      type: 'text',
      timestamp: Date.now() - 1800000,
      status: 'delivered'
    },
    unreadCount: 2,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 1800000
  },
  {
    id: 'room3',
    name: '项目讨论组',
    type: 'group',
    participants: mockUsers.slice(0, 3), // 使用前3个用户
    lastMessage: {
      id: 'msg3',
      senderId: 'user4',
      senderName: '王五',
      roomId: 'room3',
      content: '大家对新功能有什么想法？',
      type: 'text',
      timestamp: Date.now() - 3600000,
      status: 'read'
    },
    unreadCount: 1,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 3600000
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'user1'; // 应该从认证中获取
    const type = searchParams.get('type'); // 'direct' | 'group'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 过滤用户的聊天室
    let userRooms = mockRooms.filter(room => {
      // 检查用户是否是房间的参与者
      return room.participants.some(p => p.id === userId) || 
             room.lastMessage?.senderId === userId ||
             room.lastMessage?.receiverId === userId;
    });

    // 按类型过滤
    if (type) {
      userRooms = userRooms.filter(room => room.type === type);
    }

    // 按最后更新时间排序
    userRooms.sort((a, b) => b.updatedAt - a.updatedAt);

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRooms = userRooms.slice(startIndex, endIndex);

    // 计算总未读数量
    const totalUnreadCount = userRooms.reduce((total, room) => total + room.unreadCount, 0);

    return NextResponse.json({
      success: true,
      rooms: paginatedRooms,
      pagination: {
        page,
        limit,
        total: userRooms.length,
        totalPages: Math.ceil(userRooms.length / limit)
      },
      totalUnreadCount
    });

  } catch (error) {
    console.error('获取聊天室失败:', error);
    return NextResponse.json(
      { success: false, error: '获取聊天室失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, participantIds, userId } = body;

    if (!name || !type || !participantIds || !userId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取参与者信息
    const participants = mockUsers.filter(user => participantIds.includes(user.id));

    const newRoom: ChatRoom = {
      id: generateRoomId(),
      name,
      type,
      participants,
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    mockRooms.push(newRoom);

    return NextResponse.json({
      success: true,
      room: newRoom
    });

  } catch (error) {
    console.error('创建聊天室失败:', error);
    return NextResponse.json(
      { success: false, error: '创建聊天室失败' },
      { status: 500 }
    );
  }
}

function generateRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}