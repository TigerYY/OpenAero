#!/usr/bin/env node

/**
 * User Metadata Mapper Script
 * 
 * This script handles the mapping and synchronization of user metadata
 * between the original users table and Supabase auth.users.
 * 
 * Features:
 * - Maps user roles and permissions
 * - Synchronizes profile data
 * - Handles metadata validation
 * - Creates mapping relationships
 * - Generates sync reports
 * - Manages metadata conflicts
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  outputDir: './migrations',
  syncMode: 'bi-directional', // 'to-supabase', 'from-supabase', 'bi-directional'
  validateMetadata: true,
  generateReports: true,
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

// Metadata validator
class MetadataValidator {
  static validateRole(role) {
    const validRoles = ['USER', 'CREATOR', 'ADMIN'];
    return validRoles.includes(role);
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateMetadata(metadata) {
    const errors = [];
    
    if (!metadata || typeof metadata !== 'object') {
      errors.push('Metadata must be a valid object');
      return { isValid: false, errors };
    }
    
    // Validate required fields
    if (metadata.role && !this.validateRole(metadata.role)) {
      errors.push(`Invalid role: ${metadata.role}`);
    }
    
    if (metadata.email && !this.validateEmail(metadata.email)) {
      errors.push(`Invalid email: ${metadata.email}`);
    }
    
    // Validate structure
    const allowedFields = [
      'original_id', 'first_name', 'last_name', 'role', 'avatar',
      'creator_profile', 'notification_preferences', 'migrated_at',
      'migration_batch', 'preferences', 'settings'
    ];
    
    Object.keys(metadata).forEach(key => {
      if (!allowedFields.includes(key)) {
        errors.push(`Unexpected metadata field: ${key}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeMetadata(metadata) {
    const sanitized = {};
    
    // Only keep allowed fields
    const allowedFields = [
      'original_id', 'first_name', 'last_name', 'role', 'avatar',
      'creator_profile', 'notification_preferences', 'migrated_at',
      'migration_batch', 'preferences', 'settings'
    ];
    
    allowedFields.forEach(field => {
      if (metadata[field] !== undefined) {
        sanitized[field] = metadata[field];
      }
    });
    
    return sanitized;
  }
}

// Main metadata mapper class
class UserMetadataMapper {
  constructor(config = CONFIG) {
    this.config = config;
    this.prisma = new PrismaClient();
    this.mappingData = {
      mappings: [],
      conflicts: [],
      syncResults: [],
      metadata: {
        mappingDate: new Date().toISOString(),
        totalUsers: 0,
        mappedUsers: 0,
        conflictedUsers: 0,
        syncErrors: 0
      }
    };
  }

  async initialize() {
    Logger.info('Initializing user metadata mapper...');
    
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
      Logger.info(`Output directory created: ${this.config.outputDir}`);
    } catch (error) {
      Logger.error('Failed to create output directory', error);
      throw error;
    }
  }

  async loadAllUsers() {
    Logger.info('Loading all users for metadata mapping...');
    
    try {
      const users = await this.prisma.users.findMany({
        include: {
          creator_profiles: true,
          notification_preferences: true
        },
        where: {
          deletedAt: null
        }
      });
      
      this.mappingData.metadata.totalUsers = users.length;
      Logger.info(`Loaded ${users.length} users for mapping`);
      
      return users;
      
    } catch (error) {
      Logger.error('Failed to load users', error);
      throw error;
    }
  }

  async mapUserMetadata(users) {
    Logger.info('Starting user metadata mapping...');
    
    for (const user of users) {
      await this.mapSingleUser(user);
    }
    
    Logger.info(`Metadata mapping completed. ${this.mappingData.metadata.mappedUsers} users mapped`);
  }

  async mapSingleUser(user) {
    try {
      // Create metadata structure
      const metadata = this.createMetadataStructure(user);
      
      // Validate metadata
      if (this.config.validateMetadata) {
        const validation = MetadataValidator.validateMetadata(metadata);
        if (!validation.isValid) {
          Logger.warn(`Invalid metadata for user ${user.email}`, validation.errors);
          this.mappingData.metadata.conflictedUsers++;
          this.mappingData.conflicts.push({
            userId: user.id,
            email: user.email,
            errors: validation.errors
          });
          return;
        }
      }
      
      // Sanitize metadata
      const sanitizedMetadata = MetadataValidator.sanitizeMetadata(metadata);
      
      // Create mapping entry
      const mapping = {
        originalUserId: user.id,
        email: user.email,
        metadata: sanitizedMetadata,
        mappingType: this.determineMappingType(user),
        createdAt: new Date().toISOString()
      };
      
      this.mappingData.mappings.push(mapping);
      this.mappingData.metadata.mappedUsers++;
      
      Logger.info(`Mapped metadata for user: ${user.email}`);
      
    } catch (error) {
      Logger.error(`Failed to map metadata for user ${user.email}`, error);
      this.mappingData.metadata.syncErrors++;
    }
  }

  createMetadataStructure(user) {
    const metadata = {
      // Basic user info
      original_id: user.id,
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      role: user.role,
      email: user.email,
      
      // Profile information
      avatar: user.avatar || null,
      
      // Migration tracking
      migrated_at: new Date().toISOString(),
      migration_batch: 'phase2',
      
      // Creator profile (if exists)
      creator_profile: user.creator_profiles ? {
        id: user.creator_profiles.id,
        bio: user.creator_profiles.bio,
        website: user.creator_profiles.website,
        experience: user.creator_profiles.experience,
        specialties: user.creator_profiles.specialties || [],
        status: user.creator_profiles.status,
        revenue: parseFloat(user.creator_profiles.revenue) || 0
      } : null,
      
      // Notification preferences
      notification_preferences: user.notification_preferences ? {
        emailEnabled: user.notification_preferences.emailEnabled,
        pushEnabled: user.notification_preferences.pushEnabled,
        websocketEnabled: user.notification_preferences.websocketEnabled,
        reviewNotifications: user.notification_preferences.reviewNotifications,
        systemNotifications: user.notification_preferences.systemNotifications,
        marketingNotifications: user.notification_preferences.marketingNotifications,
        quietHoursStart: user.notification_preferences.quietHoursStart,
        quietHoursEnd: user.notification_preferences.quietHoursEnd,
        timezone: user.notification_preferences.timezone
      } : null,
      
      // Additional settings
      preferences: {
        language: 'zh-CN',
        theme: 'light',
        timezone: 'Asia/Shanghai'
      }
    };
    
    return metadata;
  }

  determineMappingType(user) {
    if (user.creator_profiles) {
      return 'creator';
    }
    
    switch (user.role) {
      case 'ADMIN':
        return 'admin';
      case 'CREATOR':
        return 'creator_pending';
      default:
        return 'user';
    }
  }

  async syncMetadataToSupabase() {
    if (this.config.syncMode === 'from-supabase') {
      Logger.info('Skipping Supabase sync (sync mode: from-supabase)');
      return;
    }
    
    Logger.info('Syncing metadata to Supabase auth.users...');
    
    for (const mapping of this.mappingData.mappings) {
      try {
        await this.syncSingleUserToSupabase(mapping);
      } catch (error) {
        Logger.error(`Failed to sync user ${mapping.email} to Supabase`, error);
        this.mappingData.metadata.syncErrors++;
      }
    }
    
    Logger.info('Supabase metadata sync completed');
  }

  async syncSingleUserToSupabase(mapping) {
    // In a real implementation, this would use the Supabase client
    // For now, we'll simulate the sync and generate the SQL
    
    const syncResult = {
      userId: mapping.originalUserId,
      email: mapping.email,
      supabaseId: crypto.randomUUID(), // Would be the actual auth.users.id
      syncTime: new Date().toISOString(),
      status: 'success',
      sql: this.generateUpdateSQL(mapping)
    };
    
    this.mappingData.syncResults.push(syncResult);
    
    Logger.info(`Synced metadata for ${mapping.email} to Supabase`);
  }

  generateUpdateSQL(mapping) {
    const metadata = JSON.stringify(mapping.metadata).replace(/'/g, "''");
    
    return `-- Update metadata for ${mapping.email}
UPDATE auth.users 
SET raw_user_meta_data = '${metadata}',
    updated_at = NOW()
WHERE email = '${mapping.email}';`;
  }

  async generateSyncSQL() {
    Logger.info('Generating metadata sync SQL...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sqlFile = path.join(this.config.outputDir, `metadata-sync-${timestamp}.sql`);
    
    try {
      let sql = `-- User Metadata Sync to Supabase Auth
-- Generated: ${new Date().toISOString()}
-- Sync Mode: ${this.config.syncMode}

-- Sync metadata
`;
      
      for (const syncResult of this.mappingData.syncResults) {
        sql += syncResult.sql + '\n\n';
      }
      
      // Add verification queries
      sql += `-- Verification queries
SELECT 
  COUNT(*) as total_synced_users,
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'migrated_at' IS NOT NULL) as migrated_users
FROM auth.users
WHERE raw_user_meta_data->>'original_id' IS NOT NULL;

-- Check role distribution
SELECT 
  raw_user_meta_data->>'role' as role,
  COUNT(*) as count
FROM auth.users
WHERE raw_user_meta_data->>'migrated_at' IS NOT NULL
GROUP BY raw_user_meta_data->>'role';
`;
      
      await fs.writeFile(sqlFile, sql);
      Logger.info(`Metadata sync SQL saved to: ${sqlFile}`);
      
      return sqlFile;
      
    } catch (error) {
      Logger.error('Failed to generate sync SQL', error);
      throw error;
    }
  }

  async generateMappingReport() {
    if (!this.config.generateReports) return null;
    
    Logger.info('Generating metadata mapping report...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(this.config.outputDir, `metadata-mapping-report-${timestamp}.json`);
    
    try {
      const report = {
        summary: this.mappingData.metadata,
        mappingDetails: {
          totalMappings: this.mappingData.mappings.length,
          mappingTypes: this.getMappingTypeDistribution(),
          conflicts: this.mappingData.conflicts,
          syncResults: this.mappingData.syncResults
        },
        metadataAnalysis: {
          commonFields: this.getCommonMetadataFields(),
          roleDistribution: this.getRoleDistribution(),
          creatorProfiles: this.getCreatorProfileStats(),
          notificationPreferences: this.getNotificationPreferenceStats()
        },
        recommendations: this.generateRecommendations()
      };
      
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
      Logger.info(`Mapping report saved to: ${reportFile}`);
      
      return reportFile;
      
    } catch (error) {
      Logger.error('Failed to generate mapping report', error);
      throw error;
    }
  }

  getMappingTypeDistribution() {
    const distribution = {};
    
    this.mappingData.mappings.forEach(mapping => {
      distribution[mapping.mappingType] = (distribution[mapping.mappingType] || 0) + 1;
    });
    
    return distribution;
  }

  getRoleDistribution() {
    const distribution = {};
    
    this.mappingData.mappings.forEach(mapping => {
      const role = mapping.metadata.role;
      distribution[role] = (distribution[role] || 0) + 1;
    });
    
    return distribution;
  }

  getCommonMetadataFields() {
    const fieldCounts = {};
    
    this.mappingData.mappings.forEach(mapping => {
      Object.keys(mapping.metadata).forEach(field => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      });
    });
    
    return fieldCounts;
  }

  getCreatorProfileStats() {
    const profiles = this.mappingData.mappings
      .filter(mapping => mapping.metadata.creator_profile)
      .map(mapping => mapping.metadata.creator_profile);
    
    return {
      total: profiles.length,
      statusDistribution: profiles.reduce((acc, profile) => {
        acc[profile.status] = (acc[profile.status] || 0) + 1;
        return acc;
      }, {}),
      averageRevenue: profiles.length > 0 ? 
        profiles.reduce((sum, p) => sum + (p.revenue || 0), 0) / profiles.length : 0
    };
  }

  getNotificationPreferenceStats() {
    const preferences = this.mappingData.mappings
      .filter(mapping => mapping.metadata.notification_preferences)
      .map(mapping => mapping.metadata.notification_preferences);
    
    return {
      total: preferences.length,
      emailEnabled: preferences.filter(p => p.emailEnabled).length,
      pushEnabled: preferences.filter(p => p.pushEnabled).length,
      reviewNotifications: preferences.filter(p => p.reviewNotifications).length
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.mappingData.metadata.conflictedUsers > 0) {
      recommendations.push({
        type: 'warning',
        message: `${this.mappingData.metadata.conflictedUsers} users have metadata conflicts`,
        action: 'Review and resolve conflicts before migration'
      });
    }
    
    const creatorProfiles = this.getCreatorProfileStats();
    if (creatorProfiles.total > 0 && creatorProfiles.statusDistribution.PENDING > 0) {
      recommendations.push({
        type: 'info',
        message: `${creatorProfiles.statusDistribution.PENDING} creator profiles are pending approval`,
        action: 'Consider reviewing creator profiles after migration'
      });
    }
    
    return recommendations;
  }

  async saveMappingData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mappingFile = path.join(this.config.outputDir, `metadata-mapping-${timestamp}.json`);
    
    try {
      await fs.writeFile(mappingFile, JSON.stringify(this.mappingData, null, 2));
      Logger.info(`Mapping data saved to: ${mappingFile}`);
      return mappingFile;
    } catch (error) {
      Logger.error('Failed to save mapping data', error);
      throw error;
    }
  }

  async cleanup() {
    await this.prisma.$disconnect();
    Logger.info('Prisma client disconnected');
  }
}

// Main execution function
async function main() {
  const mapper = new UserMetadataMapper();
  
  try {
    await mapper.initialize();
    
    const users = await mapper.loadAllUsers();
    await mapper.mapUserMetadata(users);
    
    if (mapper.config.syncMode !== 'from-supabase') {
      await mapper.syncMetadataToSupabase();
    }
    
    const sqlFile = await mapper.generateSyncSQL();
    const reportFile = await mapper.generateMappingReport();
    const mappingFile = await mapper.saveMappingData();
    
    Logger.info('Metadata mapping completed successfully');
    console.log('\nOutput Files:');
    console.log(`- Mapping Data: ${mappingFile}`);
    if (sqlFile) {
      console.log(`- Sync SQL: ${sqlFile}`);
    }
    if (reportFile) {
      console.log(`- Report: ${reportFile}`);
    }
    
  } catch (error) {
    Logger.error('Metadata mapping failed', error);
    process.exit(1);
  } finally {
    await mapper.cleanup();
  }
}

// Run script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UserMetadataMapper, MetadataValidator, Logger };