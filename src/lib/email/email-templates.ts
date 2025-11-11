/**
 * 邮件模板
 * 用于各种邮件通知
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * 欢迎邮件模板
 */
export function getWelcomeEmail(data: {
  userName: string;
  verificationUrl?: string;
}): EmailTemplate {
  const { userName, verificationUrl } = data;

  return {
    subject: '欢迎加入 OpenAero! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 欢迎加入 OpenAero!</h1>
            </div>
            <div class="content">
              <p>你好 ${userName},</p>
              <p>感谢您注册 OpenAero 平台！我们很高兴您加入我们的社区。</p>
              
              ${verificationUrl ? `
                <p>请点击下面的按钮验证您的邮箱:</p>
                <p style="text-align: center;">
                  <a href="${verificationUrl}" class="button">验证邮箱</a>
                </p>
                <p style="font-size: 12px; color: #666;">
                  如果按钮无法点击，请复制以下链接到浏览器:
                  <br>${verificationUrl}
                </p>
              ` : ''}
              
              <p>在 OpenAero，您可以:</p>
              <ul>
                <li>浏览和购买创新的无人机解决方案</li>
                <li>成为创作者，上传并销售您的方案</li>
                <li>加入活跃的无人机爱好者社区</li>
              </ul>
              
              <p>如有任何问题，请随时联系我们的支持团队。</p>
              
              <p>祝您使用愉快!</p>
              <p><strong>OpenAero 团队</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 OpenAero. All rights reserved.</p>
              <p>如果您没有注册此账户，请忽略此邮件。</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
欢迎加入 OpenAero!

你好 ${userName},

感谢您注册 OpenAero 平台！我们很高兴您加入我们的社区。

${verificationUrl ? `请访问以下链接验证您的邮箱:\n${verificationUrl}\n` : ''}

在 OpenAero，您可以:
- 浏览和购买创新的无人机解决方案
- 成为创作者，上传并销售您的方案
- 加入活跃的无人机爱好者社区

如有任何问题，请随时联系我们的支持团队。

祝您使用愉快!
OpenAero 团队

---
© 2025 OpenAero. All rights reserved.
如果您没有注册此账户，请忽略此邮件。
    `,
  };
}

/**
 * 密码重置邮件模板
 */
export function getPasswordResetEmail(data: {
  userName: string;
  resetUrl: string;
}): EmailTemplate {
  const { userName, resetUrl } = data;

  return {
    subject: 'OpenAero - 重置密码请求',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #f44336; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 重置密码</h1>
            </div>
            <div class="content">
              <p>你好 ${userName},</p>
              <p>我们收到了重置您账户密码的请求。</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">重置密码</a>
              </p>
              
              <p style="font-size: 12px; color: #666;">
                如果按钮无法点击，请复制以下链接到浏览器:
                <br>${resetUrl}
              </p>
              
              <div class="warning">
                <strong>⚠️ 安全提示:</strong>
                <ul style="margin: 10px 0;">
                  <li>此链接将在 1 小时后过期</li>
                  <li>如果您没有请求重置密码，请忽略此邮件</li>
                  <li>不要与任何人分享此链接</li>
                </ul>
              </div>
              
              <p>如有任何疑问，请联系我们的支持团队。</p>
              
              <p><strong>OpenAero 安全团队</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 OpenAero. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
重置密码

你好 ${userName},

我们收到了重置您账户密码的请求。

请访问以下链接重置您的密码:
${resetUrl}

安全提示:
- 此链接将在 1 小时后过期
- 如果您没有请求重置密码，请忽略此邮件
- 不要与任何人分享此链接

如有任何疑问，请联系我们的支持团队。

OpenAero 安全团队

---
© 2025 OpenAero. All rights reserved.
    `,
  };
}

/**
 * 邮箱验证邮件模板
 */
