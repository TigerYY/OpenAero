#!/usr/bin/env node

/**
 * User Data Transformation Script
 * 
 * This script transforms exported user data for migration to Supabase Auth.
 * It handles data mapping, validation, and preparation for the auth.users table.
 * 
 * Features:
 * - Transforms user data to Supabase Auth format
 * - Generates secure passwords for users without them
 * - Maps user roles and metadata
 * - Creates migration batches
 * - Handles data conflicts
 * - Generates migration SQL
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Configuration
const CONFIG = {
  exportDir: './exports',
  outputDir: './migrations',
  batchSize: 50,
  generatePasswords: true,
  passwordLength: 12,
  generateSQL: true,
  dryRun: false
};

// Logger utility
class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    console.log(`[${timestamp}] ${level}: ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
    
    return logEntry;
  }

  static info(message, data) { return this.log('INFO', message, data); }
  static warn(message, data) { return this.log('WARN', message, data); }
  static error(message, data) { return this.log('ERROR', message, data); }
}

// Data transformer class
class UserDataTransformer {
  constructor(config = CONFIG) {
    this.config = config;
    this.transformData = {
      users: [],
      batches: [],
      metadata: {
        transformDate: new Date().toISOString(),
        totalUsers: 0,
        transformedUsers: 0,
        failedUsers: 0,
        generatedPasswords: 0,
        conflicts: [],
        errors: []
      }
    };
    this.logs = [];
  }

  async initialize() {
    Logger.info('Initializing user data transformation...');
    
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
      Logger.info(`Output directory created: ${this.config.outputDir}`);
    } catch (error) {
      Logger.error('Failed to create output directory', error);
      throw error;
    }
  }

  async loadExportData(exportFile) {
    Logger.info(`Loading export data from: ${exportFile}`);
    
    try {
      const data = await fs.readFile(exportFile, 'utf8');
      const exportData = JSON.parse(data);
      
      if (!exportData.users || !Array.isArray(exportData.users)) {
        throw new Error('Invalid export data format');
      }
      
      Logger.info(`Loaded ${exportData.users.length} users for transformation`);
      return exportData;
      
    } catch (error) {
      Logger.error('Failed to load export data', error);
      throw error;
    }
  }

  async transformUsers(exportData) {
    Logger.info('Starting user data transformation...');
    
    const users = exportData.users;
    this.transformData.metadata.totalUsers = users.length;
    
    // Check for conflicts first
    await this.detectConflicts(users);
    
    // Transform users in batches
    for (let i = 0; i < users.length; i += this.config.batchSize) {
      const batch = users.slice(i, i + this.config.batchSize);
      const batchNumber = Math.floor(i / this.config.batchSize) + 1;
      
      Logger.info(`Processing batch ${batchNumber} (${batch.length} users)`);
      
      const transformedBatch = await this.transformBatch(batch, batchNumber);
      this.transformData.batches.push(transformedBatch);
      
      // Save batch progress
      if (!this.config.dryRun) {
        await this.saveBatchProgress(transformedBatch, batchNumber);
      }
    }
    
    Logger.info(`Transformation completed. ${this.transformData.metadata.transformedUsers} users transformed`);
  }

  async detectConflicts(users) {
    Logger.info('Detecting data conflicts...');
    
    const emailMap = new Map();
    const conflicts = [];
    
    users.forEach((user, index) => {
      const email = user.email.toLowerCase();
      
      if (emailMap.has(email)) {
        const existingIndex = emailMap.get(email);
        conflicts.push({
          type: 'duplicate_email',
          email,
          users: [existingIndex, index],
          message: `Duplicate email found: ${email}`
        });
      } else {
        emailMap.set(email, index);
      }
    });
    
    // Check for invalid data
    users.forEach((user, index) => {
      if (!user.email || !user.email.includes('@')) {
        conflicts.push({
          type: 'invalid_email',
          userIndex: index,
          email: user.email,
          message: `Invalid email format: ${user.email}`
        });
      }
      
      if (!user.role || !['USER', 'CREATOR', 'ADMIN'].includes(user.role)) {
        conflicts.push({
          type: 'invalid_role',
          userIndex: index,
          role: user.role,
          message: `Invalid role: ${user.role}`
        });
      }
    });
    
    this.transformData.metadata.conflicts = conflicts;
    
    if (conflicts.length > 0) {
      Logger.warn(`Found ${conflicts.length} conflicts that need resolution`);
      conflicts.forEach(conflict => {
        Logger.warn(conflict.message);
      });
    } else {
      Logger.info('No conflicts detected');
    }
  }

  async transformBatch(batch, batchNumber) {
    const transformedBatch = {
      batchNumber,
      users: [],
      metadata: {
        startTime: new Date().toISOString(),
        userCount: batch.length,
        transformedCount: 0,
        failedCount: 0
      }
    };
    
    for (const user of batch) {
      try {
        const transformedUser = await this.transformSingleUser(user);
        transformedBatch.users.push(transformedUser);
        transformedBatch.metadata.transformedCount++;
        this.transformData.metadata.transformedUsers++;
        
        Logger.info(`Transformed user: ${user.email}`);
        
      } catch (error) {
        Logger.error(`Failed to transform user ${user.email}`, error);
        transformedBatch.metadata.failedCount++;
        this.transformData.metadata.failedUsers++;
        this.transformData.metadata.errors.push({
          email: user.email,
          error: error.message,
          batchNumber
        });
      }
    }
    
    transformedBatch.metadata.endTime = new Date().toISOString();
    return transformedBatch;
  }

  async transformSingleUser(user) {
    // Generate Supabase Auth compatible user data
    const supabaseUser = {
      // Core auth fields
      id: crypto.randomUUID(), // Generate new UUID for auth.users
      email: user.email.toLowerCase(),
      email_confirmed_at: user.email_verified ? new Date().toISOString() : null,
      
      // Password handling
      password_hash: await this.generatePasswordHash(user),
      
      // Metadata
      raw_user_meta_data: {
        original_id: user.original_id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role,
        avatar: user.avatar || null,
        migrated_at: new Date().toISOString(),
        migration_batch: 'phase2'
      },
      
      // Additional metadata
      is_super_admin: user.role === 'ADMIN',
      
      // Timestamps
      created_at: user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sign_in_at: user.email_verified ? new Date().toISOString() : null,
      
      // Provider info (email only)
      provider: 'email',
      providers: ['email']
    };

    // Add profile data if exists
    if (user.creator_profile) {
      supabaseUser.raw_user_meta_data.creator_profile = user.creator_profile;
    }
    
    if (user.notification_preferences) {
      supabaseUser.raw_user_meta_data.notification_preferences = user.notification_preferences;
    }

    return supabaseUser;
  }

  async generatePasswordHash(user) {
    // If user has a password in original data, use it
    if (user.password && user.password !== '') {
      try {
        // Check if it's already a hash (bcrypt hashes start with $2b$ or $2a$)
        if (user.password.startsWith('$2')) {
          return user.password;
        }
        
        // Hash the plain password
        return await bcrypt.hash(user.password, 10);
      } catch (error) {
        Logger.warn(`Failed to hash existing password for ${user.email}, generating new one`);
      }
    }
    
    // Generate a secure random password
    if (this.config.generatePasswords) {
      const password = this.generateSecurePassword(this.config.passwordLength);
      const hash = await bcrypt.hash(password, 10);
      
      // Store the generated password for later notification
      this.transformData.metadata.generatedPasswords++;
      
      // Add to generated passwords list for user notification
      if (!this.transformData.generatedPasswords) {
        this.transformData.generatedPasswords = [];
      }
      this.transformData.generatedPasswords.push({
        email: user.email,
        original_id: user.original_id,
        password: password
      });
      
      return hash;
    }
    
    throw new Error('No password available and password generation is disabled');
  }

  generateSecurePassword(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  async saveBatchProgress(batch, batchNumber) {
    const batchFile = path.join(this.config.outputDir, `batch-${batchNumber}-transformed.json`);
    
    try {
      await fs.writeFile(batchFile, JSON.stringify(batch, null, 2));
      Logger.info(`Saved batch ${batchNumber} to: ${batchFile}`);
    } catch (error) {
      Logger.error(`Failed to save batch ${batchNumber}`, error);
    }
  }

  async generateMigrationSQL() {
    if (!this.config.generateSQL) return null;
    
    Logger.info('Generating migration SQL...');
    
    const sqlFile = path.join(this.config.outputDir, `user-migration-${Date.now()}.sql`);
    
    try {
      let sql = this.generateSQLHeader();
      
      // Generate SQL for each batch
      for (const batch of this.transformData.batches) {
        sql += this.generateBatchSQL(batch);
      }
      
      sql += this.generateSQLFooter();
      
      await fs.writeFile(sqlFile, sql);
      Logger.info(`Migration SQL saved to: ${sqlFile}`);
      
      return sqlFile;
      
    } catch (error) {
      Logger.error('Failed to generate migration SQL', error);
      throw error;
    }
  }

  generateSQLHeader() {
    return `-- User Migration to Supabase Auth
-- Generated: ${new Date().toISOString()}
-- Migration: Phase 2 - User Data Transformation

-- Migration metadata
DO $$ 
DECLARE
  migration_start TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.user_audit_log (user_id, action, new_values, created_by)
  VALUES (
    'system',
    'MIGRATION_START',
    json_build_object(
      'migration_phase', 'phase2',
      'start_time', migration_start,
      'total_users', ${this.transformData.metadata.totalUsers}
    ),
    'system'
  );
END $$;

-- Disable RLS temporarily for migration
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

`;
  }

  generateBatchSQL(batch) {
    let sql = `-- Batch ${batch.batchNumber}\n`;
    
    batch.users.forEach(user => {
      sql += `INSERT INTO auth.users (
        id,
        email,
        email_confirmed_at,
        password_hash,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        last_sign_in_at,
        provider,
        providers
      ) VALUES (
        '${user.id}',
        '${user.email}',
        ${user.email_confirmed_at ? `'${user.email_confirmed_at}'` : 'NULL'},
        '${user.password_hash}',
        '${JSON.stringify(user.raw_user_meta_data).replace(/'/g, "''")}',
        ${user.is_super_admin},
        '${user.created_at}',
        '${user.updated_at}',
        ${user.last_sign_in_at ? `'${user.last_sign_in_at}'` : 'NULL'},
        '${user.provider}',
        ARRAY['${user.provider}']
      );
`;
    });
    
    sql += '\n';
    return sql;
  }

  generateSQLFooter() {
    return `-- Re-enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Update users table with new auth user IDs
UPDATE public.users u
SET 
  id = a.id::text,
  updated_at = NOW()
FROM auth.users a
WHERE u.email = a.email;

-- Migration completion
DO $$ 
DECLARE
  migration_end TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.user_audit_log (user_id, action, new_values, created_by)
  VALUES (
    'system',
    'MIGRATION_COMPLETE',
    json_build_object(
      'migration_phase', 'phase2',
      'end_time', migration_end,
      'transformed_users', ${this.transformData.metadata.transformedUsers},
      'failed_users', ${this.transformData.metadata.failedUsers}
    ),
    'system'
  );
END $$;

-- Migration statistics
SELECT 
  COUNT(*) as total_auth_users,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as verified_users,
  COUNT(*) FILTER (WHERE is_super_admin = true) as admin_users
FROM auth.users
WHERE raw_user_meta_data->>'migrated_at' IS NOT NULL;

`;
  }

  async saveTransformationData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const transformFile = path.join(this.config.outputDir, `transform-${timestamp}.json`);
    const passwordsFile = path.join(this.config.outputDir, `generated-passwords-${timestamp}.json`);
    
    try {
      // Save transformation data
      await fs.writeFile(transformFile, JSON.stringify(this.transformData, null, 2));
      Logger.info(`Transformation data saved to: ${transformFile}`);
      
      // Save generated passwords (separate secure file)
      if (this.transformData.generatedPasswords && this.transformData.generatedPasswords.length > 0) {
        await fs.writeFile(passwordsFile, JSON.stringify({
          generated_at: new Date().toISOString(),
          passwords: this.transformData.generatedPasswords
        }, null, 2));
        Logger.info(`Generated passwords saved to: ${passwordsFile}`);
      }
      
      return {
        transformFile,
        passwordsFile: this.transformData.generatedPasswords?.length > 0 ? passwordsFile : null
      };
      
    } catch (error) {
      Logger.error('Failed to save transformation data', error);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  const exportFile = args[0];
  
  if (!exportFile) {
    console.error('Usage: node transform-user-data.js <export-file>');
    process.exit(1);
  }
  
  const transformer = new UserDataTransformer();
  
  try {
    await transformer.initialize();
    
    const exportData = await transformer.loadExportData(exportFile);
    await transformer.transformUsers(exportData);
    
    const sqlFile = await transformer.generateMigrationSQL();
    const files = await transformer.saveTransformationData();
    
    Logger.info('Transformation completed successfully');
    console.log('\nOutput Files:');
    console.log(`- Transform Data: ${files.transformFile}`);
    if (files.passwordsFile) {
      console.log(`- Generated Passwords: ${files.passwordsFile}`);
    }
    if (sqlFile) {
      console.log(`- Migration SQL: ${sqlFile}`);
    }
    
  } catch (error) {
    Logger.error('Transformation failed', error);
    process.exit(1);
  }
}

// Run script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UserDataTransformer, Logger };