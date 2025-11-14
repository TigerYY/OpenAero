import { NextRequest } from 'next/server';

import { z } from 'zod';

import { prisma } from '@/lib/prisma';

import { createErrorResponse, createSuccessResponse, createValidationErrorResponse } from '@/lib/api-helpers';

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
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }
    const session = authResult.session;
    if (!session?.user) {
      return createErrorResponse('未授权', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');
    const documentType = searchParams.get('documentType');

    if (!documentId || !documentType) {
      return createErrorResponse('缺少必要参数', 400);
    }

    // 查找现有的协作会话
    const collaborationSession = await prisma.collaborationSession.findFirst({
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
      return createSuccessResponse({ 
        session: null,
        participants: [],
        operations: []
      }, '未找到协作会话');
    }

    return createSuccessResponse({
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
    }, '获取协作会话成功');

  } catch (error) {
    console.error('获取协作会话失败:', error);
    return createErrorResponse('服务器错误', 500);
  }
}

// POST /api/collaboration - 创建或加入协作会话
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }
    const session = authResult.session;
    if (!session?.user) {
      return createErrorResponse('未授权', 401);
    }

    const body = await request.json();
    const { documentId, documentType } = joinSessionSchema.parse(body);

    // 查找现有会话
    let collaborationSession = await prisma.collaborationSession.findFirst({
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
      collaborationSession = await prisma.collaborationSession.create({
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
        collaborationSession = await prisma.collaborationSession.update({
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

    return createSuccessResponse({
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
    }, '创建/加入协作会话成功');

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }

    console.error('创建/加入协作会话失败:', error);
    return createErrorResponse('服务器错误', 500);
  }
}

// PUT /api/collaboration - 保存协作操作
export async function PUT(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }
    const session = authResult.session;
    if (!session?.user) {
      return createErrorResponse('未授权', 401);
    }

    const body = await request.json();
    const { sessionId, operation } = saveOperationSchema.parse(body);

    // 验证会话是否存在且用户有权限
    const collaborationSession = await prisma.collaborationSession.findFirst({
      where: {
        id: sessionId,
        isActive: true,
        participants: {
          some: { id: session.user.id }
        }
      }
    });

    if (!collaborationSession) {
      return createErrorResponse('协作会话不存在或无权限', 404);
    }

    // 保存操作
    const savedOperation = await prisma.collaborationOperation.create({
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
    await prisma.collaborationSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    return createSuccessResponse({
      operation: savedOperation,
    }, '保存协作操作成功');

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }

    console.error('保存协作操作失败:', error);
    return createErrorResponse('服务器错误', 500);
  }
}

// DELETE /api/collaboration - 离开协作会话
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }
    const session = authResult.session;
    if (!session?.user) {
      return createErrorResponse('未授权', 401);
    }

    const body = await request.json();
    const { sessionId } = leaveSessionSchema.parse(body);

    // 从会话中移除用户
    const collaborationSession = await prisma.collaborationSession.update({
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
      await prisma.collaborationSession.update({
        where: { id: sessionId },
        data: { isActive: false }
      });
    }

    return createSuccessResponse(null, '已离开协作会话');

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }

    console.error('离开协作会话失败:', error);
    return createErrorResponse('服务器错误', 500);
  }
}