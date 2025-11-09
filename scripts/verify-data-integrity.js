#!/usr/bin/env node

/**
 * Data Integrity Verification Script
 * Comprehensive data integrity checks for migrated users
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const { MigrationLogger } = require('./migration-logger');

class DataIntegrityVerifier {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.prisma = new PrismaClient();
    this.logger = new MigrationLogger('data-integrity');
    
    this.verificationResults = {
      userCount: { passed: 0, failed: 0, details: {} },
      emailConsistency: { passed: 0, failed: 0, details: [] },
      metadataIntegrity: { passed: 0, failed: 0, details: [] },
      roleMapping: { passed: 0, failed: 0, details: [] },
      timestampConsistency: { passed: 0, failed: 0, details: [] },
      relationshipIntegrity: { passed: 0, failed: 0, details: [] },
      securityIntegrity: { passed: 0, failed: 0, details: [] },
      overall: { passed: 0, failed: 0, percentage: 0 }
    };
  }

  async verifyAll() {
    this.logger.info('🔍 Starting comprehensive data integrity verification...');
    
    try {
      await this.verifyUserCounts();
      await this.verifyEmailConsistency();
      await this.verifyMetadataIntegrity();
      await this.verifyRoleMapping();
      await this.verifyTimestampConsistency();
      await this.verifyRelationshipIntegrity();
      await this.verifySecurityIntegrity();
      
      this.calculateOverallResults();
      this.generateIntegrityReport();
      
      this.logger.info('✅ Data integrity verification completed');
      return this.verificationResults;
      
    } catch (error) {
      this.logger.error('❌ Data integrity verification failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async verifyUserCounts() {
    this.logger.info('👥 Verifying user counts...');
    
    try {
      // Count users in local database
      const localTotal = await this.prisma.users.count();
      const localMigrated = await this.prisma.users.count({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        }
      });
      
      // Count users in Supabase
      const { data: supabaseUsers, error } = await this.supabase.auth.admin.listUsers();
      
      if (error) {
        throw error;
      }
      
      const supabaseTotal = supabaseUsers.users.length;
      
      // Verify counts match
      const countsMatch = localMigrated === supabaseTotal;
      
      if (countsMatch) {
        this.verificationResults.userCount.passed++;
        this.logger.info(`✅ User counts match: Local=${localMigrated}, Supabase=${supabaseTotal}`);
      } else {
        this.verificationResults.userCount.failed++;
        this.logger.error(`❌ User count mismatch: Local=${localMigrated}, Supabase=${supabaseTotal}`);
      }
      
      this.verificationResults.userCount.details = {
        localTotal,
        localMigrated,
        supabaseTotal,
        countsMatch
      };
      
    } catch (error) {
      this.verificationResults.userCount.failed++;
      this.logger.error('User count verification failed:', error);
    }
  }

  async verifyEmailConsistency() {
    this.logger.info('📧 Verifying email consistency...');
    
    try {
      // Get sample of migrated users
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 100, // Sample size for performance
        select: {
          id: true,
          email: true,
          supabase_id: true
        }
      });
      
      for (const localUser of migratedUsers) {
        try {
          // Get corresponding user from Supabase
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(localUser.supabase_id);
          
          if (error || !supabaseUser.user) {
            this.verificationResults.emailConsistency.failed++;
            this.verificationResults.emailConsistency.details.push({
              userId: localUser.id,
              issue: 'Supabase user not found',
              localEmail: localUser.email
            });
            continue;
          }
          
          // Check email consistency
          if (localUser.email.toLowerCase() === supabaseUser.user.email.toLowerCase()) {
            this.verificationResults.emailConsistency.passed++;
          } else {
            this.verificationResults.emailConsistency.failed++;
            this.verificationResults.emailConsistency.details.push({
              userId: localUser.id,
              issue: 'Email mismatch',
              localEmail: localUser.email,
              supabaseEmail: supabaseUser.user.email
            });
          }
          
        } catch (error) {
          this.verificationResults.emailConsistency.failed++;
          this.verificationResults.emailConsistency.details.push({
            userId: localUser.id,
            issue: 'Verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Email consistency verification: ${this.verificationResults.emailConsistency.passed} passed, ${this.verificationResults.emailConsistency.failed} failed`);
      
    } catch (error) {
      this.logger.error('Email consistency verification failed:', error);
    }
  }

  async verifyMetadataIntegrity() {
    this.logger.info('📋 Verifying metadata integrity...');
    
    try {
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 50, // Sample size
        select: {
          id: true,
          supabase_id: true,
          name: true,
          role: true,
          created_at: true,
          updated_at: true
        }
      });
      
      for (const localUser of migratedUsers) {
        try {
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(localUser.supabase_id);
          
          if (error || !supabaseUser.user) {
            this.verificationResults.metadataIntegrity.failed++;
            continue;
          }
          
          const supabaseMetadata = supabaseUser.user.user_metadata || {};
          const supabaseAppMetadata = supabaseUser.user.app_metadata || {};
          
          // Verify key metadata fields
          let metadataValid = true;
          const issues = [];
          
          // Check name
          if (localUser.name && supabaseMetadata.name !== localUser.name) {
            metadataValid = false;
            issues.push(`Name mismatch: local=${localUser.name}, supabase=${supabaseMetadata.name}`);
          }
          
          // Check role
          if (supabaseAppMetadata.role !== localUser.role) {
            metadataValid = false;
            issues.push(`Role mismatch: local=${localUser.role}, supabase=${supabaseAppMetadata.role}`);
          }
          
          // Check migration metadata
          if (!supabaseMetadata.migration_info) {
            metadataValid = false;
            issues.push('Missing migration info in metadata');
          }
          
          if (metadataValid) {
            this.verificationResults.metadataIntegrity.passed++;
          } else {
            this.verificationResults.metadataIntegrity.failed++;
            this.verificationResults.metadataIntegrity.details.push({
              userId: localUser.id,
              issues
            });
          }
          
        } catch (error) {
          this.verificationResults.metadataIntegrity.failed++;
          this.verificationResults.metadataIntegrity.details.push({
            userId: localUser.id,
            issue: 'Metadata verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Metadata integrity verification: ${this.verificationResults.metadataIntegrity.passed} passed, ${this.verificationResults.metadataIntegrity.failed} failed`);
      
    } catch (error) {
      this.logger.error('Metadata integrity verification failed:', error);
    }
  }

  async verifyRoleMapping() {
    this.logger.info('👑 Verifying role mapping...');
    
    try {
      const validRoles = ['USER', 'CREATOR', 'ADMIN'];
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 50,
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const localUser of migratedUsers) {
        try {
          // Validate local role
          if (!validRoles.includes(localUser.role)) {
            this.verificationResults.roleMapping.failed++;
            this.verificationResults.roleMapping.details.push({
              userId: localUser.id,
              email: localUser.email,
              issue: 'Invalid role in local database',
              role: localUser.role
            });
            continue;
          }
          
          // Check Supabase role
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(localUser.supabase_id);
          
          if (error || !supabaseUser.user) {
            this.verificationResults.roleMapping.failed++;
            this.verificationResults.roleMapping.details.push({
              userId: localUser.id,
              email: localUser.email,
              issue: 'Supabase user not found'
            });
            continue;
          }
          
          const supabaseRole = supabaseUser.user.app_metadata?.role;
          
          if (supabaseRole === localUser.role) {
            this.verificationResults.roleMapping.passed++;
          } else {
            this.verificationResults.roleMapping.failed++;
            this.verificationResults.roleMapping.details.push({
              userId: localUser.id,
              email: localUser.email,
              issue: 'Role mismatch between local and Supabase',
              localRole: localUser.role,
              supabaseRole
            });
          }
          
        } catch (error) {
          this.verificationResults.roleMapping.failed++;
          this.verificationResults.roleMapping.details.push({
            userId: localUser.id,
            email: localUser.email,
            issue: 'Role verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Role mapping verification: ${this.verificationResults.roleMapping.passed} passed, ${this.verificationResults.roleMapping.failed} failed`);
      
    } catch (error) {
      this.logger.error('Role mapping verification failed:', error);
    }
  }

  async verifyTimestampConsistency() {
    this.logger.info('⏰ Verifying timestamp consistency...');
    
    try {
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 50,
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          migrated_at: true,
          supabase_id: true
        }
      });
      
      for (const localUser of migratedUsers) {
        try {
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(localUser.supabase_id);
          
          if (error || !supabaseUser.user) {
            this.verificationResults.timestampConsistency.failed++;
            continue;
          }
          
          let timestampsValid = true;
          const issues = [];
          
          // Check created_at is reasonable (within 24 hours)
          if (localUser.created_at && supabaseUser.user.created_at) {
            const localDate = new Date(localUser.created_at);
            const supabaseDate = new Date(supabaseUser.user.created_at);
            const diffHours = Math.abs(localDate - supabaseDate) / (1000 * 60 * 60);
            
            if (diffHours > 24) {
              timestampsValid = false;
              issues.push(`Created_at differs by ${diffHours.toFixed(2)} hours`);
            }
          }
          
          // Check migrated_at is after created_at
          if (localUser.migrated_at && localUser.created_at) {
            const migratedDate = new Date(localUser.migrated_at);
            const createdDate = new Date(localUser.created_at);
            
            if (migratedDate <= createdDate) {
              timestampsValid = false;
              issues.push('Migrated_at is not after created_at');
            }
          }
          
          if (timestampsValid) {
            this.verificationResults.timestampConsistency.passed++;
          } else {
            this.verificationResults.timestampConsistency.failed++;
            this.verificationResults.timestampConsistency.details.push({
              userId: localUser.id,
              email: localUser.email,
              issues
            });
          }
          
        } catch (error) {
          this.verificationResults.timestampConsistency.failed++;
          this.verificationResults.timestampConsistency.details.push({
            userId: localUser.id,
            issue: 'Timestamp verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Timestamp consistency verification: ${this.verificationResults.timestampConsistency.passed} passed, ${this.verificationResults.timestampConsistency.failed} failed`);
      
    } catch (error) {
      this.logger.error('Timestamp consistency verification failed:', error);
    }
  }

  async verifyRelationshipIntegrity() {
    this.logger.info('🔗 Verifying relationship integrity...');
    
    try {
      // Check creator_profiles relationships
      const creatorProfiles = await this.prisma.creator_profiles.findMany({
        take: 20,
        select: {
          id: true,
          user_id: true,
          users: {
            select: {
              id: true,
              email: true,
              migration_status: true,
              supabase_id: true
            }
          }
        }
      });
      
      for (const profile of creatorProfiles) {
        if (!profile.users) {
          this.verificationResults.relationshipIntegrity.failed++;
          this.verificationResults.relationshipIntegrity.details.push({
            profileId: profile.id,
            userId: profile.user_id,
            issue: 'Orphaned creator profile - user not found'
          });
          continue;
        }
        
        if (profile.users.migration_status === 'completed' && !profile.users.supabase_id) {
          this.verificationResults.relationshipIntegrity.failed++;
          this.verificationResults.relationshipIntegrity.details.push({
            profileId: profile.id,
            userId: profile.user_id,
            issue: 'User marked as migrated but no Supabase ID'
          });
        } else {
          this.verificationResults.relationshipIntegrity.passed++;
        }
      }
      
      // Check for any orphaned records
      const orphanedProfiles = await this.prisma.$queryRaw`
        SELECT cp.id, cp.user_id 
        FROM creator_profiles cp 
        LEFT JOIN users u ON cp.user_id = u.id 
        WHERE u.id IS NULL
        LIMIT 10
      `;
      
      if (orphanedProfiles.length > 0) {
        this.verificationResults.relationshipIntegrity.failed += orphanedProfiles.length;
        orphanedProfiles.forEach(profile => {
          this.verificationResults.relationshipIntegrity.details.push({
            profileId: profile.id,
            userId: profile.user_id,
            issue: 'Completely orphaned creator profile'
          });
        });
      }
      
      this.logger.info(`Relationship integrity verification: ${this.verificationResults.relationshipIntegrity.passed} passed, ${this.verificationResults.relationshipIntegrity.failed} failed`);
      
    } catch (error) {
      this.logger.error('Relationship integrity verification failed:', error);
    }
  }

  async verifySecurityIntegrity() {
    this.logger.info('🔒 Verifying security integrity...');
    
    try {
      // Check for users with passwords still in local database
      const usersWithPasswords = await this.prisma.users.count({
        where: {
          password: { not: null },
          migration_status: 'completed'
        }
      });
      
      if (usersWithPasswords === 0) {
        this.verificationResults.securityIntegrity.passed++;
      } else {
        this.verificationResults.securityIntegrity.failed++;
        this.verificationResults.securityIntegrity.details.push({
          issue: 'Users with passwords still in local database',
          count: usersWithPasswords
        });
      }
      
      // Check for users with temporary emails
      const usersWithTempEmails = await this.prisma.users.count({
        where: {
          email: { contains: 'temp_' },
          migration_status: 'completed'
        }
      });
      
      if (usersWithTempEmails === 0) {
        this.verificationResults.securityIntegrity.passed++;
      } else {
        this.verificationResults.securityIntegrity.failed++;
        this.verificationResults.securityIntegrity.details.push({
          issue: 'Users with temporary emails',
          count: usersWithTempEmails
        });
      }
      
      // Check for proper email confirmation in Supabase
      const { data: supabaseUsers, error } = await this.supabase.auth.admin.listUsers();
      
      if (!error && supabaseUsers.users) {
        const unconfirmedEmails = supabaseUsers.users.filter(user => !user.email_confirmed_at);
        
        if (unconfirmedEmails.length === 0) {
          this.verificationResults.securityIntegrity.passed++;
        } else {
          this.verificationResults.securityIntegrity.failed++;
          this.verificationResults.securityIntegrity.details.push({
            issue: 'Users with unconfirmed emails in Supabase',
            count: unconfirmedEmails.length,
            emails: unconfirmedEmails.slice(0, 5).map(u => u.email) // Show first 5
          });
        }
      }
      
      this.logger.info(`Security integrity verification: ${this.verificationResults.securityIntegrity.passed} passed, ${this.verificationResults.securityIntegrity.failed} failed`);
      
    } catch (error) {
      this.logger.error('Security integrity verification failed:', error);
    }
  }

  calculateOverallResults() {
    const categories = [
      'userCount',
      'emailConsistency', 
      'metadataIntegrity',
      'roleMapping',
      'timestampConsistency',
      'relationshipIntegrity',
      'securityIntegrity'
    ];
    
    let totalPassed = 0;
    let totalChecks = 0;
    
    categories.forEach(category => {
      totalPassed += this.verificationResults[category].passed;
      totalChecks += this.verificationResults[category].passed + this.verificationResults[category].failed;
    });
    
    this.verificationResults.overall.passed = totalPassed;
    this.verificationResults.overall.failed = totalChecks - totalPassed;
    this.verificationResults.overall.percentage = totalChecks > 0 
      ? Math.round((totalPassed / totalChecks) * 100) 
      : 0;
  }

  generateIntegrityReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 DATA INTEGRITY VERIFICATION REPORT');
    console.log('='.repeat(80));
    
    const categories = [
      { name: 'User Count Verification', key: 'userCount' },
      { name: 'Email Consistency', key: 'emailConsistency' },
      { name: 'Metadata Integrity', key: 'metadataIntegrity' },
      { name: 'Role Mapping', key: 'roleMapping' },
      { name: 'Timestamp Consistency', key: 'timestampConsistency' },
      { name: 'Relationship Integrity', key: 'relationshipIntegrity' },
      { name: 'Security Integrity', key: 'securityIntegrity' }
    ];
    
    categories.forEach(category => {
      const results = this.verificationResults[category.key];
      const total = results.passed + results.failed;
      const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
      
      console.log(`\n${category.name}:`);
      console.log(`  Passed: ${results.passed}, Failed: ${results.failed}, Pass Rate: ${passRate}%`);
      
      if (results.failed > 0 && results.details.length > 0) {
        console.log('  Issues:');
        results.details.slice(0, 3).forEach(detail => {
          console.log(`    - ${detail.issue || detail.issues?.join(', ')}`);
        });
        if (results.details.length > 3) {
          console.log(`    ... and ${results.details.length - 3} more issues`);
        }
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`OVERALL INTEGRITY SCORE: ${this.verificationResults.overall.percentage}%`);
    console.log(`Total Checks: ${this.verificationResults.overall.passed + this.verificationResults.overall.failed}`);
    console.log(`Passed: ${this.verificationResults.overall.passed}, Failed: ${this.verificationResults.overall.failed}`);
    
    if (this.verificationResults.overall.percentage >= 95) {
      console.log('✅ EXCELLENT - Data integrity is very high');
    } else if (this.verificationResults.overall.percentage >= 85) {
      console.log('✅ GOOD - Data integrity is acceptable');
    } else if (this.verificationResults.overall.percentage >= 70) {
      console.log('⚠️ FAIR - Some integrity issues need attention');
    } else {
      console.log('❌ POOR - Significant integrity issues found');
    }
    
    console.log('='.repeat(80));
    
    // Save detailed report
    this.logger.saveToFile(`data-integrity-report-${Date.now()}.json`);
  }
}

// CLI interface
if (require.main === module) {
  const verifier = new DataIntegrityVerifier();
  verifier.verifyAll()
    .then(() => {
      console.log('\n✅ Data integrity verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Data integrity verification failed:', error);
      process.exit(1);
    });
}

module.exports = DataIntegrityVerifier;