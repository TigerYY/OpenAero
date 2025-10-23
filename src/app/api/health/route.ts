import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

// 健康检查响应类型
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      responseTime?: number;
      error?: string;
    };
    api: {
      status: 'operational' | 'degraded' | 'down';
      responseTime: number;
    };
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

// 检查数据库连接
async function checkDatabase() {
  const startTime = Date.now();
  
  try {
    // 简单的数据库查询测试
    await db.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'connected' as const,
      responseTime,
    };
  } catch (error) {
    return {
      status: 'error' as const,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

// 获取内存使用情况
function getMemoryUsage() {
  if (typeof process === 'undefined') {
    return { used: 0, total: 0, percentage: 0 };
  }
  
  const memUsage = process.memoryUsage();
  const total = memUsage.heapTotal;
  const used = memUsage.heapUsed;
  const percentage = Math.round((used / total) * 100);
  
  return {
    used: Math.round(used / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage,
  };
}

// 健康检查端点
export async function GET() {
  const startTime = Date.now();
  
  try {
    // 检查数据库
    const databaseCheck = await checkDatabase();
    
    // 计算API响应时间
    const apiResponseTime = Date.now() - startTime;
    
    // 获取系统信息
    const memory = getMemoryUsage();
    const uptime = process.uptime();
    
    // 确定整体状态
    const isHealthy = databaseCheck.status === 'connected' && apiResponseTime < 1000;
    
    const response: HealthCheckResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: databaseCheck,
        api: {
          status: apiResponseTime < 500 ? 'operational' : apiResponseTime < 1000 ? 'degraded' : 'down',
          responseTime: apiResponseTime,
        },
      },
      uptime: Math.round(uptime),
      memory,
    };
    
    // 根据健康状态返回相应的HTTP状态码
    const statusCode = isHealthy ? 200 : 503;
    
    return NextResponse.json(response, { status: statusCode });
    
  } catch (error) {
    // 如果健康检查本身失败，返回500错误
    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: 'error',
          error: 'Health check failed',
        },
        api: {
          status: 'down',
          responseTime: Date.now() - startTime,
        },
      },
      uptime: process.uptime(),
      memory: getMemoryUsage(),
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// 简单的健康检查端点（用于负载均衡器）
export async function HEAD() {
  try {
    // 快速检查数据库连接
    await db.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
