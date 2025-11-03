// 输入验证 API 端点

import { NextRequest, NextResponse } from 'next/server';

import { InputSanitizer } from '@/lib/security';

// POST - 验证和清理输入
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      input, 
      type = 'general',
      options = {}
    } = body;

    // 验证必需字段
    if (input === undefined || input === null) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少必需字段: input' 
        },
        { status: 400 }
      );
    }

    const inputStr = String(input);
    const result: any = {
      original: inputStr,
      sanitized: inputStr,
      isValid: true,
      warnings: [],
      errors: []
    };

    // 根据类型进行验证和清理
    switch (type) {
      case 'html':
        result.sanitized = InputSanitizer.sanitizeHtml(inputStr);
        result.warnings.push('HTML 标签已被转义');
        break;

      case 'sql':
        result.sanitized = InputSanitizer.sanitizeSql(inputStr);
        if (result.sanitized !== inputStr) {
          result.warnings.push('检测到潜在的 SQL 注入字符，已清理');
        }
        break;

      case 'path':
        result.sanitized = InputSanitizer.sanitizePath(inputStr);
        if (result.sanitized !== inputStr) {
          result.warnings.push('检测到路径遍历字符，已清理');
        }
        break;

      case 'email':
        result.sanitized = InputSanitizer.sanitizeInput(inputStr, { trim: true });
        result.isValid = InputSanitizer.validateEmail(result.sanitized);
        if (!result.isValid) {
          result.errors.push('邮箱格式无效');
        }
        break;

      case 'password':
        const validation = InputSanitizer.validatePassword(inputStr);
        result.isValid = validation.isValid;
        result.score = validation.score;
        result.feedback = validation.feedback;
        result.sanitized = inputStr; // 密码不进行清理，只验证
        if (!validation.isValid) {
          result.errors.push(...validation.feedback);
        }
        break;

      case 'general':
      default:
        result.sanitized = InputSanitizer.sanitizeInput(inputStr, {
          maxLength: options.maxLength || 1000,
          trim: options.trim !== false,
          allowedChars: options.allowedChars
        });
        
        if (result.sanitized !== inputStr) {
          result.warnings.push('输入已被清理和格式化');
        }
        break;
    }

    // 检查长度限制
    if (options.maxLength && result.sanitized.length > options.maxLength) {
      result.sanitized = result.sanitized.substring(0, options.maxLength);
      result.warnings.push(`输入已截断至 ${options.maxLength} 字符`);
    }

    // 检查是否为空
    if (options.required && !result.sanitized.trim()) {
      result.isValid = false;
      result.errors.push('此字段为必填项');
    }

    return NextResponse.json({
      success: true,
      type,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('输入验证失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '输入验证失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// GET - 获取验证规则和配置
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      validationTypes: {
        general: {
          description: '通用输入清理',
          options: ['maxLength', 'trim', 'allowedChars', 'required']
        },
        html: {
          description: 'HTML 内容清理，防止 XSS 攻击',
          options: []
        },
        sql: {
          description: 'SQL 注入防护',
          options: []
        },
        path: {
          description: '路径遍历防护',
          options: []
        },
        email: {
          description: '邮箱格式验证',
          options: ['required']
        },
        password: {
          description: '密码强度验证',
          options: [],
          requirements: [
            '至少8位字符',
            '包含小写字母',
            '包含大写字母',
            '包含数字',
            '包含特殊字符'
          ]
        }
      },
      securityFeatures: [
        'XSS 防护',
        'SQL 注入防护',
        '路径遍历防护',
        '输入长度限制',
        '字符过滤',
        '邮箱格式验证',
        '密码强度检查'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取验证配置失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取验证配置失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}