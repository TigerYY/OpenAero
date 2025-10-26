import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryPercentage = Math.round((memoryUsedMB / memoryTotalMB) * 100);

    // 模拟数据库连接检查
    const databaseStatus = 'connected';
    const databaseResponseTime = Math.floor(Math.random() * 50) + 10; // 10-60ms

    // 模拟API响应时间
    const apiResponseTime = Math.floor(Math.random() * 100) + 20; // 20-120ms

    // 完整的健康检查响应
    const healthCheck = {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: databaseStatus as 'connected' | 'disconnected' | 'error',
          responseTime: databaseResponseTime,
        },
        api: {
          status: 'operational' as 'operational' | 'degraded' | 'down',
          responseTime: apiResponseTime,
        },
      },
      memory: {
        used: memoryUsedMB,
        total: memoryTotalMB,
        percentage: memoryPercentage,
      },
    };

    return NextResponse.json(healthCheck, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        services: {
          database: {
            status: 'error',
            error: 'Health check failed',
          },
          api: {
            status: 'down',
            responseTime: 0,
          },
        },
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
        },
        uptime: 0,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
      },
      { status: 500 }
    );
  }
}