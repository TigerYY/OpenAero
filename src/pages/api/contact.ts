import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

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

    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: 实际的邮件发送逻辑
    // await sendContactEmail(validatedData);

    // TODO: 保存到数据库
    // await saveContactSubmission(validatedData);

    res.status(200).json({ 
      success: true, 
      message: '感谢您的咨询，我们会尽快回复您！' 
    });

  } catch (error) {
    console.error('联系表单处理错误:', error);

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

// 发送邮件的函数（待实现）
async function sendContactEmail(data: z.infer<typeof contactFormSchema>) {
  // TODO: 使用邮件服务（如 SendGrid、阿里云邮件推送等）发送邮件
  // 可以发送给管理员，也可以发送确认邮件给用户
}

// 保存到数据库的函数（待实现）
async function saveContactSubmission(data: z.infer<typeof contactFormSchema>) {
  // TODO: 保存联系表单提交记录到数据库
  // 可以用于后续的客户关系管理
}