const { execSync } = require('child_process');

module.exports = async () => {
  console.log('🚀 Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  
  // Setup test database if needed
  try {
    // You can add database setup logic here
    console.log('📊 Test database setup completed');
  } catch (error) {
    console.warn('⚠️ Test database setup skipped:', error.message);
  }
  
  // Clear any existing test artifacts
  try {
    execSync('rm -rf coverage/tmp', { stdio: 'ignore' });
    console.log('🧹 Cleaned up test artifacts');
  } catch (error) {
    // Ignore cleanup errors
  }
  
  console.log('✅ Test environment setup completed');
};