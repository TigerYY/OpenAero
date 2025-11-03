import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';

// 验证schemas
const joinSessionSchema = z.object({
  documentId: z.string(),
  documentType: z.enum(['solution', 'document']),
});

const saveOperationSchema = z.object({
  sessionId: z.string(),
  operation: z.object({
    type: z.enum(['insert', 'delete', 'retain']),
    position: z.number(),
    content: z.string().optional(),
    length: z.number().optional(),
  }),
});

const leaveSessionSchema = z.object({
  sessionId: z.string(),
});

// GET /api/collaboration - 获取协作会话信息
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const documentType = searchParams.get('documentType');

    if (!documentId || !documentType) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 查找现有的协作会话
    const collaborationSession = await db.collaborationSession.findFirst({
      where: {
        documentId,
        documentType,
        isActive: true,
      },
      include: {
        participants: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        operations: {
          orderBy: { createdAt: 'asc' },
          take: 100, // 最近100个操作
        }
      }
    });

    if (!collaborationSession) {
      return NextResponse.json({ 
        session: null,
        participants: [],
        operations: []
      });
    }

    return NextResponse.json({
      session: {
        id: collaborationSession.id,
        documentId: collaborationSession.documentId,
        documentType: collaborationSession.documentType,
        createdAt: collaborationSession.createdAt,
        updatedAt: collaborationSession.updatedAt,
      },
      participants: collaborationSession.participants.map(user => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
      })),
      operations: collaborationSession.operations,
    });

  } catch (error) {
    console.error('获取协作会话失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST /api/collaboration - 创建或加入协作会话
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, documentType } = joinSessionSchema.parse(body);

    // 查找现有会话
    let collaborationSession = await db.collaborationSession.findFirst({
      where: {
        documentId,
        documentType,
        isActive: true,
      },
      include: {
        participants: true,
      }
    });

    if (!collaborationSession) {
      // 创建新的协作会话
      collaborationSession = await db.collaborationSession.create({
        data: {
          documentId,
          documentType,
          isActive: true,
          participants: {
            connect: { id: session.user.id }
          }
        },
        include: {
          participants: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      });
    } else {
      // 检查用户是否已经在会话中
      const isParticipant = collaborationSession.participants.some(
        p => p.id === session.user.id
      );

      if (!isParticipant) {
        // 将用户添加到现有会话
        collaborationSession = await db.collaborationSession.update({
          where: { id: collaborationSession.id },
          data: {
            participants: {
              connect: { id: session.user.id }
            }
          },
          include: {
            participants: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        });
      }
    }

    return NextResponse.json({
      session: {
        id: collaborationSession.id,
        documentId: collaborationSession.documentId,
        documentType: collaborationSession.documentType,
        createdAt: collaborationSession.createdAt,
        updatedAt: collaborationSession.updatedAt,
      },
      participants: collaborationSession.participants.map(user => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
      })),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: '数据验证失败', 
        details: error.errors 
      }, { status: 400 });
    }

    console.error('创建/加入协作会话失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PUT /api/collaboration - 保存协作操作
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, operation } = saveOperationSchema.parse(body);

    // 验证会话是否存在且用户有权限
    const collaborationSession = await db.collaborationSession.findFirst({
      where: {
        id: sessionId,
        isActive: true,
        participants: {
          some: { id: session.user.id }
        }
      }
    });

    if (!collaborationSession) {
      return NextResponse.json({ error: '协作会话不存在或无权限' }, { status: 404 });
    }

    // 保存操作
    const savedOperation = await db.collaborationOperation.create({
      data: {
        sessionId,
        userId: session.user.id,
        operationType: operation.type,
        position: operation.position,
        content: operation.content,
        length: operation.length,
      }
    });

    // 更新会话的最后活动时间
    await db.collaborationSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      operation: savedOperation,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: '数据验证失败', 
        details: error.errors 
      }, { status: 400 });
    }

    console.error('保存协作操作失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// DELETE /api/collaboration - 离开协作会话
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = leaveSessionSchema.parse(body);

    // 从会话中移除用户
    const collaborationSession = await db.collaborationSession.update({
      where: { id: sessionId },
      data: {
        participants: {
          disconnect: { id: session.user.id }
        }
      },
      include: {
        participants: true
      }
    });

    // 如果没有参与者了，标记会话为非活跃状态
    if (collaborationSession.participants.length === 0) {
      await db.collaborationSession.update({
        where: { id: sessionId },
        data: { isActive: false }
      });
    }

    return NextResponse.json({
      success: true,
      message: '已离开协作会话',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: '数据验证失败', 
        details: error.errors 
      }, { status: 400 });
    }

    console.error('离开协作会话失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}