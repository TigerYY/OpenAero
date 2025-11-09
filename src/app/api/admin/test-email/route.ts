import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

/**
 * 测试邮件服务（管理员专用）
 */
export async function POST(request: NextRequest) {
  try {
    const { to, subject, type } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: '收件人邮箱是必填项' },
        { status: 400 }
      );
    }

    // 先测试邮件连接
    const connectionTest = await emailService.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json(
        { error: '邮件服务连接失败: ' + connectionTest.error },
        { status: 500 }
      );
    }

    let result;
    
    if (type === 'verification') {
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?test=true`;
      result = await emailService.sendVerificationEmail(to, verificationUrl);
    } else if (type === 'reset') {
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?test=true`;
      result = await emailService.sendPasswordResetEmail(to, resetUrl);
    } else {
      // 发送自定义测试邮件
      result = await emailService.sendEmail({
        to,
        subject: subject || 'OpenAero 邮件服务测试',
        html: `
          <h2>邮件服务测试成功</h2>
          <p>这是一封来自 OpenAero 的测试邮件。</p>
          <p>如果您收到这封邮件，说明邮件服务配置正确。</p>
          <p>发送时间: ${new Date().toLocaleString('zh-CN')}</p>
        `,
        text: `
          邮件服务测试成功
          
          这是一封来自 OpenAero 的测试邮件。
          
          如果您收到这封邮件，说明邮件服务配置正确。
          
          发送时间: ${new Date().toLocaleString('zh-CN')}
        `
      });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '测试邮件发送成功',
        to,
        subject: subject || 'OpenAero 邮件服务测试'
      });
    } else {
      return NextResponse.json(
        { error: '邮件发送失败: ' + result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('测试邮件服务错误:', error);
    return NextResponse.json(
      { error: '测试邮件服务失败，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * 测试邮件连接
 */
export async function GET() {
  try {
    const result = await emailService.testConnection();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '邮件服务连接正常',
        config: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          secure: process.env.SMTP_SECURE === 'true'
        }
      });
    } else {
      return NextResponse.json(
        { error: '邮件服务连接失败: ' + result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('测试邮件连接错误:', error);
    return NextResponse.json(
      { error: '测试邮件连接失败，请稍后重试' },
      { status: 500 }
    );
  }
}