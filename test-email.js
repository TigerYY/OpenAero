const { EmailService } = require('./src/lib/email-service');

async function testEmail() {
  const emailService = new EmailService();
  
  const result = await emailService.sendVerificationEmail(
    'test@example.com', 
    'http://localhost:3000/auth/verify-email?token=test123'
  );
  
  console.log('邮件发送结果:', result);
}

testEmail().catch(console.error);