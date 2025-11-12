// 安全审计 API 端点

import { NextRequest, NextResponse } from 'next/server';

import { securityAudit } from '@/lib/security';

// GET - 获取安全审计报告
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const format = searchParams.get('format') || 'json';

    // 构建时间范围
    const timeRange = startDate && endDate ? {
      start: startDate,
      end: endDate
    } : undefined;

    // 获取安全报告
    const report = securityAudit.getSecurityReport(timeRange);

    // 根据格式返回数据
    if (format === 'csv') {
      const csv = generateCSVReport(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="security-audit.csv"'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取安全审计报告失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取安全审计报告失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// POST - 记录安全事件
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      resource,
      success = true,
      riskLevel = 'low',
      userId,
      details = {}
    } = body;

    // 验证必需字段
    if (!action || !resource) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少必需字段: action, resource' 
        },
        { status: 400 }
      );
    }

    // 获取请求信息
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || '';

    // 记录安全事件
    securityAudit.logSecurityEvent({
      action,
      resource,
      ip,
      userAgent,
      success,
      riskLevel,
      userId,
      details
    });

    return NextResponse.json({
      success: true,
      message: '安全事件已记录',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('记录安全事件失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '记录安全事件失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 生成 CSV 报告
function generateCSVReport(report: any): string {
  const headers = [
    'Timestamp',
    'Action',
    'Resource',
    'IP',
    'User ID',
    'Success',
    'Risk Level',
    'User Agent'
  ];

  const rows = report.logs.map((log: any) => [
    log.timestamp,
    log.action,
    log.resource,
    log.ip,
    log.userId || '',
    log.success ? 'Yes' : 'No',
    log.riskLevel,
    log.userAgent
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}