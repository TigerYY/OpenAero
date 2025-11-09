#!/usr/bin/env node

/**
 * User Data Export Script
 * 
 * This script exports existing user data from the custom users table
 * in preparation for migration to Supabase Auth.
 * 
 * Features:
 * - Exports user data with all required fields
 * - Validates data integrity
 * - Generates migration-ready JSON
 * - Creates detailed export reports
 * - Handles large datasets with pagination
 * - Preserves data relationships
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  exportDir: './exports',
  batchSize: 100,
  includeDeleted: false,
  generateReport: true,
  validateData: true
};

// Initialize Prisma Client
const prisma = new PrismaClient();

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

// Data validator
class DataValidator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  static validateRole(role) {
    const validRoles = ['USER', 'CREATOR', 'ADMIN'];
    return validRoles.includes(role);
  }

  static validateUser(user) {
    const errors = [];
    
    if (!user.id) errors.push('Missing user ID');
    else if (!this.validateUUID(user.id)) errors.push('Invalid user ID format');
    
    if (!user.email) errors.push('Missing email');
    else if (!this.validateEmail(user.email)) errors.push('Invalid email format');
    
    if (!user.role) errors.push('Missing role');
    else if (!this.validateRole(user.role)) errors.push('Invalid role');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Main export class
class UserDataExporter {
  constructor(config = CONFIG) {
    this.config = config;
    this.exportData = {
      users: [],
      metadata: {
        exportDate: new Date().toISOString(),
        totalCount: 0,
        validCount: 0,
        invalidCount: 0,
        skippedCount: 0,
        errors: []
      }
    };
    this.logs = [];
  }

  async initialize() {
    Logger.info('Initializing user data export...');
    
    // Create export directory
    try {
      await fs.mkdir(this.config.exportDir, { recursive: true });
      Logger.info(`Export directory created: ${this.config.exportDir}`);
    } catch (error) {
      Logger.error('Failed to create export directory', error);
      throw error;
    }
  }

  async exportUsers() {
    Logger.info('Starting user data export...');
    
    try {
      const whereClause = this.config.includeDeleted ? {} : { deletedAt: null };
      const totalUsers = await prisma.users.count({ where: whereClause });
      
      Logger.info(`Found ${totalUsers} users to export`);
      
      // Export users in batches
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const users = await prisma.users.findMany({
          where: whereClause,
          skip: offset,
          take: this.config.batchSize,
          include: {
            creator_profiles: true,
            notification_preferences: true
          }
        });

        if (users.length === 0) {
          hasMore = false;
          break;
        }

        Logger.info(`Processing batch ${Math.floor(offset / this.config.batchSize) + 1} (${users.length} users)`);
        
        for (const user of users) {
          await this.processUser(user);
        }

        offset += this.config.batchSize;
        
        // Stop if we've processed all users
        if (offset >= totalUsers) {
          hasMore = false;
        }
      }

      Logger.info(`Export completed. Processed ${this.exportData.metadata.totalCount} users`);
      
    } catch (error) {
      Logger.error('Failed to export users', error);
      throw error;
    }
  }

  async processUser(user) {
    this.exportData.metadata.totalCount++;
    
    try {
      // Validate user data
      if (this.config.validateData) {
        const validation = DataValidator.validateUser(user);
        if (!validation.isValid) {
          Logger.warn(`Skipping invalid user ${user.id}`, validation.errors);
          this.exportData.metadata.invalidCount++;
          this.exportData.metadata.errors.push({
            userId: user.id,
            email: user.email,
            errors: validation.errors
          });
          return;
        }
      }

      // Transform user data for Supabase Auth
      const transformedUser = this.transformUserData(user);
      
      // Add to export data
      this.exportData.users.push(transformedUser);
      this.exportData.metadata.validCount++;
      
      Logger.info(`Exported user: ${user.email} (${user.role})`);
      
    } catch (error) {
      Logger.error(`Failed to process user ${user.id}`, error);
      this.exportData.metadata.invalidCount++;
      this.exportData.metadata.errors.push({
        userId: user.id,
        email: user.email,
        error: error.message
      });
    }
  }

  transformUserData(user) {
    // Transform user data for Supabase Auth compatibility
    const transformedUser = {
      // Original user data (preserve for rollback)
      original_id: user.id,
      email: user.email,
      first_name: user.firstName || user.email?.split('@')[0] || '',
      last_name: user.lastName || '',
      role: user.role,
      email_verified: user.emailVerified || false,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      
      // Supabase Auth metadata
      user_metadata: {
        original_id: user.id,
        first_name: user.firstName || user.email?.split('@')[0] || '',
        last_name: user.lastName || '',
        role: user.role,
        avatar: user.avatar,
        migrated_at: new Date().toISOString()
      },
      
      // Related data
      creator_profile: user.creator_profiles ? {
        id: user.creator_profiles.id,
        bio: user.creator_profiles.bio,
        website: user.creator_profiles.website,
        experience: user.creator_profiles.experience,
        specialties: user.creator_profiles.specialties,
        status: user.creator_profiles.status,
        revenue: parseFloat(user.creator_profiles.revenue) || 0
      } : null,
      
      notification_preferences: user.notification_preferences ? {
        emailEnabled: user.notification_preferences.emailEnabled,
        pushEnabled: user.notification_preferences.pushEnabled,
        reviewNotifications: user.notification_preferences.reviewNotifications,
        systemNotifications: user.notification_preferences.systemNotifications
      } : null
    };

    return transformedUser;
  }

  async saveExportData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFile = path.join(this.config.exportDir, `users-export-${timestamp}.json`);
    const reportFile = path.join(this.config.exportDir, `export-report-${timestamp}.json`);
    
    try {
      // Save export data
      await fs.writeFile(exportFile, JSON.stringify(this.exportData, null, 2));
      Logger.info(`Export data saved to: ${exportFile}`);
      
      // Save detailed report
      if (this.config.generateReport) {
        const report = this.generateReport();
        await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
        Logger.info(`Export report saved to: ${reportFile}`);
      }
      
      return {
        exportFile,
        reportFile
      };
      
    } catch (error) {
      Logger.error('Failed to save export data', error);
      throw error;
    }
  }

  generateReport() {
    return {
      summary: this.exportData.metadata,
      exportDetails: {
        configuration: this.config,
        exportDate: new Date().toISOString(),
        duration: this.logs.length > 0 ? 
          this.logs[this.logs.length - 1].timestamp - this.logs[0].timestamp : 
          0
      },
      dataQuality: {
        validationErrors: this.exportData.metadata.errors,
        duplicateEmails: this.findDuplicateEmails(),
        roleDistribution: this.getRoleDistribution(),
        verificationStatus: this.getVerificationStatus()
      },
      recommendations: this.generateRecommendations()
    };
  }

  findDuplicateEmails() {
    const emailCounts = {};
    const duplicates = [];
    
    this.exportData.users.forEach(user => {
      emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
    });
    
    Object.entries(emailCounts).forEach(([email, count]) => {
      if (count > 1) {
        duplicates.push({ email, count });
      }
    });
    
    return duplicates;
  }

  getRoleDistribution() {
    const distribution = {};
    
    this.exportData.users.forEach(user => {
      distribution[user.role] = (distribution[user.role] || 0) + 1;
    });
    
    return distribution;
  }

  getVerificationStatus() {
    const verified = this.exportData.users.filter(u => u.email_verified).length;
    const total = this.exportData.users.length;
    
    return {
      verified,
      unverified: total - verified,
      verificationRate: total > 0 ? (verified / total * 100).toFixed(2) + '%' : '0%'
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const metadata = this.exportData.metadata;
    
    if (metadata.invalidCount > 0) {
      recommendations.push({
        type: 'warning',
        message: `${metadata.invalidCount} users have validation errors and will not be migrated`,
        action: 'Review and fix validation errors before migration'
      });
    }
    
    const duplicates = this.findDuplicateEmails();
    if (duplicates.length > 0) {
      recommendations.push({
        type: 'error',
        message: `Found ${duplicates.length} duplicate email addresses`,
        action: 'Resolve duplicate emails before migration'
      });
    }
    
    const unverifiedRate = (metadata.totalCount - this.exportData.users.filter(u => u.email_verified).length) / metadata.totalCount;
    if (unverifiedRate > 0.5) {
      recommendations.push({
        type: 'info',
        message: `${(unverifiedRate * 100).toFixed(1)}% of users have unverified emails`,
        action: 'Consider implementing email verification after migration'
      });
    }
    
    return recommendations;
  }

  async cleanup() {
    await prisma.$disconnect();
    Logger.info('Prisma client disconnected');
  }
}

// Main execution function
async function main() {
  const exporter = new UserDataExporter();
  
  try {
    await exporter.initialize();
    await exporter.exportUsers();
    const files = await exporter.saveExportData();
    
    Logger.info('Export completed successfully');
    console.log('\nExport Files:');
    console.log(`- Data: ${files.exportFile}`);
    console.log(`- Report: ${files.reportFile}`);
    
  } catch (error) {
    Logger.error('Export failed', error);
    process.exit(1);
  } finally {
    await exporter.cleanup();
  }
}

// Run script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UserDataExporter, DataValidator, Logger };