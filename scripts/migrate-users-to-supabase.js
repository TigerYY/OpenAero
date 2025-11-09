#!/usr/bin/env node

/**
 * Main user migration script
 * Executes the complete migration from custom users table to Supabase Auth
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const PreMigrationValidator = require('./validate-environment');
const { exportUserData } = require('./export-user-data');
const { transformUserData } = require('./transform-user-data');
const { mapMetadata } = require('./metadata-mapper');
const { resolveConflicts } = require('./conflict-resolver');
const { createBackup } = require('./database-backup');
const { MigrationLogger } = require('./migration-logger');

class UserMigrationExecutor {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      batchSize: options.batchSize || 100,
      skipBackup: options.skipBackup || false,
      continueOnError: options.continueOnError || false,
      ...options
    };

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.prisma = new PrismaClient();
    this.logger = new MigrationLogger('user-migration');
    
    this.migrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      conflicts: 0,
      startTime: new Date(),
      endTime: null
    };
  }

  async executeMigration() {
    try {
      this.logger.info('🚀 Starting user migration to Supabase Auth');
      
      // Step 1: Pre-migration validation
      await this.validateEnvironment();
      
      // Step 2: Create backup (unless skipped)
      if (!this.options.skipBackup) {
        await this.createBackup();
      }
      
      // Step 3: Export user data
      const userData = await this.exportUserData();
      
      // Step 4: Transform and validate data
      const transformedData = await this.transformUserData(userData);
      
      // Step 5: Resolve conflicts
      const resolvedData = await this.resolveConflicts(transformedData);
      
      // Step 6: Execute migration
      await this.migrateUsers(resolvedData);
      
      // Step 7: Post-migration validation
      await this.validateMigration();
      
      // Step 8: Generate report
      await this.generateReport();
      
      this.migrationStats.endTime = new Date();
      this.logger.info('✅ User migration completed successfully');
      
      return this.migrationStats;
      
    } catch (error) {
      this.logger.error('❌ Migration failed:', error);
      this.migrationStats.endTime = new Date();
      
      if (!this.options.continueOnError) {
        throw error;
      }
      
      return this.migrationStats;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async validateEnvironment() {
    this.logger.info('🔍 Running pre-migration validation...');
    
    const validator = new PreMigrationValidator();
    const validationResults = await validator.validateAll();
    
    if (validationResults.failed.length > 0) {
      throw new Error('Environment validation failed. Cannot proceed with migration.');
    }
    
    this.logger.info('✅ Environment validation passed');
  }

  async createBackup() {
    this.logger.info('💾 Creating database backup...');
    
    const backupResult = await createBackup({
      type: 'full',
      description: 'Pre-migration backup before Supabase Auth migration'
    });
    
    this.logger.info(`✅ Backup created: ${backupResult.backupPath}`);
    return backupResult;
  }

  async exportUserData() {
    this.logger.info('📤 Exporting user data...');
    
    const exportResult = await exportUserData({
      includeMetadata: true,
      includeRoles: true,
      format: 'object'
    });
    
    this.migrationStats.total = exportResult.users.length;
    this.logger.info(`✅ Exported ${exportResult.users.length} users`);
    
    return exportResult;
  }

  async transformUserData(userData) {
    this.logger.info('🔄 Transforming user data for Supabase Auth...');
    
    const transformedUsers = [];
    
    for (const user of userData.users) {
      try {
        const transformed = await transformUserData(user, {
          targetSchema: 'supabase-auth',
          includeMetadata: true,
          preserveRoles: true
        });
        
        transformedUsers.push(transformed);
      } catch (error) {
        this.logger.error(`Failed to transform user ${user.id}:`, error);
        
        if (!this.options.continueOnError) {
          throw error;
        }
        
        this.migrationStats.failed++;
      }
    }
    
    this.logger.info(`✅ Transformed ${transformedUsers.length} users`);
    
    return {
      users: transformedUsers,
      totalCount: transformedUsers.length
    };
  }

  async resolveConflicts(transformedData) {
    this.logger.info('⚖️ Resolving data conflicts...');
    
    const conflictResults = await resolveConflicts(transformedData, {
      strategy: 'merge',
      autoResolve: true,
      logConflicts: true
    });
    
    this.migrationStats.conflicts = conflictResults.conflicts.length;
    
    if (conflictResults.conflicts.length > 0) {
      this.logger.warn(`⚠️ Resolved ${conflictResults.conflicts.length} conflicts`);
    }
    
    this.logger.info(`✅ Conflict resolution completed`);
    
    return conflictResults.resolvedData;
  }

  async migrateUsers(resolvedData) {
    this.logger.info(`👥 Migrating ${resolvedData.users.length} users to Supabase Auth...`);
    
    const batches = this.createBatches(resolvedData.users, this.options.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} users)`);
      
      await this.migrateBatch(batch);
      
      // Brief pause between batches to avoid overwhelming the system
      if (i < batches.length - 1) {
        await this.sleep(1000);
      }
    }
    
    this.logger.info(`✅ Migration completed. Success: ${this.migrationStats.success}, Failed: ${this.migrationStats.failed}, Skipped: ${this.migrationStats.skipped}`);
  }

  async migrateBatch(batch) {
    for (const user of batch) {
      try {
        if (this.options.dryRun) {
          this.logger.info(`[DRY RUN] Would migrate user: ${user.email}`);
          this.migrationStats.success++;
          continue;
        }
        
        // Check if user already exists in Supabase Auth
        const { data: existingUser } = await this.supabase.auth.admin.listUsers();
        const userExists = existingUser.users.some(u => u.email === user.email);
        
        if (userExists) {
          this.logger.warn(`⚠️ User ${user.email} already exists in Supabase Auth, skipping`);
          this.migrationStats.skipped++;
          continue;
        }
        
        // Create user in Supabase Auth
        const { data: createdUser, error } = await this.supabase.auth.admin.createUser({
          email: user.email,
          password: user.password || this.generateSecurePassword(),
          email_confirm: true,
          user_metadata: user.metadata || {},
          app_metadata: user.appMetadata || {}
        });
        
        if (error) {
          throw error;
        }
        
        // Update local user record with Supabase ID
        await this.updateLocalUserRecord(user.id, createdUser.user.id);
        
        // Migrate user roles if applicable
        if (user.roles && user.roles.length > 0) {
          await this.migrateUserRoles(createdUser.user.id, user.roles);
        }
        
        this.logger.info(`✅ Migrated user: ${user.email}`);
        this.migrationStats.success++;
        
      } catch (error) {
        this.logger.error(`❌ Failed to migrate user ${user.email}:`, error);
        this.migrationStats.failed++;
        
        if (!this.options.continueOnError) {
          throw error;
        }
      }
    }
  }

  async updateLocalUserRecord(localUserId, supabaseId) {
    try {
      await this.prisma.users.update({
        where: { id: localUserId },
        data: {
          supabase_id: supabaseId,
          migrated_at: new Date(),
          migration_status: 'completed'
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to update local user record ${localUserId}:`, error);
    }
  }

  async migrateUserRoles(supabaseUserId, roles) {
    try {
      // This would depend on your specific role system implementation
      // For now, we'll log the roles that need to be migrated
      this.logger.info(`Migrating roles for Supabase user ${supabaseUserId}: ${roles.join(', ')}`);
      
      // You might want to store roles in user_metadata or a separate table
      await this.supabase.auth.admin.updateUserById(supabaseUserId, {
        user_metadata: {
          roles: roles
        }
      });
      
    } catch (error) {
      this.logger.warn(`Failed to migrate roles for user ${supabaseUserId}:`, error);
    }
  }

  async validateMigration() {
    this.logger.info('🔍 Running post-migration validation...');
    
    // Count users in Supabase Auth
    const { data: supabaseUsers, error } = await this.supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }
    
    // Count migrated users in local database
    const migratedCount = await this.prisma.users.count({
      where: {
        migration_status: 'completed',
        supabase_id: { not: null }
      }
    });
    
    const validationResults = {
      supabaseUsersCount: supabaseUsers.users.length,
      localMigratedCount: migratedCount,
      migrationSuccessCount: this.migrationStats.success,
      migrationFailedCount: this.migrationStats.failed,
      migrationSkippedCount: this.migrationStats.skipped
    };
    
    this.logger.info('✅ Post-migration validation results:', validationResults);
    
    // Check for data consistency
    if (validationResults.supabaseUsersCount !== validationResults.localMigratedCount) {
      this.logger.warn('⚠️ Inconsistency detected between Supabase and local records');
    }
    
    return validationResults;
  }

  async generateReport() {
    const duration = this.migrationStats.endTime - this.migrationStats.startTime;
    const durationMinutes = Math.round(duration / 60000);
    
    const report = {
      summary: {
        ...this.migrationStats,
        duration: duration,
        durationMinutes: durationMinutes,
        successRate: Math.round((this.migrationStats.success / this.migrationStats.total) * 100)
      },
      details: {
        dryRun: this.options.dryRun,
        batchSize: this.options.batchSize,
        skippedBackup: this.options.skipBackup,
        continueOnError: this.options.continueOnError
      }
    };
    
    this.logger.info('📊 Migration Report:', report);
    
    // Save detailed log
    await this.logger.saveToFile(`migration-report-${Date.now()}.json`);
    
    return report;
  }

  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  generateSecurePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  if (args.includes('--dry-run')) {
    options.dryRun = true;
  }
  
  if (args.includes('--skip-backup')) {
    options.skipBackup = true;
  }
  
  if (args.includes('--continue-on-error')) {
    options.continueOnError = true;
  }
  
  const batchSizeIndex = args.findIndex(arg => arg.startsWith('--batch-size='));
  if (batchSizeIndex !== -1) {
    options.batchSize = parseInt(args[batchSizeIndex].split('=')[1]);
  }
  
  console.log('🚀 Starting User Migration to Supabase Auth');
  console.log('Options:', options);
  
  const executor = new UserMigrationExecutor(options);
  executor.executeMigration()
    .then((result) => {
      console.log('\n✅ Migration completed successfully!');
      console.log('Summary:', result.summary);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = UserMigrationExecutor;