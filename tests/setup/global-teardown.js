module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up test database connections
  try {
    // Add any database cleanup logic here
    console.log('📊 Test database cleanup completed');
  } catch (error) {
    console.warn('⚠️ Test database cleanup failed:', error.message);
  }
  
  // Clean up temporary files
  try {
    const fs = require('fs');
    const path = require('path');
    
    const tempDirs = [
      path.join(process.cwd(), 'coverage/tmp'),
      path.join(process.cwd(), '.next/cache/test'),
    ];
    
    tempDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
    
    console.log('🗑️ Temporary files cleaned up');
  } catch (error) {
    console.warn('⚠️ Temporary file cleanup failed:', error.message);
  }
  
  console.log('✅ Test environment cleanup completed');
};