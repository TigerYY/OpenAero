import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: '邮箱是必填项' },
        { status: 400 }
      );
    }

    // 使用时间戳和随机数生成唯一密码，避免重复注册
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const password = `Test${timestamp}${random}!`;

    console.log(`开始测试注册: ${email}, 密码: ${password}`);

    const response = await signUp({
      email,
      password,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          role: 'USER'
        }
      }
    });

    if (response.error) {
      console.error('注册测试失败:', response.error);
      
      // 检查是否是 rate limit 错误
      if (response.error.message?.includes('rate limit')) {
        return NextResponse.json({
          error: '仍然遇到 rate limit 限制',
          details: response.error.message,
          suggestion: '请等待几分钟后重试，或使用不同的邮箱地址测试'
        }, { status: 429 });
      }

      return NextResponse.json(
        { error: response.error.message || '注册失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '注册测试成功，应该只发送了自定义邮件，避免了 Supabase rate limit',
      user: response.user,
      email_sent: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('注册测试错误:', error);
    return NextResponse.json(
      { error: '测试失败，请稍后重试' },
      { status: 500 }
    );
  }
}