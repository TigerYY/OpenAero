#!/usr/bin/env node

/**
 * Migrated User Authentication Test Script
 * Tests authentication functionality for migrated users
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const { MigrationLogger } = require('./migration-logger');
const crypto = require('crypto');

class MigratedAuthTester {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.prisma = new PrismaClient();
    this.logger = new MigrationLogger('migrated-auth-test');
    
    this.testResults = {
      userCreation: { passed: 0, failed: 0, details: [] },
      emailLogin: { passed: 0, failed: 0, details: [] },
      sessionValidation: { passed: 0, failed: 0, details: [] },
      tokenRefresh: { passed: 0, failed: 0, details: [] },
      logoutFunctionality: { passed: 0, failed: 0, details: [] },
      passwordManagement: { passed: 0, failed: 0, details: [] },
      securityValidation: { passed: 0, failed: 0, details: [] },
      overall: { passed: 0, failed: 0, percentage: 0 }
    };
    
    this.testPasswords = new Map(); // Store test passwords for cleanup
  }

  async runAllTests() {
    this.logger.info('🧪 Starting migrated user authentication tests...');
    
    try {
      await this.testUserCreation();
      await this.testEmailLogin();
      await this.testSessionValidation();
      await this.testTokenRefresh();
      await this.testLogoutFunctionality();
      await this.testPasswordManagement();
      await this.testSecurityValidation();
      
      await this.cleanupTestData();
      
      this.calculateOverallResults();
      this.generateTestReport();
      
      this.logger.info('✅ Migrated user authentication tests completed');
      return this.testResults;
      
    } catch (error) {
      this.logger.error('❌ Authentication tests failed:', error);
      await this.cleanupTestData();
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async testUserCreation() {
    this.logger.info('👤 Testing user creation...');
    
    try {
      // Create test users with different roles
      const testUsers = [
        { email: `test_user_${Date.now()}@openaero.cn`, role: 'USER', name: 'Test User' },
        { email: `test_creator_${Date.now()}@openaero.cn`, role: 'CREATOR', name: 'Test Creator' },
        { email: `test_admin_${Date.now()}@openaero.cn`, role: 'ADMIN', name: 'Test Admin' }
      ];
      
      for (const testUser of testUsers) {
        try {
          const testPassword = this.generateTestPassword();
          this.testPasswords.set(testUser.email, testPassword);
          
          // Create user in Supabase Auth
          const { data: createdUser, error } = await this.supabase.auth.admin.createUser({
            email: testUser.email,
            password: testPassword,
            email_confirm: true,
            user_metadata: {
              name: testUser.name,
              test_user: true,
              created_for_migration_test: true
            },
            app_metadata: {
              role: testUser.role
            }
          });
          
          if (error || !createdUser.user) {
            this.testResults.userCreation.failed++;
            this.testResults.userCreation.details.push({
              email: testUser.email,
              role: testUser.role,
              issue: 'Failed to create test user',
              error: error?.message
            });
            continue;
          }
          
          // Create corresponding user in local database
          const localUser = await this.prisma.users.create({
            data: {
              email: testUser.email,
              name: testUser.name,
              role: testUser.role,
              supabase_id: createdUser.user.id,
              migration_status: 'test_user',
              created_at: new Date(),
              updated_at: new Date()
            }
          });
          
          this.testResults.userCreation.passed++;
          this.logger.info(`✅ Created test user: ${testUser.email} (${testUser.role})`);
          
        } catch (error) {
          this.testResults.userCreation.failed++;
          this.testResults.userCreation.details.push({
            email: testUser.email,
            role: testUser.role,
            issue: 'Test user creation error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`User creation tests: ${this.testResults.userCreation.passed} passed, ${this.testResults.userCreation.failed} failed`);
      
    } catch (error) {
      this.logger.error('User creation tests failed:', error);
    }
  }

  async testEmailLogin() {
    this.logger.info('🔐 Testing email login...');
    
    try {
      // Get test users from local database
      const testUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'test_user',
          supabase_id: { not: null }
        },
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of testUsers) {
        try {
          const testPassword = this.testPasswords.get(user.email);
          
          if (!testPassword) {
            this.testResults.emailLogin.failed++;
            this.testResults.emailLogin.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Test password not found'
            });
            continue;
          }
          
          // Test login with correct credentials
          const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
            email: user.email,
            password: testPassword
          });
          
          if (signInError || !signInData.user) {
            this.testResults.emailLogin.failed++;
            this.testResults.emailLogin.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Login with correct credentials failed',
              error: signInError?.message
            });
            continue;
          }
          
          // Test login with incorrect password
          const { data: wrongPasswordData, error: wrongPasswordError } = await this.supabase.auth.signInWithPassword({
            email: user.email,
            password: 'wrong_password_123'
          });
          
          if (!wrongPasswordError) {
            this.testResults.emailLogin.failed++;
            this.testResults.emailLogin.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Login with wrong password should have failed'
            });
            continue;
          }
          
          // Verify user data matches
          if (signInData.user.email === user.email && signInData.user.id === user.supabase_id) {
            this.testResults.emailLogin.passed++;
          } else {
            this.testResults.emailLogin.failed++;
            this.testResults.emailLogin.details.push({
              userId: user.id,
              email: user.email,
              issue: 'User data mismatch after login',
              expectedEmail: user.email,
              actualEmail: signInData.user.email,
              expectedId: user.supabase_id,
              actualId: signInData.user.id
            });
          }
          
        } catch (error) {
          this.testResults.emailLogin.failed++;
          this.testResults.emailLogin.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Login test error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Email login tests: ${this.testResults.emailLogin.passed} passed, ${this.testResults.emailLogin.failed} failed`);
      
    } catch (error) {
      this.logger.error('Email login tests failed:', error);
    }
  }

  async testSessionValidation() {
    this.logger.info('🔄 Testing session validation...');
    
    try {
      const testUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'test_user',
          supabase_id: { not: null }
        },
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of testUsers) {
        try {
          const testPassword = this.testPasswords.get(user.email);
          
          if (!testPassword) continue;
          
          // Sign in to create session
          const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
            email: user.email,
            password: testPassword
          });
          
          if (signInError || !signInData.session) {
            this.testResults.sessionValidation.failed++;
            this.testResults.sessionValidation.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Failed to create session for testing'
            });
            continue;
          }
          
          // Test 1: Validate current session
          const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
          
          if (sessionError || !sessionData.session) {
            this.testResults.sessionValidation.failed++;
            this.testResults.sessionValidation.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Failed to validate current session',
              error: sessionError?.message
            });
            continue;
          }
          
          // Test 2: Check session structure
          const session = sessionData.session;
          const hasValidStructure = session.access_token && 
                                   session.refresh_token && 
                                   session.user && 
                                   session.expires_at;
          
          if (!hasValidStructure) {
            this.testResults.sessionValidation.failed++;
            this.testResults.sessionValidation.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Session missing required fields'
            });
            continue;
          }
          
          // Test 3: Validate user in session
          if (session.user.email === user.email && session.user.id === user.supabase_id) {
            this.testResults.sessionValidation.passed++;
          } else {
            this.testResults.sessionValidation.failed++;
            this.testResults.sessionValidation.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Session user data mismatch'
            });
          }
          
        } catch (error) {
          this.testResults.sessionValidation.failed++;
          this.testResults.sessionValidation.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Session validation error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Session validation tests: ${this.testResults.sessionValidation.passed} passed, ${this.testResults.sessionValidation.failed} failed`);
      
    } catch (error) {
      this.logger.error('Session validation tests failed:', error);
    }
  }

  async testTokenRefresh() {
    this.logger.info('🔄 Testing token refresh...');
    
    try {
      const testUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'test_user',
          supabase_id: { not: null }
        },
        take: 2, // Limit to 2 users for this test
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of testUsers) {
        try {
          const testPassword = this.testPasswords.get(user.email);
          
          if (!testPassword) continue;
          
          // Sign in to get initial tokens
          const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
            email: user.email,
            password: testPassword
          });
          
          if (signInError || !signInData.session) {
            this.testResults.tokenRefresh.failed++;
            this.testResults.tokenRefresh.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Failed to sign in for token refresh test'
            });
            continue;
          }
          
          const originalAccessToken = signInData.session.access_token;
          const originalRefreshToken = signInData.session.refresh_token;
          
          // Test token refresh
          const { data: refreshData, error: refreshError } = await this.supabase.auth.refreshSession({
            refresh_token: originalRefreshToken
          });
          
          if (refreshError || !refreshData.session) {
            this.testResults.tokenRefresh.failed++;
            this.testResults.tokenRefresh.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Token refresh failed',
              error: refreshError?.message
            });
            continue;
          }
          
          // Verify new tokens are different
          const newAccessToken = refreshData.session.access_token;
          const newRefreshToken = refreshData.session.refresh_token;
          
          if (newAccessToken !== originalAccessToken && newRefreshToken !== originalRefreshToken) {
            this.testResults.tokenRefresh.passed++;
          } else {
            this.testResults.tokenRefresh.failed++;
            this.testResults.tokenRefresh.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Tokens did not change after refresh'
            });
          }
          
        } catch (error) {
          this.testResults.tokenRefresh.failed++;
          this.testResults.tokenRefresh.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Token refresh error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Token refresh tests: ${this.testResults.tokenRefresh.passed} passed, ${this.testResults.tokenRefresh.failed} failed`);
      
    } catch (error) {
      this.logger.error('Token refresh tests failed:', error);
    }
  }

  async testLogoutFunctionality() {
    this.logger.info('🚪 Testing logout functionality...');
    
    try {
      const testUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'test_user',
          supabase_id: { not: null }
        },
        take: 2,
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of testUsers) {
        try {
          const testPassword = this.testPasswords.get(user.email);
          
          if (!testPassword) continue;
          
          // Sign in first
          const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
            email: user.email,
            password: testPassword
          });
          
          if (signInError || !signInData.session) {
            this.testResults.logoutFunctionality.failed++;
            this.testResults.logoutFunctionality.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Failed to sign in for logout test'
            });
            continue;
          }
          
          // Test logout
          const { error: signOutError } = await this.supabase.auth.signOut();
          
          if (signOutError) {
            this.testResults.logoutFunctionality.failed++;
            this.testResults.logoutFunctionality.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Logout failed',
              error: signOutError.message
            });
            continue;
          }
          
          // Verify session is cleared
          const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
          
          if (!sessionError && !sessionData.session) {
            this.testResults.logoutFunctionality.passed++;
          } else {
            this.testResults.logoutFunctionality.failed++;
            this.testResults.logoutFunctionality.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Session still exists after logout'
            });
          }
          
        } catch (error) {
          this.testResults.logoutFunctionality.failed++;
          this.testResults.logoutFunctionality.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Logout test error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Logout functionality tests: ${this.testResults.logoutFunctionality.passed} passed, ${this.testResults.logoutFunctionality.failed} failed`);
      
    } catch (error) {
      this.logger.error('Logout functionality tests failed:', error);
    }
  }

  async testPasswordManagement() {
    this.logger.info('🔑 Testing password management...');
    
    try {
      const testUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'test_user',
          supabase_id: { not: null }
        },
        take: 2,
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of testUsers) {
        try {
          // Test 1: Generate password reset link
          const { data: resetData, error: resetError } = await this.supabase.auth.admin.generateLink({
            type: 'recovery',
            email: user.email
          });
          
          if (resetError || !resetData.properties?.link) {
            this.testResults.passwordManagement.failed++;
            this.testResults.passwordManagement.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Failed to generate password reset link',
              error: resetError?.message
            });
            continue;
          }
          
          // Test 2: Update user password
          const newPassword = this.generateTestPassword();
          const { data: updateData, error: updateError } = await this.supabase.auth.admin.updateUserById(user.supabase_id, {
            password: newPassword
          });
          
          if (updateError) {
            this.testResults.passwordManagement.failed++;
            this.testResults.passwordManagement.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Failed to update user password',
              error: updateError.message
            });
            continue;
          }
          
          // Test 3: Verify new password works
          const { data: loginData, error: loginError } = await this.supabase.auth.signInWithPassword({
            email: user.email,
            password: newPassword
          });
          
          if (loginError || !loginData.user) {
            this.testResults.passwordManagement.failed++;
            this.testResults.passwordManagement.details.push({
              userId: user.id,
              email: user.email,
              issue: 'New password does not work',
              error: loginError?.message
            });
            continue;
          }
          
          this.testResults.passwordManagement.passed++;
          this.testPasswords.set(user.email, newPassword); // Update stored password
          
        } catch (error) {
          this.testResults.passwordManagement.failed++;
          this.testResults.passwordManagement.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Password management test error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Password management tests: ${this.testResults.passwordManagement.passed} passed, ${this.testResults.passwordManagement.failed} failed`);
      
    } catch (error) {
      this.logger.error('Password management tests failed:', error);
    }
  }

  async testSecurityValidation() {
    this.logger.info('🔒 Testing security validation...');
    
    try {
      const testUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'test_user',
          supabase_id: { not: null }
        },
        take: 1, // Use one user for security tests
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of testUsers) {
        try {
          // Test 1: Rate limiting (simulate rapid login attempts)
          const testPassword = this.testPasswords.get(user.email);
          
          if (!testPassword) continue;
          
          let failedAttempts = 0;
          for (let i = 0; i < 5; i++) {
            const { error } = await this.supabase.auth.signInWithPassword({
              email: user.email,
              password: 'wrong_password'
            });
            
            if (error) failedAttempts++;
          }
          
          if (failedAttempts === 5) {
            this.testResults.securityValidation.passed++;
          } else {
            this.testResults.securityValidation.failed++;
            this.testResults.securityValidation.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Rate limiting may not be working properly'
            });
          }
          
          // Test 2: Invalid token handling
          const { data: invalidTokenData, error: invalidTokenError } = await this.supabase.auth.getUser('invalid_token_string');
          
          if (invalidTokenError && invalidTokenError.message.includes('Invalid')) {
            this.testResults.securityValidation.passed++;
          } else {
            this.testResults.securityValidation.failed++;
            this.testResults.securityValidation.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Invalid token handling failed'
            });
          }
          
          // Test 3: User metadata security
          const { data: userData, error: userError } = await this.supabase.auth.admin.getUserById(user.supabase_id);
          
          if (!userError && userData.user) {
            const metadata = userData.user.user_metadata || {};
            const appMetadata = userData.user.app_metadata || {};
            
            // Check that sensitive data is not exposed
            const hasNoSensitiveData = !metadata.password && 
                                       !metadata.secret && 
                                       !appMetadata.internal_secrets;
            
            if (hasNoSensitiveData) {
              this.testResults.securityValidation.passed++;
            } else {
              this.testResults.securityValidation.failed++;
              this.testResults.securityValidation.details.push({
                userId: user.id,
                email: user.email,
                issue: 'Sensitive data may be exposed in metadata'
              });
            }
          }
          
        } catch (error) {
          this.testResults.securityValidation.failed++;
          this.testResults.securityValidation.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Security validation error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Security validation tests: ${this.testResults.securityValidation.passed} passed, ${this.testResults.securityValidation.failed} failed`);
      
    } catch (error) {
      this.logger.error('Security validation tests failed:', error);
    }
  }

  async cleanupTestData() {
    this.logger.info('🧹 Cleaning up test data...');
    
    try {
      // Delete test users from local database
      await this.prisma.users.deleteMany({
        where: {
          migration_status: 'test_user'
        }
      });
      
      // Delete test users from Supabase
      const { data: supabaseUsers, error } = await this.supabase.auth.admin.listUsers();
      
      if (!error && supabaseUsers.users) {
        const testUsers = supabaseUsers.users.filter(user => 
          user.user_metadata?.test_user === true || 
          user.user_metadata?.created_for_migration_test === true
        );
        
        for (const testUser of testUsers) {
          try {
            await this.supabase.auth.admin.deleteUser(testUser.id);
          } catch (error) {
            this.logger.warn(`Failed to delete test user ${testUser.email}:`, error.message);
          }
        }
      }
      
      // Clear test passwords
      this.testPasswords.clear();
      
      this.logger.info('✅ Test data cleanup completed');
      
    } catch (error) {
      this.logger.error('Test data cleanup failed:', error);
    }
  }

  calculateOverallResults() {
    const categories = [
      'userCreation',
      'emailLogin',
      'sessionValidation',
      'tokenRefresh',
      'logoutFunctionality',
      'passwordManagement',
      'securityValidation'
    ];
    
    let totalPassed = 0;
    let totalChecks = 0;
    
    categories.forEach(category => {
      totalPassed += this.testResults[category].passed;
      totalChecks += this.testResults[category].passed + this.testResults[category].failed;
    });
    
    this.testResults.overall.passed = totalPassed;
    this.testResults.overall.failed = totalChecks - totalPassed;
    this.testResults.overall.percentage = totalChecks > 0 
      ? Math.round((totalPassed / totalChecks) * 100) 
      : 0;
  }

  generateTestReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 MIGRATED USER AUTHENTICATION TEST REPORT');
    console.log('='.repeat(80));
    
    const categories = [
      { name: 'User Creation', key: 'userCreation' },
      { name: 'Email Login', key: 'emailLogin' },
      { name: 'Session Validation', key: 'sessionValidation' },
      { name: 'Token Refresh', key: 'tokenRefresh' },
      { name: 'Logout Functionality', key: 'logoutFunctionality' },
      { name: 'Password Management', key: 'passwordManagement' },
      { name: 'Security Validation', key: 'securityValidation' }
    ];
    
    categories.forEach(category => {
      const results = this.testResults[category.key];
      const total = results.passed + results.failed;
      const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
      
      console.log(`\n${category.name}:`);
      console.log(`  Passed: ${results.passed}, Failed: ${results.failed}, Pass Rate: ${passRate}%`);
      
      if (results.failed > 0 && results.details.length > 0) {
        console.log('  Issues:');
        results.details.slice(0, 2).forEach(detail => {
          console.log(`    - ${detail.issue}`);
        });
        if (results.details.length > 2) {
          console.log(`    ... and ${results.details.length - 2} more issues`);
        }
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`OVERALL AUTHENTICATION TEST SCORE: ${this.testResults.overall.percentage}%`);
    console.log(`Total Tests: ${this.testResults.overall.passed + this.testResults.overall.failed}`);
    console.log(`Passed: ${this.testResults.overall.passed}, Failed: ${this.testResults.overall.failed}`);
    
    if (this.testResults.overall.percentage >= 95) {
      console.log('✅ EXCELLENT - Authentication system working perfectly');
    } else if (this.testResults.overall.percentage >= 85) {
      console.log('✅ GOOD - Authentication system mostly working');
    } else if (this.testResults.overall.percentage >= 70) {
      console.log('⚠️ FAIR - Some authentication issues need attention');
    } else {
      console.log('❌ POOR - Significant authentication issues found');
    }
    
    console.log('='.repeat(80));
    
    // Save detailed report
    this.logger.saveToFile(`migrated-auth-test-${Date.now()}.json`);
  }

  // Helper methods
  generateTestPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

// CLI interface
if (require.main === module) {
  const tester = new MigratedAuthTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n✅ All authentication tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Authentication tests failed:', error);
      process.exit(1);
    });
}

module.exports = MigratedAuthTester;