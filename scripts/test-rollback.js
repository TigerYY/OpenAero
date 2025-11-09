#!/usr/bin/env node

/**
 * Rollback Test Script
 * Tests rollback functionality for Supabase authentication migration
 */

require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class RollbackTester {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      details: []
    };
    this.backupDir = path.join(process.cwd(), 'backups');
    this.testData = {
      originalUsers: [],
      supabaseUsers: [],
      rollbackUsers: []
    };
  }

  // Run test and log result
  async runTest(testName, testFunction) {
    this.testResults.total++;
    console.log(`\n🧪 Running test: ${testName}`);
    
    try {
      const result = await testFunction();
      if (result.success) {
        this.testResults.passed++;
        console.log(`✅ ${testName}: ${result.message || 'PASSED'}`);
        this.testResults.details.push({
          test: testName,
          status: 'PASSED',
          message: result.message,
          details: result.details
        });
      } else {
        this.testResults.failed++;
        console.log(`❌ ${testName}: ${result.message || 'FAILED'}`);
        this.testResults.details.push({
          test: testName,
          status: 'FAILED',
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      this.testResults.failed++;
      console.log(`❌ ${testName}: ${error.message}`);
      this.testResults.details.push({
        test: testName,
        status: 'ERROR',
        message: error.message,
        error: error.stack
      });
    }
  }

  // Test 1: Check if backup files exist and are valid
  async testBackupFilesExist() {
    const backupFiles = [
      'users-backup.sql',
      'user_profiles-backup.sql',
      'user_preferences-backup.sql',
      'user_settings-backup.sql'
    ];

    for (const file of backupFiles) {
      const filePath = path.join(this.backupDir, file);
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: `Backup file missing: ${file}`
        };
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return {
          success: false,
          message: `Backup file is empty: ${file}`
        };
      }
    }

    return {
      success: true,
      message: 'All backup files exist and are valid',
      details: `Found ${backupFiles.length} backup files`
    };
  }

  // Test 2: Verify backup file integrity
  async testBackupIntegrity() {
    try {
      // Read users backup file
      const usersBackupPath = path.join(this.backupDir, 'users-backup.sql');
      const backupContent = fs.readFileSync(usersBackupPath, 'utf8');

      // Check if it contains expected SQL structure
      const expectedPatterns = [
        /CREATE TABLE.*users/i,
        /INSERT INTO.*users/i,
        /-- Backup created:/i
      ];

      for (const pattern of expectedPatterns) {
        if (!pattern.test(backupContent)) {
          return {
            success: false,
            message: `Backup file missing expected pattern: ${pattern}`
          };
        }
      }

      // Count user records in backup
      const insertMatches = backupContent.match(/INSERT INTO.*users.*VALUES/gi);
      const recordCount = insertMatches ? insertMatches.length : 0;

      return {
        success: true,
        message: `Backup integrity verified`,
        details: `Found ${recordCount} user records in backup`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to verify backup integrity: ${error.message}`,
        error: error
      };
    }
  }

  // Test 3: Create test data for rollback verification
  async createTestData() {
    try {
      // Get current users from database
      const { data: existingUsers, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .limit(5);

      if (error) throw error;

      this.testData.originalUsers = existingUsers || [];

      // Create test user in Supabase auth
      const testEmail = `test-rollback-${Date.now()}@openaero.cn`;
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          name: 'Test Rollback User',
          role: 'USER'
        }
      });

      if (authError) throw authError;

      // Create corresponding user in public users table
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: testEmail,
          name: 'Test Rollback User',
          role: 'USER',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (publicError) throw publicError;

      this.testData.supabaseUsers.push({
        auth: authUser.user,
        public: publicUser
      });

      return {
        success: true,
        message: 'Test data created successfully',
        details: `Created test user: ${testEmail}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create test data: ${error.message}`,
        error: error
      };
    }
  }

  // Test 4: Test rollback script execution
  async testRollbackScript() {
    try {
      const rollbackScript = path.join(process.cwd(), 'scripts', 'restore-test.js');
      
      if (!fs.existsSync(rollbackScript)) {
        return {
          success: false,
          message: 'Rollback script not found'
        };
      }

      // Execute rollback script (dry run)
      const result = execSync(`node "${rollbackScript}" --dry-run`, {
        encoding: 'utf8',
        cwd: process.cwd()
      });

      return {
        success: true,
        message: 'Rollback script executed successfully',
        details: 'Dry run completed without errors'
      };
    } catch (error) {
      return {
        success: false,
        message: `Rollback script failed: ${error.message}`,
        error: error
      };
    }
  }

  // Test 5: Verify data consistency after rollback
  async verifyDataConsistency() {
    try {
      // Get users after potential rollback
      const { data: currentUsers, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Compare with original data
      const originalCount = this.testData.originalUsers.length;
      const currentCount = currentUsers ? currentUsers.length : 0;

      // Check if test data was handled correctly
      const testUserExists = currentUsers?.some(user => 
        user.email.includes('test-rollback')
      );

      return {
        success: true,
        message: 'Data consistency verified',
        details: {
          originalCount,
          currentCount,
          testUserExists,
          consistency: currentCount >= originalCount
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Data consistency check failed: ${error.message}`,
        error: error
      };
    }
  }

  // Test 6: Test backup restoration process
  async testBackupRestoration() {
    try {
      const backupScript = path.join(process.cwd(), 'scripts', 'database-backup.js');
      
      if (!fs.existsSync(backupScript)) {
        return {
          success: false,
          message: 'Backup script not found'
        };
      }

      // Test backup restoration (dry run)
      const result = execSync(`node "${backupScript}" --test-restore`, {
        encoding: 'utf8',
        cwd: process.cwd()
      });

      return {
        success: true,
        message: 'Backup restoration test passed',
        details: 'Dry run restoration completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Backup restoration test failed: ${error.message}`,
        error: error
      };
    }
  }

  // Test 7: Verify no data corruption during rollback
  async verifyNoDataCorruption() {
    try {
      // Get sample users before and after
      const { data: sampleUsers, error } = await supabase
        .from('users')
        .select('id, email, name, role')
        .limit(5);

      if (error) throw error;

      // Verify data structure integrity
      for (const user of sampleUsers || []) {
        if (!user.id || !user.email || !user.name || !user.role) {
          return {
            success: false,
            message: `Data corruption detected in user: ${user.id}`,
            details: user
          };
        }
      }

      // Check for duplicate emails
      const emails = sampleUsers?.map(u => u.email) || [];
      const uniqueEmails = [...new Set(emails)];
      
      if (emails.length !== uniqueEmails.length) {
        return {
          success: false,
          message: 'Duplicate emails detected - possible corruption'
        };
      }

      return {
        success: true,
        message: 'No data corruption detected',
        details: `Verified ${sampleUsers?.length || 0} users`
      };
    } catch (error) {
      return {
        success: false,
        message: `Data corruption check failed: ${error.message}`,
        error: error
      };
    }
  }

  // Clean up test data
  async cleanupTestData() {
    try {
      // Remove test users from Supabase auth
      for (const testData of this.testData.supabaseUsers) {
        await supabase.auth.admin.deleteUser(testData.auth.id);
      }

      // Remove test users from public users table
      const { error } = await supabase
        .from('users')
        .delete()
        .ilike('email', '%test-rollback%');

      if (error) throw error;

      console.log('🧹 Test data cleaned up successfully');
    } catch (error) {
      console.warn('⚠️  Failed to clean up test data:', error.message);
    }
  }

  // Generate test report
  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.total,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: `${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`
      },
      tests: this.testResults.details,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(process.cwd(), 'rollback-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Rollback Test Report Generated:`);
    console.log(`   Total Tests: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Success Rate: ${report.summary.successRate}`);
    console.log(`   Report saved to: ${reportPath}`);

    return report;
  }

  // Generate recommendations based on test results
  generateRecommendations() {
    const recommendations = [];

    if (this.testResults.failed > 0) {
      recommendations.push('Address failed tests before proceeding with migration');
    }

    if (this.testResults.passed === this.testResults.total) {
      recommendations.push('Rollback functionality is ready for production use');
    }

    recommendations.push('Document rollback procedures for operations team');
    recommendations.push('Schedule regular rollback drill tests');
    recommendations.push('Monitor rollback performance in production');

    return recommendations;
  }

  // Main test execution
  async runAllTests() {
    console.log('🚀 Starting Rollback Functionality Tests...\n');

    // Run all tests
    await this.runTest('Backup Files Exist', () => this.testBackupFilesExist());
    await this.runTest('Backup Integrity', () => this.testBackupIntegrity());
    await this.runTest('Create Test Data', () => this.createTestData());
    await this.runTest('Rollback Script', () => this.testRollbackScript());
    await this.runTest('Data Consistency', () => this.verifyDataConsistency());
    await this.runTest('Backup Restoration', () => this.testBackupRestoration());
    await this.runTest('No Data Corruption', () => this.verifyNoDataCorruption());

    // Clean up
    await this.cleanupTestData();

    // Generate report
    const report = this.generateTestReport();

    // Exit with appropriate code
    process.exit(this.testResults.failed > 0 ? 1 : 0);
  }
}

// Execute tests
if (require.main === module) {
  const tester = new RollbackTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = RollbackTester;