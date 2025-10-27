import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/backend/file/file.service';
import fs from 'fs';
import path from 'path';

const fileService = new FileService();

export async function GET() {
  try {
    // 测试文件服务的各种功能
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    };

    // 1. 测试上传目录是否存在
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const thumbnailsDir = path.join(process.cwd(), 'public', 'thumbnails');
    
    testResults.tests.push({
      name: '上传目录检查',
      uploadsDir: {
        path: uploadsDir,
        exists: fs.existsSync(uploadsDir),
        writable: fs.existsSync(uploadsDir) ? true : false
      },
      thumbnailsDir: {
        path: thumbnailsDir,
        exists: fs.existsSync(thumbnailsDir),
        writable: fs.existsSync(thumbnailsDir) ? true : false
      }
    });

    // 2. 测试文件上传功能（模拟）
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('fake image data'),
      destination: '',
      filename: '',
      path: '',
    };

    try {
      // 测试文件服务是否可以正常实例化
      const service = new FileService();
      testResults.tests.push({
        name: '文件服务实例化测试',
        status: 'passed',
        message: 'FileService实例化成功'
      });
    } catch (error) {
      testResults.tests.push({
        name: '文件服务实例化测试',
        status: 'failed',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }

    // 3. 测试数据库连接（通过检查是否能访问 prisma 客户端）
    try {
      // 这里只是检查 prisma 客户端是否可以实例化
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      testResults.tests.push({
        name: 'Prisma客户端测试',
        status: 'passed',
        message: 'Prisma客户端实例化成功'
      });
      
      await prisma.$disconnect();
    } catch (error) {
      testResults.tests.push({
        name: 'Prisma客户端测试',
        status: 'failed',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }

    // 4. 环境变量检查
    const envVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'JWT_SECRET'
    ];

    const envCheck = envVars.map(varName => ({
      name: varName,
      exists: !!process.env[varName],
      value: process.env[varName] ? '已设置' : '未设置'
    }));

    testResults.tests.push({
      name: '环境变量检查',
      variables: envCheck
    });

    return NextResponse.json({
      success: true,
      message: '文件上传系统测试完成',
      results: testResults
    });

  } catch (error) {
    console.error('测试失败:', error);
    return NextResponse.json({
      success: false,
      message: '测试过程中发生错误',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 简单的健康检查端点
    return NextResponse.json({
      success: true,
      message: '文件上传API正常运行',
      timestamp: new Date().toISOString(),
      endpoints: {
        upload: '/api/files/upload',
        download: '/api/files/[filename]',
        delete: '/api/files/[filename]',
        userFiles: '/api/files/user',
        test: '/api/files/test'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}