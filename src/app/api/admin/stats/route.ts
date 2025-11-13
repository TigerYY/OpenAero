import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-helpers';

interface DashboardStats {
  totalUsers: number;
  totalCreators: number;
  totalSolutions: number;
  totalRevenue: number;
  pendingApplications: number;
  todayRegistrations: number;
  todayRevenue: number;
  activeUsers: number;
  monthlyStats: {
    month: string;
    users: number;
    revenue: number;
    solutions: number;
  }[];
  topCategories: {
    name: string;
    count: number;
    revenue: number;
  }[];
  recentActivities: {
    id: string;
    type: 'user_registration' | 'creator_application' | 'solution_purchase' | 'solution_upload';
    user: string;
    description: string;
    timestamp: string;
    amount?: number;
  }[];
}

// GET - 获取仪表盘统计数据
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // 模拟从数据库获取统计数据
    const stats: DashboardStats = {
      totalUsers: 12543,
      totalCreators: 1247,
      totalSolutions: 3456,
      totalRevenue: 234567.89,
      pendingApplications: 23,
      todayRegistrations: 45,
      todayRevenue: 3456.78,
      activeUsers: 8934,
      monthlyStats: [
        { month: '2024-01', users: 1200, revenue: 15000, solutions: 120 },
        { month: '2024-02', users: 1350, revenue: 18500, solutions: 145 },
        { month: '2024-03', users: 1500, revenue: 22000, solutions: 180 },
        { month: '2024-04', users: 1680, revenue: 25500, solutions: 210 },
        { month: '2024-05', users: 1850, revenue: 28000, solutions: 240 },
        { month: '2024-06', users: 2000, revenue: 32000, solutions: 280 }
      ],
      topCategories: [
        { name: 'React组件', count: 450, revenue: 45000 },
        { name: 'Vue.js工具', count: 320, revenue: 32000 },
        { name: 'Node.js后端', count: 280, revenue: 28000 },
        { name: 'Python脚本', count: 250, revenue: 25000 },
        { name: 'UI设计', count: 200, revenue: 20000 }
      ],
      recentActivities: [
        {
          id: '1',
          type: 'user_registration',
          user: '张三',
          description: '新用户注册',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          type: 'solution_purchase',
          user: '李四',
          description: '购买了"React 高级组件库"',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          amount: 299
        },
        {
          id: '3',
          type: 'creator_application',
          user: '王五',
          description: '提交了创作者申请',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          type: 'solution_upload',
          user: '赵六',
          description: '上传了新解决方案"Vue3 状态管理"',
          timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString()
        },
        {
          id: '5',
          type: 'solution_purchase',
          user: '陈七',
          description: '购买了"Python数据分析工具包"',
          timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
          amount: 199
        }
      ]
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// POST - 刷新统计数据
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // TODO: 实际实现中，这里会触发统计数据的重新计算
    // await refreshDashboardStats();

    return NextResponse.json({
      success: true,
      data: {
        message: '统计数据已刷新',
        refreshedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('刷新统计数据失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}