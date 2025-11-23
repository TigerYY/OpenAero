/**
 * SMTP 邮件服务
 * 使用腾讯企业邮箱发送邮件
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// SMTP 配置
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.exmail.qq.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'support@openaero.cn',
    pass: process.env.SMTP_PASS || 'zdM469e7q3ZU2gy7',
  },
};

// 发件人信息
const SENDER = {
  email: process.env.SMTP_SENDER_EMAIL || 'support@openaero.cn',
  name: process.env.SMTP_SENDER_NAME || 'OpenAero',
};

/**
 * 创建邮件传输器
 */
function createTransporter(): Transporter {
  return nodemailer.createTransporter(SMTP_CONFIG);
}

/**
 * 邮件选项接口
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

/**
 * 发送邮件
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `${SENDER.name} <${SENDER.email}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV === 'development') {
      console.log('邮件发送成功:', info.messageId);}
    return true;
  } catch (error) {
    console.error('邮件发送失败:', error);
    return false;
  }
}

/**
 * 发送邮箱验证邮件
 */
export async function sendVerificationEmail(
  email: string,
  verificationUrl: string,
  userName?: string
): Promise<boolean> {
  const subject = '验证您的 OpenAero 账户';
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #2563eb;
          font-size: 28px;
          margin: 0;
        }
        .content {
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          background: #2563eb;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 500;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>开元空御 OpenAero</h1>
        </div>
        <div class="content">
          <h2>欢迎加入 OpenAero！</h2>
          <p>您好${userName ? ` ${userName}` : ''}，</p>
          <p>感谢您注册 OpenAero 账户。请点击下面的按钮验证您的邮箱地址：</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">验证邮箱</a>
          </div>
          <p>或者复制以下链接到浏览器中打开：</p>
          <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
          <p style="color: #666; font-size: 14px;">此链接将在 24 小时后过期。</p>
        </div>
        <div class="footer">
          <p>这是一封自动发送的邮件，请勿直接回复。</p>
          <p>如有疑问，请联系 <a href="mailto:support@openaero.cn">support@openaero.cn</a></p>
          <p>&copy; 2024 OpenAero. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName?: string
): Promise<boolean> {
  const subject = '重置您的 OpenAero 密码';
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #2563eb;
          font-size: 28px;
          margin: 0;
        }
        .content {
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          background: #2563eb;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 500;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>开元空御 OpenAero</h1>
        </div>
        <div class="content">
          <h2>重置密码请求</h2>
          <p>您好${userName ? ` ${userName}` : ''}，</p>
          <p>我们收到了重置您账户密码的请求。请点击下面的按钮设置新密码：</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">重置密码</a>
          </div>
          <p>或者复制以下链接到浏览器中打开：</p>
          <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
          <div class="warning">
            <p style="margin: 0;"><strong>安全提示：</strong></p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>此链接将在 1 小时后过期</li>
              <li>如果您没有请求重置密码，请忽略此邮件</li>
              <li>为了账户安全，请勿将此链接分享给他人</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>这是一封自动发送的邮件，请勿直接回复。</p>
          <p>如有疑问，请联系 <a href="mailto:support@openaero.cn">support@openaero.cn</a></p>
          <p>&copy; 2024 OpenAero. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * 发送欢迎邮件
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string
): Promise<boolean> {
  const subject = '欢迎来到 OpenAero！';
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #2563eb;
          font-size: 28px;
          margin: 0;
        }
        .content {
          margin: 30px 0;
        }
        .feature-list {
          background: #f3f4f6;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .feature-list li {
          margin: 10px 0;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>开元空御 OpenAero</h1>
        </div>
        <div class="content">
          <h2>欢迎，${userName}！</h2>
          <p>感谢您验证邮箱并正式加入 OpenAero 社区！</p>
          <p>在 OpenAero，您可以：</p>
          <div class="feature-list">
            <ul>
              <li>🎯 浏览和购买创新的无人机解决方案</li>
              <li>📝 成为创作者，上传并销售您的方案</li>
              <li>💬 参与社区讨论，分享经验</li>
              <li>🏭 如果您是工厂，可以参与试产订单</li>
            </ul>
          </div>
          <p>立即开始探索吧！</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
               style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
              访问 OpenAero
            </a>
          </div>
        </div>
        <div class="footer">
          <p>如有任何问题，欢迎随时联系我们。</p>
          <p>邮箱: <a href="mailto:support@openaero.cn">support@openaero.cn</a></p>
          <p>&copy; 2024 OpenAero. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * 发送角色变更通知邮件
 */
export async function sendRoleChangeEmail(
  email: string,
  userName: string,
  newRole: string,
  oldRole: string
): Promise<boolean> {
  const roleNames: Record<string, string> = {
    USER: '普通用户',
    CREATOR: '创作者',
    REVIEWER: '审核员',
    FACTORY_MANAGER: '工厂管理员',
    ADMIN: '管理员',
    SUPER_ADMIN: '超级管理员',
  };

  const subject = '您的账户角色已变更';
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #2563eb;
          font-size: 28px;
          margin: 0;
        }
        .role-change {
          background: #eff6ff;
          border-left: 4px solid #2563eb;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>开元空御 OpenAero</h1>
        </div>
        <div class="content">
          <h2>角色变更通知</h2>
          <p>您好 ${userName}，</p>
          <p>您的 OpenAero 账户角色已被更新。</p>
          <div class="role-change">
            <p><strong>原角色：</strong>${roleNames[oldRole] || oldRole}</p>
            <p><strong>新角色：</strong>${roleNames[newRole] || newRole}</p>
          </div>
          <p>如果您对此变更有任何疑问，请联系我们的支持团队。</p>
        </div>
        <div class="footer">
          <p>如有疑问，请联系 <a href="mailto:support@openaero.cn">support@openaero.cn</a></p>
          <p>&copy; 2024 OpenAero. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * 发送用户状态变更通知邮件
 */
export async function sendStatusChangeNotification(
  email: string,
  userName: string,
  newStatus: string,
  oldStatus: string,
  reason?: string
): Promise<boolean> {
  const statusNames: Record<string, { name: string; color: string; icon: string }> = {
    ACTIVE: { name: '活跃', color: '#10b981', icon: '✅' },
    INACTIVE: { name: '未激活', color: '#6b7280', icon: '⏸️' },
    SUSPENDED: { name: '已暂停', color: '#f59e0b', icon: '⚠️' },
    DELETED: { name: '已删除', color: '#ef4444', icon: '❌' },
  };

  const statusInfo = statusNames[newStatus] || { name: newStatus, color: '#6b7280', icon: '❓' };
  const oldStatusInfo = statusNames[oldStatus] || { name: oldStatus, color: '#6b7280', icon: '❓' };

  // 根据状态确定邮件主题和内容
  let subject = '您的账户状态已变更';
  let statusMessage = '';
  let actionMessage = '';

  if (newStatus === 'SUSPENDED') {
    subject = '您的账户已被暂停';
    statusMessage = '您的账户已被管理员暂停。在暂停期间，您将无法登录或使用平台功能。';
    actionMessage = reason 
      ? `<p><strong>暂停原因：</strong>${reason}</p>`
      : '<p>如有疑问，请联系我们的支持团队了解详情。</p>';
  } else if (newStatus === 'DELETED') {
    subject = '您的账户已被删除';
    statusMessage = '您的账户已被管理员删除。您将无法再访问平台。';
    actionMessage = reason 
      ? `<p><strong>删除原因：</strong>${reason}</p>`
      : '<p>如有疑问，请联系我们的支持团队。</p>';
  } else if (newStatus === 'ACTIVE' && oldStatus === 'SUSPENDED') {
    subject = '您的账户已恢复';
    statusMessage = '您的账户已被恢复为活跃状态。您现在可以正常使用平台功能了。';
    actionMessage = '<p>欢迎回来！如有任何问题，请随时联系我们。</p>';
  } else if (newStatus === 'ACTIVE' && oldStatus === 'INACTIVE') {
    subject = '您的账户已激活';
    statusMessage = '您的账户已被激活。您现在可以正常使用平台功能了。';
    actionMessage = '<p>欢迎加入 OpenAero！如有任何问题，请随时联系我们。</p>';
  } else {
    statusMessage = `您的账户状态已从"${oldStatusInfo.name}"变更为"${statusInfo.name}"。`;
    actionMessage = reason 
      ? `<p><strong>变更原因：</strong>${reason}</p>`
      : '<p>如有疑问，请联系我们的支持团队。</p>';
  }

  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #2563eb;
          font-size: 28px;
          margin: 0;
        }
        .status-change {
          background: ${newStatus === 'SUSPENDED' || newStatus === 'DELETED' 
            ? '#fef2f2' 
            : newStatus === 'ACTIVE' 
            ? '#f0fdf4' 
            : '#f3f4f6'};
          border-left: 4px solid ${statusInfo.color};
          padding: 20px;
          margin: 20px 0;
          border-radius: 6px;
        }
        .status-badge {
          display: inline-block;
          background: ${statusInfo.color};
          color: #ffffff;
          padding: 6px 12px;
          border-radius: 4px;
          font-weight: 500;
          margin: 5px 0;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 6px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>开元空御 OpenAero</h1>
        </div>
        <div class="content">
          <h2>${subject}</h2>
          <p>您好${userName ? ` ${userName}` : ''}，</p>
          <p>${statusMessage}</p>
          <div class="status-change">
            <p><strong>原状态：</strong><span class="status-badge" style="background: ${oldStatusInfo.color};">${oldStatusInfo.icon} ${oldStatusInfo.name}</span></p>
            <p><strong>新状态：</strong><span class="status-badge" style="background: ${statusInfo.color};">${statusInfo.icon} ${statusInfo.name}</span></p>
          </div>
          ${actionMessage}
          ${(newStatus === 'SUSPENDED' || newStatus === 'DELETED') ? `
          <div class="warning">
            <p style="margin: 0;"><strong>重要提示：</strong></p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>您的所有活跃会话已被终止</li>
              <li>您将无法登录或访问平台</li>
              <li>如有疑问或需要申诉，请联系支持团队</li>
            </ul>
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>这是一封自动发送的邮件，请勿直接回复。</p>
          <p>如有疑问，请联系 <a href="mailto:support@openaero.cn">support@openaero.cn</a></p>
          <p>&copy; 2024 OpenAero. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}