export function getEmailVerificationEmail(data: {
  userName: string;
  verificationUrl: string;
}): EmailTemplate {
  const { userName, verificationUrl } = data;

  return {
    subject: 'OpenAero - 验证您的邮箱地址',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4caf50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #4caf50; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ 验证您的邮箱</h1>
            </div>
            <div class="content">
              <p>你好 ${userName},</p>
              <p>请点击下面的按钮验证您的邮箱地址:</p>
              
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">验证邮箱</a>
              </p>
              
              <p style="font-size: 12px; color: #666;">
                如果按钮无法点击，请复制以下链接到浏览器:
                <br>${verificationUrl}
              </p>
              
              <p>验证邮箱后，您将可以:</p>
              <ul>
                <li>访问完整的平台功能</li>
                <li>购买和下载方案</li>
                <li>申请成为创作者</li>
              </ul>
              
              <p>此链接将在 24 小时后过期。</p>
              
              <p><strong>OpenAero 团队</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 OpenAero. All rights reserved.</p>
              <p>如果您没有注册此账户，请忽略此邮件。</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
验证您的邮箱

你好 ${userName},

请访问以下链接验证您的邮箱地址:
${verificationUrl}

验证邮箱后，您将可以:
- 访问完整的平台功能
- 购买和下载方案
- 申请成为创作者

此链接将在 24 小时后过期。

OpenAero 团队

---
© 2025 OpenAero. All rights reserved.
如果您没有注册此账户，请忽略此邮件。
    `,
  };
}

/**
 * 创作者申请审核通知
 */
export function getCreatorApprovalEmail(data: {
  userName: string;
  approved: boolean;
  reason?: string;
}): EmailTemplate {
  const { userName, approved, reason } = data;

  return {
    subject: approved 
      ? 'OpenAero - 创作者申请已通过! 🎉' 
      : 'OpenAero - 创作者申请需要修改',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${approved ? '#4caf50' : '#ff9800'}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: ${approved ? '#4caf50' : '#ff9800'}; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${approved ? '🎉 恭喜！申请已通过' : '📝 申请需要修改'}</h1>
            </div>
            <div class="content">
              <p>你好 ${userName},</p>
              
              ${approved ? `
                <p>恭喜！您的创作者申请已经通过审核。</p>
                <p>现在您可以:</p>
                <ul>
                  <li>上传和发布您的无人机方案</li>
                  <li>设置方案价格</li>
                  <li>查看销售数据和收益</li>
                  <li>提现您的收益</li>
                </ul>
                <p style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/creators/dashboard" class="button">进入创作者中心</a>
                </p>
              ` : `
                <p>感谢您申请成为 OpenAero 创作者。</p>
                <p>经过审核，您的申请需要进行一些修改:</p>
                <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
                  <strong>审核意见:</strong><br>
                  ${reason || '请完善您的资料信息'}
                </p>
                <p style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/creators/apply" class="button">重新提交申请</a>
                </p>
              `}
              
              <p>如有任何问题，请联系我们的支持团队。</p>
              <p><strong>OpenAero 团队</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 OpenAero. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: approved ? `
恭喜！申请已通过

你好 ${userName},

恭喜！您的创作者申请已经通过审核。

现在您可以:
- 上传和发布您的无人机方案
- 设置方案价格
- 查看销售数据和收益
- 提现您的收益

访问创作者中心: ${process.env.NEXT_PUBLIC_APP_URL}/creators/dashboard

如有任何问题，请联系我们的支持团队。

OpenAero 团队

---
© 2025 OpenAero. All rights reserved.
    ` : `
申请需要修改

你好 ${userName},

感谢您申请成为 OpenAero 创作者。

经过审核，您的申请需要进行一些修改:
${reason || '请完善您的资料信息'}

重新提交申请: ${process.env.NEXT_PUBLIC_APP_URL}/creators/apply

如有任何问题，请联系我们的支持团队。

OpenAero 团队

---
© 2025 OpenAero. All rights reserved.
    `,
  };
}
