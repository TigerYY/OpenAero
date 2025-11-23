import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { emailService } from '@/lib/email-service';

// 联系表单数据验证模式
const contactFormSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符').max(50, '姓名不能超过50个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  company: z.string().optional(),
  phone: z.string().optional(),
  subject: z.string().min(5, '主题至少需要5个字符').max(100, '主题不能超过100个字符'),
  message: z.string().min(10, '留言内容至少需要10个字符').max(1000, '留言内容不能超过1000个字符'),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 验证请求数据
    const validatedData = contactFormSchema.parse(req.body);

    // 这里可以添加实际的处理逻辑，比如：
    // 1. 发送邮件通知
    // 2. 保存到数据库
    // 3. 发送到第三方服务（如 Slack、钉钉等）

    console.log('收到联系表单提交:', {
      ...validatedData,
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    // 发送邮件通知给管理员
    try {
      await sendContactEmail(validatedData);
    } catch (emailError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('发送联系邮件失败:', emailError);}
      // 邮件发送失败不影响表单提交，只记录日志
    }

    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: 保存到数据库
    // await saveContactSubmission(validatedData);

    res.status(200).json({ 
      success: true, 
      message: '感谢您的咨询，我们会尽快回复您！' 
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('联系表单处理错误:', error);}

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: '数据验证失败',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    res.status(500).json({ 
      error: '服务器内部错误，请稍后重试' 
    });
  }
}

// 发送邮件的函数
async function sendContactEmail(data: z.infer<typeof contactFormSchema>) {
  try {
    // 发送给管理员的邮件
    const adminEmail = process.env.ADMIN_EMAIL || 'support@openaero.cn';
    
    const adminHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>新的联系表单提交</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #555; }
          .value { background: #f9f9f9; padding: 10px; border-radius: 3px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📧 新的联系表单提交</h2>
            <p>有用户通过网站联系表单提交了咨询信息：</p>
          </div>
          
          <div class="field">
            <div class="label">姓名：</div>
            <div class="value">${data.name}</div>
          </div>
          
          <div class="field">
            <div class="label">邮箱：</div>
            <div class="value">${data.email}</div>
          </div>
          
          ${data.company ? `
          <div class="field">
            <div class="label">公司：</div>
            <div class="value">${data.company}</div>
          </div>
          ` : ''}
          
          ${data.phone ? `
          <div class="field">
            <div class="label">电话：</div>
            <div class="value">${data.phone}</div>
          </div>
          ` : ''}
          
          <div class="field">
            <div class="label">主题：</div>
            <div class="value">${data.subject}</div>
          </div>
          
          <div class="field">
            <div class="label">留言内容：</div>
            <div class="value" style="white-space: pre-wrap;">${data.message}</div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>提交时间：${new Date().toLocaleString('zh-CN')}</p>
            <p>此邮件由 OpenAero 系统自动发送</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const adminText = `
新的联系表单提交

姓名：${data.name}
邮箱：${data.email}
${data.company ? `公司：${data.company}\n` : ''}${data.phone ? `电话：${data.phone}\n` : ''}主题：${data.subject}

留言内容：
${data.message}

---
提交时间：${new Date().toLocaleString('zh-CN')}
此邮件由 OpenAero 系统自动发送
    `;

    // 发送给管理员
    await emailService.sendEmail({
      to: adminEmail,
      subject: `📧 新的咨询：${data.subject}`,
      html: adminHtml,
      text: adminText,
    });

    // 发送确认邮件给用户
    const userHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>感谢您的咨询</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>感谢您的咨询</h1>
            <p>我们已收到您的联系信息</p>
          </div>
          <div class="content">
            <p>亲爱的 ${data.name}，</p>
            <p>感谢您联系 OpenAero！我们已收到您的咨询，内容如下：</p>
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>咨询主题：${data.subject}</h3>
              <p style="white-space: pre-wrap;">${data.message}</p>
            </div>
            <p>我们会在 24 小时内回复您的咨询。如有紧急事项，请直接致电我们的客服热线。</p>
            <p>再次感谢您的关注！</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              © 2025 OpenAero. 保留所有权利。<br>
              此邮件由系统自动发送，请勿回复。
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const userText = `
感谢您的咨询 - OpenAero

亲爱的 ${data.name}，

感谢您联系 OpenAero！我们已收到您的咨询，内容如下：

咨询主题：${data.subject}

${data.message}

我们会在 24 小时内回复您的咨询。如有紧急事项，请直接致电我们的客服热线。

再次感谢您的关注！

© 2025 OpenAero. 保留所有权利。
此邮件由系统自动发送，请勿回复。
    `;

    await emailService.sendEmail({
      to: data.email,
      subject: '感谢您的咨询 - OpenAero',
      html: userHtml,
      text: userText,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('联系表单邮件发送成功:', {
        to: data.email,
        adminEmail,
        subject: data.subject,
      });};

  } catch (error) {
    console.error('发送联系表单邮件失败:', error);
    throw error;
  }
}

// 保存到数据库的函数（待实现）
async function saveContactSubmission(data: z.infer<typeof contactFormSchema>) {
  // TODO: 保存联系表单提交记录到数据库
  // 可以用于后续的客户关系管理
}