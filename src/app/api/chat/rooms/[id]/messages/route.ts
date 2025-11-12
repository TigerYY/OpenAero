import { NextRequest, NextResponse } from 'next/server';

import { ChatMessage } from '@/lib/websocket';

// 模拟消息数据
const mockMessages: { [roomId: string]: ChatMessage[] } = {
  'room1': [
    {
      id: 'msg1-1',
      senderId: 'user1',
      senderName: '当前用户',
      receiverId: 'user2',
      content: '你好，张三！',
      type: 'text',
      timestamp: Date.now() - 3600000,
      status: 'read'
    },
    {
      id: 'msg1-2',
      senderId: 'user2',
      senderName: '张三',
      receiverId: 'user1',
      content: '你好！有什么可以帮助你的吗？',
      type: 'text',
      timestamp: Date.now() - 3300000,
      status: 'read'
    },
    {
      id: 'msg1-3',
      senderId: 'user1',
      senderName: '当前用户',
      receiverId: 'user2',
      content: '我想了解一下新项目的进展',
      type: 'text',
      timestamp: Date.now() - 3000000,
      status: 'read'
    },
    {
      id: 'msg1-4',
      senderId: 'user2',
      senderName: '张三',
      receiverId: 'user1',
      content: '项目进展很顺利，预计下周可以完成第一阶段',
      type: 'text',
      timestamp: Date.now() - 300000,
      status: 'read'
    }
  ],
  'room2': [
    {
      id: 'msg2-1',
      senderId: 'user3',
      senderName: '李四',
      receiverId: 'user1',
      content: '明天的会议准备好了吗？',
      type: 'text',
      timestamp: Date.now() - 1800000,
      status: 'delivered'
    },
    {
      id: 'msg2-2',
      senderId: 'user3',
      senderName: '李四',
      receiverId: 'user1',
      content: '需要准备什么材料？',
      type: 'text',
      timestamp: Date.now() - 1500000,
      status: 'sent'
    }
  ],
  'room3': [
    {
      id: 'msg3-1',
      senderId: 'user2',
      senderName: '张三',
      roomId: 'room3',
      content: '大家好，我们来讨论一下新功能的设计',
      type: 'text',
      timestamp: Date.now() - 7200000,
      status: 'read'
    },
    {
      id: 'msg3-2',
      senderId: 'user3',
      senderName: '李四',
      roomId: 'room3',
      content: '我觉得用户界面需要更简洁一些',
      type: 'text',
      timestamp: Date.now() - 6900000,
      status: 'read'
    },
    {
      id: 'msg3-3',
      senderId: 'user4',
      senderName: '王五',
      roomId: 'room3',
      content: '同意，我们可以参考一些优秀的设计案例',
      type: 'text',
      timestamp: Date.now() - 6600000,
      status: 'read'
    },
    {
      id: 'msg3-4',
      senderId: 'user1',
      senderName: '当前用户',
      roomId: 'room3',
      content: '我准备了一些设计稿，稍后分享给大家',
      type: 'text',
      timestamp: Date.now() - 6300000,
      status: 'read'
    },
    {
      id: 'msg3-5',
      senderId: 'user4',
      senderName: '王五',
      roomId: 'room3',
      content: '大家对新功能有什么想法？',
      type: 'text',
      timestamp: Date.now() - 3600000,
      status: 'read'
    }
  ]
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // 获取指定时间之前的消息
    const after = searchParams.get('after'); // 获取指定时间之后的消息

    // 获取房间消息
    let messages = mockMessages[roomId] || [];

    // 时间过滤
    if (before) {
      const beforeTime = parseInt(before);
      messages = messages.filter(msg => msg.timestamp < beforeTime);
    }

    if (after) {
      const afterTime = parseInt(after);
      messages = messages.filter(msg => msg.timestamp > afterTime);
    }

    // 按时间排序（最新的在后面）
    messages.sort((a, b) => a.timestamp - b.timestamp);

    // 分页（从最新的消息开始）
    const totalMessages = messages.length;
    const startIndex = Math.max(0, totalMessages - (page * limit));
    const endIndex = totalMessages - ((page - 1) * limit);
    const paginatedMessages = messages.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      messages: paginatedMessages,
      pagination: {
        page,
        limit,
        total: totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
        hasMore: startIndex > 0
      }
    });

  } catch (error) {
    console.error('获取消息失败:', error);
    return NextResponse.json(
      { success: false, error: '获取消息失败' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;
    const body = await request.json();
    const { content, type = 'text', senderId, senderName, receiverId } = body;

    if (!content || !senderId || !senderName) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const newMessage: ChatMessage = {
      id: generateMessageId(),
      senderId,
      senderName,
      receiverId,
      roomId,
      content,
      type,
      timestamp: Date.now(),
      status: 'sent'
    };

    // 添加到消息列表
    if (!mockMessages[roomId]) {
      mockMessages[roomId] = [];
    }
    mockMessages[roomId].push(newMessage);

    // 这里应该通过 WebSocket 广播消息
    // wsManager.broadcastToRoom(roomId, {
    //   type: 'chat_message',
    //   data: newMessage
    // });

    return NextResponse.json({
      success: true,
      message: newMessage
    });

  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json(
      { success: false, error: '发送消息失败' },
      { status: 500 }
    );
  }
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}