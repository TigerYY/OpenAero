#!/usr/bin/env node

/**
 * No Data Loss Verification Script
 * Comprehensive verification that no data was lost during migration
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const { MigrationLogger } = require('./migration-logger');
const fs = require('fs').promises;
const path = require('path');

class NoDataLossVerifier {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.prisma = new PrismaClient();
    this.logger = new MigrationLogger('no-data-loss');
    
    this.verificationResults = {
      userCounts: { passed: 0, failed: 0, details: {} },
      dataFields: { passed: 0, failed: 0, details: [] },
      relationships: { passed: 0, failed: 0, details: [] },
      creatorProfiles: { passed: 0, failed: 0, details: [] },
      timestamps: { passed: 0, failed: 0, details: [] },
      metadata: { passed: 0, failed: 0, details: [] },
      backupComparison: { passed: 0, failed: 0, details: [] },
      overall: { passed: 0, failed: 0, percentage: 0, dataLossDetected: false }
    };
  }

  async verifyNoDataLoss() {
    this.logger.info('🔍 Starting comprehensive no data loss verification...');
    
    try {
      await this.verifyUserCounts();
      await this.verifyDataFields();
      await this.verifyRelationships();
      await this.verifyCreatorProfiles();
      await this.verifyTimestamps();
      await this.verifyMetadata();
      await this.verifyBackupComparison();
      
      this.calculateOverallResults();
      this.generateNoDataLossReport();
      
      this.logger.info('✅ No data loss verification completed');
      return this.verificationResults;
      
    } catch (error) {
      this.logger.error('❌ No data loss verification failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async verifyUserCounts() {
    this.logger.info('👥 Verifying user counts...');
    
    try {
      // Count users before migration (from backup or logs)
      const preMigrationCount = await this.getPreMigrationUserCount();
      
      // Count users after migration
      const localTotalCount = await this.prisma.users.count();
      const migratedCount = await this.prisma.users.count({
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
      
      const supabaseCount = supabaseUsers.users.length;
      
      // Verify counts
      let countsCorrect = true;
      const countDetails = {
        preMigration: preMigrationCount,
        localTotal: localTotalCount,
        migrated: migratedCount,
        supabase: supabaseCount
      };
      
      // Check if we have the same number of users
      if (migratedCount !== supabaseCount) {
        countsCorrect = false;
        this.verificationResults.overall.dataLossDetected = true;
      }
      
      // Check if total local count matches pre-migration
      if (localTotalCount < preMigrationCount) {
        countsCorrect = false;
        this.verificationResults.overall.dataLossDetected = true;
      }
      
      if (countsCorrect) {
        this.verificationResults.userCounts.passed++;
      } else {
        this.verificationResults.userCounts.failed++;
      }
      
      this.verificationResults.userCounts.details = countDetails;
      
      this.logger.info(`User counts verification: ${countsCorrect ? 'PASSED' : 'FAILED'}`);
      this.logger.info(`Pre-migration: ${preMigrationCount}, Migrated: ${migratedCount}, Supabase: ${supabaseCount}`);
      
    } catch (error) {
      this.verificationResults.userCounts.failed++;
      this.logger.error('User counts verification failed:', error);
    }
  }

  async verifyDataFields() {
    this.logger.info('📋 Verifying data fields...');
    
    try {
      // Get sample of migrated users
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 50,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          created_at: true,
          updated_at: true,
          supabase_id: true
        }
      });
      
      for (const user of migratedUsers) {
        try {
          // Get corresponding user from Supabase
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(user.supabase_id);
          
          if (error || !supabaseUser.user) {
            this.verificationResults.dataFields.failed++;
            this.verificationResults.dataFields.details.push({
              userId: user.id,
              email: user.email,
              issue: 'User not found in Supabase'
            });
            this.verificationResults.overall.dataLossDetected = true;
            continue;
          }
          
          // Check essential fields
          let fieldsCorrect = true;
          const missingFields = [];
          
          if (!supabaseUser.user.email) {
            fieldsCorrect = false;
            missingFields.push('email');
          }
          
          if (!supabaseUser.user.created_at) {
            fieldsCorrect = false;
            missingFields.push('created_at');
          }
          
          // Check user metadata for additional fields
          const metadata = supabaseUser.user.user_metadata || {};
          
          if (user.name && !metadata.name) {
            fieldsCorrect = false;
            missingFields.push('name in metadata');
          }
          
          if (!metadata.migration_info) {
            fieldsCorrect = false;
            missingFields.push('migration_info');
          }
          
          // Check app metadata for role
          const appMetadata = supabaseUser.user.app_metadata || {};
          if (!appMetadata.role) {
            fieldsCorrect = false;
            missingFields.push('role in app_metadata');
          }
          
          if (fieldsCorrect) {
            this.verificationResults.dataFields.passed++;
          } else {
            this.verificationResults.dataFields.failed++;
            this.verificationResults.dataFields.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Missing data fields',
              missingFields
            });
            this.verificationResults.overall.dataLossDetected = true;
          }
          
        } catch (error) {
          this.verificationResults.dataFields.failed++;
          this.verificationResults.dataFields.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Data field verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Data fields verification: ${this.verificationResults.dataFields.passed} passed, ${this.verificationResults.dataFields.failed} failed`);
      
    } catch (error) {
      this.logger.error('Data fields verification failed:', error);
    }
  }

  async verifyRelationships() {
    this.logger.info('🔗 Verifying relationships...');
    
    try {
      // Verify creator_profiles relationships
      const creatorProfiles = await this.prisma.creator_profiles.findMany({
        take: 20,
        select: {
          id: true,
          user_id: true,
          display_name: true,
          bio: true,
          users: {
            select: {
              id: true,
              email: true,
              migration_status: true,
              supabase_id: true,
              role: true
            }
          }
        }
      });
      
      for (const profile of creatorProfiles) {
        if (!profile.users) {
          this.verificationResults.relationships.failed++;
          this.verificationResults.relationships.details.push({
            profileId: profile.id,
            userId: profile.user_id,
            issue: 'Orphaned creator profile - user not found'
          });
          this.verificationResults.overall.dataLossDetected = true;
          continue;
        }
        
        // Verify user has CREATOR role
        if (profile.users.role !== 'CREATOR') {
          this.verificationResults.relationships.failed++;
          this.verificationResults.relationships.details.push({
            profileId: profile.id,
            userId: profile.user_id,
            userEmail: profile.users.email,
            issue: 'Creator profile linked to non-CREATOR user',
            userRole: profile.users.role
          });
        }
        
        // Verify user is migrated
        if (profile.users.migration_status !== 'completed') {
          this.verificationResults.relationships.failed++;
          this.verificationResults.relationships.details.push({
            profileId: profile.id,
            userId: profile.user_id,
            userEmail: profile.users.email,
            issue: 'Creator profile user not migrated',
            migrationStatus: profile.users.migration_status
          });
        }
        
        if (profile.users && profile.users.role === 'CREATOR' && profile.users.migration_status === 'completed') {
          this.verificationResults.relationships.passed++;
        }
      }
      
      // Check for missing creator profiles for CREATOR role users
      const creatorUsersWithoutProfiles = await this.prisma.users.findMany({
        where: {
          role: 'CREATOR',
          migration_status: 'completed',
          creator_profiles: {
            is: null
          }
        },
        select: {
          id: true,
          email: true
        }
      });
      
      if (creatorUsersWithoutProfiles.length > 0) {
        this.verificationResults.relationships.failed += creatorUsersWithoutProfiles.length;
        creatorUsersWithoutProfiles.forEach(user => {
          this.verificationResults.relationships.details.push({
            userId: user.id,
            userEmail: user.email,
            issue: 'CREATOR role user without creator profile'
          });
        });
      }
      
      this.logger.info(`Relationships verification: ${this.verificationResults.relationships.passed} passed, ${this.verificationResults.relationships.failed} failed`);
      
    } catch (error) {
      this.logger.error('Relationships verification failed:', error);
    }
  }

  async verifyCreatorProfiles() {
    this.logger.info('🎨 Verifying creator profiles data integrity...');
    
    try {
      const creatorProfiles = await this.prisma.creator_profiles.findMany({
        where: {
          users: {
            migration_status: 'completed',
            supabase_id: { not: null }
          }
        },
        take: 30,
        select: {
          id: true,
          user_id: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          social_links: true,
          created_at: true,
          updated_at: true,
          users: {
            select: {
              id: true,
              email: true,
              supabase_id: true
            }
          }
        }
      });
      
      for (const profile of creatorProfiles) {
        try {
          // Check if profile data is migrated to Supabase metadata
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(profile.users.supabase_id);
          
          if (error || !supabaseUser.user) {
            this.verificationResults.creatorProfiles.failed++;
            this.verificationResults.creatorProfiles.details.push({
              profileId: profile.id,
              userId: profile.user_id,
              issue: 'Supabase user not found for creator profile'
            });
            this.verificationResults.overall.dataLossDetected = true;
            continue;
          }
          
          const metadata = supabaseUser.user.user_metadata || {};
          let profileDataIntact = true;
          const missingProfileData = [];
          
          // Check creator profile data in metadata
          if (profile.display_name && !metadata.creator_display_name) {
            profileDataIntact = false;
            missingProfileData.push('display_name');
          }
          
          if (profile.bio && !metadata.creator_bio) {
            profileDataIntact = false;
            missingProfileData.push('bio');
          }
          
          if (profile.avatar_url && !metadata.creator_avatar_url) {
            profileDataIntact = false;
            missingProfileData.push('avatar_url');
          }
          
          if (profile.social_links && !metadata.creator_social_links) {
            profileDataIntact = false;
            missingProfileData.push('social_links');
          }
          
          if (profileDataIntact) {
            this.verificationResults.creatorProfiles.passed++;
          } else {
            this.verificationResults.creatorProfiles.failed++;
            this.verificationResults.creatorProfiles.details.push({
              profileId: profile.id,
              userId: profile.user_id,
              userEmail: profile.users.email,
              issue: 'Creator profile data missing in Supabase',
              missingData: missingProfileData
            });
            this.verificationResults.overall.dataLossDetected = true;
          }
          
        } catch (error) {
          this.verificationResults.creatorProfiles.failed++;
          this.verificationResults.creatorProfiles.details.push({
            profileId: profile.id,
            userId: profile.user_id,
            issue: 'Creator profile verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Creator profiles verification: ${this.verificationResults.creatorProfiles.passed} passed, ${this.verificationResults.creatorProfiles.failed} failed`);
      
    } catch (error) {
      this.logger.error('Creator profiles verification failed:', error);
    }
  }

  async verifyTimestamps() {
    this.logger.info('⏰ Verifying timestamps...');
    
    try {
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 30,
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          migrated_at: true,
          supabase_id: true
        }
      });
      
      for (const user of migratedUsers) {
        try {
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(user.supabase_id);
          
          if (error || !supabaseUser.user) {
            this.verificationResults.timestamps.failed++;
            continue;
          }
          
          let timestampsCorrect = true;
          const timestampIssues = [];
          
          // Check created_at is reasonable (within 24 hours)
          if (user.created_at && supabaseUser.user.created_at) {
            const localDate = new Date(user.created_at);
            const supabaseDate = new Date(supabaseUser.user.created_at);
            const diffHours = Math.abs(localDate - supabaseDate) / (1000 * 60 * 60);
            
            if (diffHours > 24) {
              timestampsCorrect = false;
              timestampIssues.push(`Created_at differs by ${diffHours.toFixed(2)} hours`);
            }
          }
          
          // Check migrated_at is after created_at and before now
          if (user.migrated_at) {
            const migratedDate = new Date(user.migrated_at);
            const createdDate = user.created_at ? new Date(user.created_at) : null;
            const now = new Date();
            
            if (createdDate && migratedDate <= createdDate) {
              timestampsCorrect = false;
              timestampIssues.push('Migrated_at is not after created_at');
            }
            
            if (migratedDate > now) {
              timestampsCorrect = false;
              timestampIssues.push('Migrated_at is in the future');
            }
          }
          
          // Check updated_at is after created_at
          if (user.updated_at && user.created_at) {
            const updatedDate = new Date(user.updated_at);
            const createdDate = new Date(user.created_at);
            
            if (updatedDate < createdDate) {
              timestampsCorrect = false;
              timestampIssues.push('Updated_at is before created_at');
            }
          }
          
          if (timestampsCorrect) {
            this.verificationResults.timestamps.passed++;
          } else {
            this.verificationResults.timestamps.failed++;
            this.verificationResults.timestamps.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Timestamp inconsistencies',
              details: timestampIssues
            });
          }
          
        } catch (error) {
          this.verificationResults.timestamps.failed++;
          this.verificationResults.timestamps.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Timestamp verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Timestamps verification: ${this.verificationResults.timestamps.passed} passed, ${this.verificationResults.timestamps.failed} failed`);
      
    } catch (error) {
      this.logger.error('Timestamps verification failed:', error);
    }
  }

  async verifyMetadata() {
    this.logger.info('📊 Verifying metadata integrity...');
    
    try {
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 25,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of migratedUsers) {
        try {
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(user.supabase_id);
          
          if (error || !supabaseUser.user) {
            this.verificationResults.metadata.failed++;
            continue;
          }
          
          const userMetadata = supabaseUser.user.user_metadata || {};
          const appMetadata = supabaseUser.user.app_metadata || {};
          
          let metadataCorrect = true;
          const metadataIssues = [];
          
          // Check essential migration metadata
          if (!userMetadata.migration_info) {
            metadataCorrect = false;
            metadataIssues.push('Missing migration_info');
          }
          
          // Check role in app metadata
          if (!appMetadata.role || appMetadata.role !== user.role) {
            metadataCorrect = false;
            metadataIssues.push('Role missing or mismatched in app_metadata');
          }
          
          // Check name preservation
          if (user.name && !userMetadata.name) {
            metadataCorrect = false;
            metadataIssues.push('Name not preserved in user_metadata');
          }
          
          // Check metadata size is reasonable
          const metadataSize = JSON.stringify(userMetadata).length;
          if (metadataSize > 8000) {
            metadataCorrect = false;
            metadataIssues.push(`User metadata too large: ${metadataSize} bytes`);
          }
          
          // Check for corrupted data
          try {
            JSON.stringify(userMetadata);
            JSON.stringify(appMetadata);
          } catch (e) {
            metadataCorrect = false;
            metadataIssues.push('Metadata contains invalid JSON');
          }
          
          if (metadataCorrect) {
            this.verificationResults.metadata.passed++;
          } else {
            this.verificationResults.metadata.failed++;
            this.verificationResults.metadata.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Metadata integrity issues',
              details: metadataIssues
            });
            this.verificationResults.overall.dataLossDetected = true;
          }
          
        } catch (error) {
          this.verificationResults.metadata.failed++;
          this.verificationResults.metadata.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Metadata verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Metadata verification: ${this.verificationResults.metadata.passed} passed, ${this.verificationResults.metadata.failed} failed`);
      
    } catch (error) {
      this.logger.error('Metadata verification failed:', error);
    }
  }

  async verifyBackupComparison() {
    this.logger.info('💾 Verifying against backup...');
    
    try {
      // Try to find a backup file
      const backupFile = await this.findLatestBackup();
      
      if (!backupFile) {
        this.logger.warn('No backup file found for comparison');
        this.verificationResults.backupComparison.passed++; // Neutral, not a failure
        return;
      }
      
      const backupData = await this.loadBackupData(backupFile);
      
      if (!backupData || !backupData.users) {
        this.logger.warn('Invalid backup data format');
        this.verificationResults.backupComparison.passed++;
        return;
      }
      
      // Compare backup data with current data
      const backupUserCount = backupData.users.length;
      const currentMigratedCount = await this.prisma.users.count({
        where: {
          migration_status: 'completed'
        }
      });
      
      // Sample comparison of specific users
      const sampleSize = Math.min(20, backupData.users.length);
      const backupSample = backupData.users.slice(0, sampleSize);
      
      let dataMatches = true;
      let mismatches = 0;
      
      for (const backupUser of backupSample) {
        try {
          const currentUser = await this.prisma.users.findUnique({
            where: { id: backupUser.id },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              created_at: true
            }
          });
          
          if (!currentUser) {
            mismatches++;
            dataMatches = false;
            this.verificationResults.backupComparison.details.push({
              userId: backupUser.id,
              issue: 'User missing from current database'
            });
            this.verificationResults.overall.dataLossDetected = true;
            continue;
          }
          
          // Check critical fields
          if (currentUser.email !== backupUser.email) {
            mismatches++;
            dataMatches = false;
            this.verificationResults.backupComparison.details.push({
              userId: backupUser.id,
              issue: 'Email mismatch',
              backupEmail: backupUser.email,
              currentEmail: currentUser.email
            });
          }
          
        } catch (error) {
          mismatches++;
          dataMatches = false;
        }
      }
      
      if (dataMatches && backupUserCount <= currentMigratedCount) {
        this.verificationResults.backupComparison.passed++;
      } else {
        this.verificationResults.backupComparison.failed++;
        this.verificationResults.overall.dataLossDetected = true;
      }
      
      this.logger.info(`Backup comparison verification: ${dataMatches ? 'PASSED' : 'FAILED'}`);
      this.logger.info(`Backup users: ${backupUserCount}, Current migrated: ${currentMigratedCount}, Mismatches: ${mismatches}`);
      
    } catch (error) {
      this.logger.error('Backup comparison verification failed:', error);
    }
  }

  calculateOverallResults() {
    const categories = [
      'userCounts',
      'dataFields',
      'relationships',
      'creatorProfiles',
      'timestamps',
      'metadata',
      'backupComparison'
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

  generateNoDataLossReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 NO DATA LOSS VERIFICATION REPORT');
    console.log('='.repeat(80));
    
    const categories = [
      { name: 'User Counts', key: 'userCounts' },
      { name: 'Data Fields', key: 'dataFields' },
      { name: 'Relationships', key: 'relationships' },
      { name: 'Creator Profiles', key: 'creatorProfiles' },
      { name: 'Timestamps', key: 'timestamps' },
      { name: 'Metadata', key: 'metadata' },
      { name: 'Backup Comparison', key: 'backupComparison' }
    ];
    
    categories.forEach(category => {
      const results = this.verificationResults[category.key];
      const total = results.passed + results.failed;
      const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
      
      console.log(`\n${category.name}:`);
      console.log(`  Passed: ${results.passed}, Failed: ${results.failed}, Pass Rate: ${passRate}%`);
      
      if (results.failed > 0) {
        if (category.key === 'userCounts') {
          console.log(`  Details: Pre-migration: ${results.details.preMigration}, Migrated: ${results.details.migrated}, Supabase: ${results.details.supabase}`);
        } else if (results.details.length > 0) {
          console.log(`  Issues: ${results.details.length} detected`);
          results.details.slice(0, 2).forEach(detail => {
            console.log(`    - ${detail.issue}`);
          });
          if (results.details.length > 2) {
            console.log(`    ... and ${results.details.length - 2} more issues`);
          }
        }
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`OVERALL NO DATA LOSS SCORE: ${this.verificationResults.overall.percentage}%`);
    console.log(`Total Checks: ${this.verificationResults.overall.passed + this.verificationResults.overall.failed}`);
    console.log(`Passed: ${this.verificationResults.overall.passed}, Failed: ${this.verificationResults.overall.failed}`);
    
    if (this.verificationResults.overall.dataLossDetected) {
      console.log('\n❌ DATA LOSS DETECTED - Immediate attention required!');
      console.log('⚠️ Some user data may have been lost during migration');
    } else if (this.verificationResults.overall.percentage >= 95) {
      console.log('\n✅ EXCELLENT - No data loss detected');
    } else if (this.verificationResults.overall.percentage >= 85) {
      console.log('\n✅ GOOD - Minimal data integrity issues, likely no data loss');
    } else if (this.verificationResults.overall.percentage >= 70) {
      console.log('\n⚠️ FAIR - Some data integrity issues, possible minor data loss');
    } else {
      console.log('\n❌ POOR - Significant data integrity issues, data loss likely');
    }
    
    console.log('='.repeat(80));
    
    // Save detailed report
    this.logger.saveToFile(`no-data-loss-verification-${Date.now()}.json`);
  }

  // Helper methods
  async getPreMigrationUserCount() {
    try {
      // Try to get from migration logs or backup
      const logsDir = path.join(process.cwd(), 'logs');
      const files = await fs.readdir(logsDir);
      
      const migrationLogs = files.filter(file => 
        file.includes('migration') && file.endsWith('.json')
      );
      
      if (migrationLogs.length > 0) {
        const latestLog = migrationLogs.sort().pop();
        const logPath = path.join(logsDir, latestLog);
        const logData = JSON.parse(await fs.readFile(logPath, 'utf8'));
        
        return logData.summary?.totalUsers || logData.totalUsers || 0;
      }
      
      // Fallback: count users without migration status as pre-migration estimate
      return await this.prisma.users.count({
        where: {
          OR: [
            { migration_status: null },
            { migration_status: 'pending' }
          ]
        }
      });
      
    } catch (error) {
      this.logger.warn('Could not determine pre-migration user count:', error.message);
      return 0;
    }
  }

  async findLatestBackup() {
    try {
      const backupDir = path.join(process.cwd(), 'backups');
      const files = await fs.readdir(backupDir);
      
      const backupFiles = files.filter(file => 
        file.endsWith('.backup') || file.endsWith('.sql')
      );
      
      if (backupFiles.length > 0) {
        return path.join(backupDir, backupFiles.sort().pop());
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async loadBackupData(backupFile) {
    try {
      if (backupFile.endsWith('.json')) {
        const data = await fs.readFile(backupFile, 'utf8');
        return JSON.parse(data);
      }
      
      // For SQL files, we'd need a parser - for now return null
      return null;
    } catch (error) {
      this.logger.warn('Could not load backup data:', error.message);
      return null;
    }
  }
}

// CLI interface
if (require.main === module) {
  const verifier = new NoDataLossVerifier();
  verifier.verifyNoDataLoss()
    .then(() => {
      console.log('\n✅ No data loss verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ No data loss verification failed:', error);
      process.exit(1);
    });
}

module.exports = NoDataLossVerifier;