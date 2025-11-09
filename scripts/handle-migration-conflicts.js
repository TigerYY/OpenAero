#!/usr/bin/env node

/**
 * Migration Conflict Handler
 * Enhanced conflict resolution for user migration to Supabase Auth
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const { MigrationLogger } = require('./migration-logger');
const crypto = require('crypto');

class MigrationConflictHandler {
  constructor(options = {}) {
    this.options = {
      autoResolve: options.autoResolve || false,
      dryRun: options.dryRun || false,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      ...options
    };

    this.supabase = createClient(
      this.options.supabaseUrl,
      this.options.supabaseKey
    );
    
    this.prisma = new PrismaClient();
    this.logger = new MigrationLogger('migration-conflicts');
    
    this.conflictStats = {
      total: 0,
      resolved: 0,
      autoResolved: 0,
      manualReview: 0,
      failed: 0
    };
  }

  async resolveAllConflicts(userData) {
    this.logger.info('🔧 Starting conflict resolution for migration...');
    
    const resolvedData = {
      users: userData.users,
      conflicts: [],
      resolutions: []
    };

    try {
      // Check for conflicts with existing Supabase users
      await this.resolveEmailConflicts(resolvedData);
      
      // Check for data format conflicts
      await this.resolveDataFormatConflicts(resolvedData);
      
      // Check for metadata conflicts
      await this.resolveMetadataConflicts(resolvedData);
      
      // Check for role conflicts
      await this.resolveRoleConflicts(resolvedData);
      
      this.generateConflictReport(resolvedData);
      
      this.logger.info(`✅ Conflict resolution completed. Resolved: ${this.conflictStats.resolved}, Manual review: ${this.conflictStats.manualReview}`);
      
      return resolvedData;
      
    } catch (error) {
      this.logger.error('❌ Conflict resolution failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async resolveEmailConflicts(data) {
    this.logger.info('📧 Resolving email conflicts...');
    
    // Get existing emails in Supabase
    const { data: existingUsers, error } = await this.supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }
    
    const existingEmails = new Set(
      existingUsers.users.map(user => user.email.toLowerCase())
    );
    
    const conflicts = [];
    
    for (let i = 0; i < data.users.length; i++) {
      const user = data.users[i];
      const email = user.email?.toLowerCase();
      
      if (!email) {
        // Handle missing email
        const resolution = this.handleMissingEmail(user, i);
        if (resolution) {
          conflicts.push(resolution);
          data.users[i] = resolution.updatedUser;
        }
        continue;
      }
      
      if (existingEmails.has(email)) {
        // Handle duplicate email
        const resolution = await this.handleDuplicateEmail(user, i, existingUsers);
        conflicts.push(resolution);
        
        if (resolution.action === 'update') {
          data.users[i] = resolution.updatedUser;
        } else if (resolution.action === 'skip') {
          data.users[i] = null; // Mark for removal
        }
      }
    }
    
    // Remove null entries (skipped users)
    data.users = data.users.filter(user => user !== null);
    
    data.conflicts.push(...conflicts);
    this.conflictStats.total += conflicts.length;
    this.conflictStats.resolved += conflicts.filter(c => c.autoResolved).length;
    this.conflictStats.autoResolved += conflicts.filter(c => c.autoResolved).length;
    this.conflictStats.manualReview += conflicts.filter(c => !c.autoResolved).length;
  }

  handleMissingEmail(user, index) {
    const tempEmail = `temp_${crypto.randomUUID().substring(0, 8)}@openaero.cn`;
    
    const conflict = {
      type: 'missing_email',
      severity: 'high',
      userIndex: index,
      userId: user.id,
      description: 'User missing email address',
      action: 'update',
      autoResolved: true,
      resolution: {
        strategy: 'generate_temp_email',
        newEmail: tempEmail,
        requiresManualAction: true,
        note: 'Temporary email generated - user must update email after migration'
      }
    };
    
    return {
      conflict,
      updatedUser: {
        ...user,
        email: tempEmail,
        email_confirmed: false,
        metadata: {
          ...user.metadata,
          temp_email_generated: true,
          original_email_missing: true
        }
      }
    };
  }

  async handleDuplicateEmail(user, index, existingSupabaseUsers) {
    const existingUser = existingSupabaseUsers.users.find(u => u.email === user.email);
    
    // Try to match by other criteria to see if it's the same user
    const isSameUser = await this.checkIfSameUser(user, existingUser);
    
    if (isSameUser) {
      // Same user - skip migration
      return {
        type: 'duplicate_email_same_user',
        severity: 'low',
        userIndex: index,
        userId: user.id,
        supabaseId: existingUser.id,
        description: 'User already exists in Supabase Auth',
        action: 'skip',
        autoResolved: true,
        resolution: {
          strategy: 'skip_existing_user',
          note: 'User already migrated or exists in Supabase'
        }
      };
    } else {
      // Different user with same email - need to resolve
      return await this.resolveDifferentUserWithSameEmail(user, index);
    }
  }

  async checkIfSameUser(localUser, supabaseUser) {
    // Check various criteria to determine if it's the same user
    const criteria = [];
    
    // Check by ID if stored in metadata
    if (supabaseUser.user_metadata?.local_id === localUser.id) {
      criteria.push('id_match');
    }
    
    // Check by creation date (within reasonable tolerance)
    if (localUser.created_at && supabaseUser.created_at) {
      const localDate = new Date(localUser.created_at);
      const supabaseDate = new Date(supabaseUser.created_at);
      const diffHours = Math.abs(localDate - supabaseDate) / (1000 * 60 * 60);
      
      if (diffHours < 24) { // Within 24 hours
        criteria.push('creation_date_close');
      }
    }
    
    // Check by name if available
    if (localUser.name && supabaseUser.user_metadata?.name) {
      if (localUser.name.toLowerCase() === supabaseUser.user_metadata.name.toLowerCase()) {
        criteria.push('name_match');
      }
    }
    
    // Consider it the same user if multiple criteria match
    return criteria.length >= 2;
  }

  async resolveDifferentUserWithSameEmail(user, index) {
    const suffix = `_migrated_${Date.now()}`;
    const newEmail = `${user.email.split('@')[0]}${suffix}@${user.email.split('@')[1]}`;
    
    const conflict = {
      type: 'duplicate_email_different_user',
      severity: 'high',
      userIndex: index,
      userId: user.id,
      originalEmail: user.email,
      description: 'Different user with same email already exists in Supabase',
      action: 'update',
      autoResolved: true,
      resolution: {
        strategy: 'modify_email_with_suffix',
        newEmail,
        requiresManualAction: true,
        note: 'Email modified with suffix - user should update email after migration'
      }
    };
    
    return {
      conflict,
      updatedUser: {
        ...user,
        email: newEmail,
        email_confirmed: false,
        metadata: {
          ...user.metadata,
          original_email: user.email,
          email_modified_for_migration: true
        }
      }
    };
  }

  async resolveDataFormatConflicts(data) {
    this.logger.info('🔄 Resolving data format conflicts...');
    
    const conflicts = [];
    
    for (let i = 0; i < data.users.length; i++) {
      const user = data.users[i];
      const userConflicts = [];
      
      // Validate UUID format
      if (user.id && !this.isValidUUID(user.id)) {
        const newId = crypto.randomUUID();
        userConflicts.push({
          type: 'invalid_uuid',
          resolution: {
            strategy: 'generate_new_uuid',
            oldValue: user.id,
            newValue: newId
          }
        });
        
        user.id = newId;
      }
      
      // Validate email format
      if (user.email && !this.isValidEmail(user.email)) {
        const tempEmail = `invalid_${crypto.randomUUID().substring(0, 8)}@openaero.cn`;
        userConflicts.push({
          type: 'invalid_email_format',
          resolution: {
            strategy: 'generate_temp_email',
            oldValue: user.email,
            newValue: tempEmail
          }
        });
        
        user.email = tempEmail;
      }
      
      // Validate date formats
      if (user.created_at && !this.isValidDate(user.created_at)) {
        user.created_at = new Date().toISOString();
        userConflicts.push({
          type: 'invalid_created_date',
          resolution: {
            strategy: 'use_current_date',
            newValue: user.created_at
          }
        });
      }
      
      if (userConflicts.length > 0) {
        conflicts.push({
          type: 'data_format_conflicts',
          userIndex: i,
          userId: user.id,
          conflicts: userConflicts,
          autoResolved: true,
          description: `${userConflicts.length} data format issues resolved`
        });
      }
    }
    
    data.conflicts.push(...conflicts);
    this.conflictStats.total += conflicts.length;
    this.conflictStats.resolved += conflicts.length;
    this.conflictStats.autoResolved += conflicts.length;
  }

  async resolveMetadataConflicts(data) {
    this.logger.info('📋 Resolving metadata conflicts...');
    
    const conflicts = [];
    
    for (let i = 0; i < data.users.length; i++) {
      const user = data.users[i];
      const metadata = user.user_metadata || {};
      
      // Check metadata size
      const metadataSize = JSON.stringify(metadata).length;
      if (metadataSize > 8000) { // Supabase metadata limit
        const compressed = this.compressMetadata(metadata);
        
        conflicts.push({
          type: 'metadata_too_large',
          userIndex: i,
          userId: user.id,
          originalSize: metadataSize,
          compressedSize: JSON.stringify(compressed).length,
          autoResolved: true,
          resolution: {
            strategy: 'compress_metadata',
            note: 'Metadata compressed to fit within Supabase limits'
          }
        });
        
        user.user_metadata = compressed;
      }
      
      // Check for invalid metadata keys
      const invalidKeys = Object.keys(metadata).filter(key => 
        !/^[a-zA-Z0-9_-]+$/.test(key)
      );
      
      if (invalidKeys.length > 0) {
        const cleaned = this.cleanMetadataKeys(metadata);
        
        conflicts.push({
          type: 'invalid_metadata_keys',
          userIndex: i,
          userId: user.id,
          invalidKeys,
          autoResolved: true,
          resolution: {
            strategy: 'clean_metadata_keys',
            note: 'Invalid metadata keys cleaned'
          }
        });
        
        user.user_metadata = cleaned;
      }
    }
    
    data.conflicts.push(...conflicts);
    this.conflictStats.total += conflicts.length;
    this.conflictStats.resolved += conflicts.length;
    this.conflictStats.autoResolved += conflicts.length;
  }

  async resolveRoleConflicts(data) {
    this.logger.info('👑 Resolving role conflicts...');
    
    const validRoles = ['USER', 'CREATOR', 'ADMIN'];
    const conflicts = [];
    
    for (let i = 0; i < data.users.length; i++) {
      const user = data.users[i];
      const role = user.role || 'USER';
      
      if (!validRoles.includes(role)) {
        const newRole = this.determineAppropriateRole(user);
        
        conflicts.push({
          type: 'invalid_role',
          userIndex: i,
          userId: user.id,
          originalRole: role,
          newRole,
          autoResolved: true,
          resolution: {
            strategy: 'map_to_valid_role',
            note: `Invalid role '${role}' mapped to '${newRole}'`
          }
        });
        
        user.role = newRole;
        user.app_metadata = {
          ...user.app_metadata,
          original_role: role,
          role_mapped_for_migration: true
        };
      }
    }
    
    data.conflicts.push(...conflicts);
    this.conflictStats.total += conflicts.length;
    this.conflictStats.resolved += conflicts.length;
    this.conflictStats.autoResolved += conflicts.length;
  }

  determineAppropriateRole(user) {
    // Determine role based on user data
    if (user.creator_profiles || user.metadata?.is_creator) {
      return 'CREATOR';
    }
    
    if (user.metadata?.is_admin || user.email?.includes('admin')) {
      return 'ADMIN';
    }
    
    return 'USER';
  }

  compressMetadata(metadata) {
    const compressed = {};
    
    // Keep only essential fields
    const essentialFields = [
      'name',
      'avatar_url',
      'bio',
      'local_id',
      'migration_info'
    ];
    
    essentialFields.forEach(field => {
      if (metadata[field] !== undefined) {
        compressed[field] = metadata[field];
      }
    });
    
    // Add migration info
    compressed.migration_info = {
      ...compressed.migration_info,
      metadata_compressed: true,
      original_size: JSON.stringify(metadata).length,
      compressed_at: new Date().toISOString()
    };
    
    return compressed;
  }

  cleanMetadataKeys(metadata) {
    const cleaned = {};
    
    Object.keys(metadata).forEach(key => {
      // Replace invalid characters with underscores
      const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // Ensure key doesn't start with number
      const finalKey = /^\d/.test(cleanKey) ? `_${cleanKey}` : cleanKey;
      
      cleaned[finalKey] = metadata[key];
    });
    
    return cleaned;
  }

  generateConflictReport(data) {
    const report = {
      summary: this.conflictStats,
      conflictTypes: this.getConflictTypeBreakdown(data.conflicts),
      recommendations: this.generateRecommendations(data.conflicts),
      requiresManualAction: data.conflicts.filter(c => 
        c.resolution?.requiresManualAction
      ).length,
      timestamp: new Date().toISOString()
    };
    
    this.logger.info('📊 Conflict resolution report:', report);
    data.resolutionReport = report;
    
    return report;
  }

  getConflictTypeBreakdown(conflicts) {
    const breakdown = {};
    
    conflicts.forEach(conflict => {
      breakdown[conflict.type] = (breakdown[conflict.type] || 0) + 1;
    });
    
    return breakdown;
  }

  generateRecommendations(conflicts) {
    const recommendations = [];
    
    const tempEmailConflicts = conflicts.filter(c => 
      c.resolution?.newEmail?.includes('temp_')
    );
    
    if (tempEmailConflicts.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'contact_users',
        description: `${tempEmailConflicts.length} users have temporary emails`,
        details: 'Users should be contacted to update their email addresses'
      });
    }
    
    const modifiedEmailConflicts = conflicts.filter(c => 
      c.resolution?.email_modified_for_migration
    );
    
    if (modifiedEmailConflicts.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'notify_email_changes',
        description: `${modifiedEmailConflicts.length} users had their emails modified`,
        details: 'Users should be notified about their email changes'
      });
    }
    
    return recommendations;
  }

  // Utility methods
  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const userDataFile = args[0];
  
  if (!userDataFile) {
    console.error('Usage: node handle-migration-conflicts.js <user-data-file>');
    process.exit(1);
  }
  
  const fs = require('fs').promises;
  
  (async () => {
    try {
      const userData = JSON.parse(await fs.readFile(userDataFile, 'utf8'));
      
      const handler = new MigrationConflictHandler({
        autoResolve: args.includes('--auto-resolve'),
        dryRun: args.includes('--dry-run')
      });
      
      const resolvedData = await handler.resolveAllConflicts(userData);
      
      const outputFile = userDataFile.replace('.json', '-resolved.json');
      await fs.writeFile(outputFile, JSON.stringify(resolvedData, null, 2));
      
      console.log(`✅ Conflict resolution completed!`);
      console.log(`📄 Output saved to: ${outputFile}`);
      console.log(`📊 Summary:`, resolvedData.resolutionReport.summary);
      
    } catch (error) {
      console.error('❌ Conflict resolution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = MigrationConflictHandler;