import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, createSuccessResponse, createErrorResponse, createPaginatedResponse } from '@/lib/api-helpers';

interface CreatorApplication {
  id: string;
  userId: string;
  userName: string;
  email: string;
  specialties: string[];
  experience: string;
  portfolio: string[];
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

// 模拟数据库
const mockApplications: CreatorApplication[] = [
  {
    id: '1',
    userId: 'user_1',
    userName: '王五',
    email: 'wangwu@example.com',
    specialties: ['React', 'Node.js', 'TypeScript'],
    experience: '5年前端开发经验，专注于React生态系统',
    portfolio: ['https://github.com/wangwu/react-components', 'https://wangwu.dev'],
    submittedAt: '2024-01-15T09:00:00Z',
    status: 'pending'
  },
  {
    id: '2',
    userId: 'user_2',
    userName: '陈七',
    email: 'chenqi@example.com',
    specialties: ['Vue.js', 'Python', 'Django'],
    experience: '4年全栈开发经验，熟悉Vue.js和Python',
    portfolio: ['https://github.com/chenqi/vue-admin', 'https://chenqi.com'],
    submittedAt: '2024-01-15T08:30:00Z',
    status: 'pending'
  },
  {
    id: '3',
    userId: 'user_3',
    userName: '刘八',
    email: 'liuba@example.com',
    specialties: ['Angular', 'Java', 'Spring'],
    experience: '6年企业级应用开发经验',
    portfolio: ['https://github.com/liuba/angular-enterprise'],
    submittedAt: '2024-01-15T08:00:00Z',
    status: 'pending'
  }
];

// GET - 获取申请列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    let filteredApplications = mockApplications;

    // 按状态筛选
    if (status && status !== 'all') {
      filteredApplications = mockApplications.filter(app => app.status === status);
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedApplications = filteredApplications.slice(startIndex, endIndex);

    return createPaginatedResponse(
      paginatedApplications,
      page,
      limit,
      filteredApplications.length,
      '获取申请列表成功'
    );
  } catch (error) {
    console.error('获取申请列表失败:', error);
    return createErrorResponse(error instanceof Error ? error : new Error('服务器错误'), 500);
  }
}

// PUT - 审核申请
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, action, notes } = body;

    // 验证请求参数
    if (!applicationId || !action || !['approve', 'reject'].includes(action)) {
      return createErrorResponse('无效的请求参数', 400);
    }

    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // 查找申请
    const applicationIndex = mockApplications.findIndex(app => app.id === applicationId);
    if (applicationIndex === -1) {
      return createErrorResponse('申请不存在', 404);
    }

    const application = mockApplications[applicationIndex];
    if (!application || application.status !== 'pending') {
      return createErrorResponse('申请已被处理或不存在', 400);
    }

    // 更新申请状态
    const updatedApplication: CreatorApplication = {
      ...application,
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: authResult.user.id,
      reviewNotes: notes
    };

    mockApplications[applicationIndex] = updatedApplication;

    // TODO: 如果批准，创建创作者档案
    if (action === 'approve') {
      // await createCreatorProfile(application.userId, {
      //   specialties: application.specialties,
      //   experience: application.experience,
      //   portfolio: application.portfolio
      // });
      
      // TODO: 发送批准通知邮件
      console.log(`发送批准通知给 ${application.email}`);
    } else {
      // TODO: 发送拒绝通知邮件
      console.log(`发送拒绝通知给 ${application.email}`);
    }

    return createSuccessResponse(
      { application: updatedApplication },
      `申请已${action === 'approve' ? '批准' : '拒绝'}`
    );
  } catch (error) {
    console.error('审核申请失败:', error);
    return createErrorResponse(error instanceof Error ? error : new Error('服务器错误'), 500);
  }
}

// DELETE - 删除申请
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const applicationId = searchParams.get('id');

    if (!applicationId) {
      return createErrorResponse('缺少申请ID', 400);
    }

    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const applicationIndex = mockApplications.findIndex(app => app.id === applicationId);
    if (applicationIndex === -1) {
      return createErrorResponse('申请不存在', 404);
    }

    // 删除申请
    const deletedApplication = mockApplications.splice(applicationIndex, 1)[0];

    return createSuccessResponse(
      { deletedApplication },
      '申请已删除'
    );
  } catch (error) {
    console.error('删除申请失败:', error);
    return createErrorResponse(error instanceof Error ? error : new Error('服务器错误'), 500);
  }
}