// 数据加密 API 端点

import { NextRequest, NextResponse } from 'next/server';
import { dataEncryption } from '@/lib/security';

// POST - 加密数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, operation = 'encrypt' } = body;

    // 验证必需字段
    if (!data) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少必需字段: data' 
        },
        { status: 400 }
      );
    }

    // 验证操作类型
    if (!['encrypt', 'decrypt', 'hash', 'verify'].includes(operation)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '无效的操作类型，支持: encrypt, decrypt, hash, verify' 
        },
        { status: 400 }
      );
    }

    let result: any = {};

    switch (operation) {
      case 'encrypt':
        result.encrypted = dataEncryption.encrypt(data);
        break;

      case 'decrypt':
        try {
          result.decrypted = dataEncryption.decrypt(data);
        } catch (error) {
          return NextResponse.json(
            { 
              success: false, 
              error: '解密失败，请检查数据格式',
              details: error instanceof Error ? error.message : '未知错误'
            },
            { status: 400 }
          );
        }
        break;

      case 'hash':
        const { salt } = body;
        result.hash = dataEncryption.hash(data, salt);
        break;

      case 'verify':
        const { hash } = body;
        if (!hash) {
          return NextResponse.json(
            { 
              success: false, 
              error: '验证操作需要提供 hash 字段' 
            },
            { status: 400 }
          );
        }
        result.verified = dataEncryption.verifyHash(data, hash);
        break;
    }

    return NextResponse.json({
      success: true,
      operation,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('加密操作失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '加密操作失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// GET - 获取加密配置信息（不包含敏感信息）
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      config: {
        supportedOperations: ['encrypt', 'decrypt', 'hash', 'verify'],
        algorithm: 'aes-256-cbc',
        hashAlgorithm: 'pbkdf2',
        keyDerivation: {
          iterations: 100000,
          digest: 'sha512'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取加密配置失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取加密配置失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}