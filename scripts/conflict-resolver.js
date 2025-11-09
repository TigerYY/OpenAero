#!/usr/bin/env node

/**
 * Conflict Detection and Resolution Script
 * 
 * This script detects and resolves conflicts in user data migration,
 * including duplicate emails, invalid data, and metadata conflicts.
 * 
 * Features:
 * - Detects duplicate email addresses
 * - Identifies invalid user data
 * - Resolves metadata conflicts
 * - Generates resolution strategies
 * - Creates conflict reports
 * - Applies automated fixes
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  outputDir: './migrations',
  conflictDir: './conflicts',
  autoResolve: false, // Set to true to auto-resolve conflicts
  backupConflicts: true,
  generateReports: true,
  resolutionStrategies: {
    duplicate_email: 'merge_with_suffix', // 'merge_with_suffix', 'keep_first', 'keep_last', 'manual'
    invalid_email: 'generate_temp', // 'generate_temp', 'skip', 'manual'
    invalid_role: 'default_to_user', // 'default_to_user', 'skip', 'manual'
    missing_data: 'use_defaults' // 'use_defaults', 'skip', 'manual'
  }
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

// Conflict types and resolutions
const CONFLICT_TYPES = {
  DUPLICATE_EMAIL: 'duplicate_email',
  INVALID_EMAIL: 'invalid_email',
  INVALID_ROLE: 'invalid_role',
  MISSING_DATA: 'missing_data',
  METADATA_CONFLICT: 'metadata_conflict',
  UUID_CONFLICT: 'uuid_conflict'
};

class ConflictResolver {
  constructor(config = CONFIG) {
    this.config = config;
    this.conflicts = {
      detected: [],
      resolved: [],
      unresolved: [],
      autoResolved: [],
      manualReview: []
    };
    this.resolutionStats = {
      totalConflicts: 0,
      resolvedConflicts: 0,
      autoResolvedConflicts: 0,
      manualReviewRequired: 0
    };
  }

  async initialize() {
    Logger.info('Initializing conflict resolver...');
    
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
      await fs.mkdir(this.config.conflictDir, { recursive: true });
      Logger.info(`Directories created: ${this.config.outputDir}, ${this.config.conflictDir}`);
    } catch (error) {
      Logger.error('Failed to create directories', error);
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
      
      Logger.info(`Loaded ${exportData.users.length} users for conflict detection`);
      return exportData;
      
    } catch (error) {
      Logger.error('Failed to load export data', error);
      throw error;
    }
  }

  async detectConflicts(exportData) {
    Logger.info('Starting conflict detection...');
    
    const users = exportData.users;
    
    // Detect different types of conflicts
    await this.detectDuplicateEmails(users);
    await this.detectInvalidEmails(users);
    await this.detectInvalidRoles(users);
    await this.detectMissingData(users);
    await this.detectMetadataConflicts(users);
    await this.detectUUIDConflicts(users);
    
    this.resolutionStats.totalConflicts = this.conflicts.detected.length;
    
    Logger.info(`Conflict detection completed. Found ${this.resolutionStats.totalConflicts} conflicts`);
    
    return this.conflicts.detected;
  }

  async detectDuplicateEmails(users) {
    Logger.info('Detecting duplicate email addresses...');
    
    const emailMap = new Map();
    const duplicates = [];
    
    users.forEach((user, index) => {
      const email = user.email?.toLowerCase();
      
      if (!email) return;
      
      if (emailMap.has(email)) {
        const existingIndex = emailMap.get(email);
        
        const conflict = {
          type: CONFLICT_TYPES.DUPLICATE_EMAIL,
          severity: 'high',
          email,
          users: [
            { index: existingIndex, user: users[existingIndex] },
            { index, user }
          ],
          description: `Duplicate email address: ${email}`,
          suggestedResolution: this.config.resolutionStrategies.duplicate_email
        };
        
        duplicates.push(conflict);
      } else {
        emailMap.set(email, index);
      }
    });
    
    this.conflicts.detected.push(...duplicates);
    Logger.info(`Found ${duplicates.length} duplicate email conflicts`);
  }

  async detectInvalidEmails(users) {
    Logger.info('Detecting invalid email addresses...');
    
    const invalidEmails = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    users.forEach((user, index) => {
      if (!user.email || !emailRegex.test(user.email)) {
        const conflict = {
          type: CONFLICT_TYPES.INVALID_EMAIL,
          severity: 'high',
          email: user.email,
          userIndex: index,
          user,
          description: `Invalid email format: ${user.email || 'missing'}`,
          suggestedResolution: this.config.resolutionStrategies.invalid_email
        };
        
        invalidEmails.push(conflict);
      }
    });
    
    this.conflicts.detected.push(...invalidEmails);
    Logger.info(`Found ${invalidEmails.length} invalid email conflicts`);
  }

  async detectInvalidRoles(users) {
    Logger.info('Detecting invalid user roles...');
    
    const invalidRoles = [];
    const validRoles = ['USER', 'CREATOR', 'ADMIN'];
    
    users.forEach((user, index) => {
      if (!user.role || !validRoles.includes(user.role)) {
        const conflict = {
          type: CONFLICT_TYPES.INVALID_ROLE,
          severity: 'medium',
          role: user.role,
          userIndex: index,
          user,
          description: `Invalid role: ${user.role || 'missing'}`,
          suggestedResolution: this.config.resolutionStrategies.invalid_role
        };
        
        invalidRoles.push(conflict);
      }
    });
    
    this.conflicts.detected.push(...invalidRoles);
    Logger.info(`Found ${invalidRoles.length} invalid role conflicts`);
  }

  async detectMissingData(users) {
    Logger.info('Detecting missing required data...');
    
    const missingData = [];
    
    users.forEach((user, index) => {
      const missingFields = [];
      
      if (!user.id) missingFields.push('id');
      if (!user.email) missingFields.push('email');
      if (!user.role) missingFields.push('role');
      if (!user.createdAt) missingFields.push('createdAt');
      
      if (missingFields.length > 0) {
        const conflict = {
          type: CONFLICT_TYPES.MISSING_DATA,
          severity: 'medium',
          missingFields,
          userIndex: index,
          user,
          description: `Missing required fields: ${missingFields.join(', ')}`,
          suggestedResolution: this.config.resolutionStrategies.missing_data
        };
        
        missingData.push(conflict);
      }
    });
    
    this.conflicts.detected.push(...missingData);
    Logger.info(`Found ${missingData.length} missing data conflicts`);
  }

  async detectMetadataConflicts(users) {
    Logger.info('Detecting metadata conflicts...');
    
    const metadataConflicts = [];
    
    users.forEach((user, index) => {
      // Check for conflicting creator profile data
      if (user.creator_profiles && user.role !== 'CREATOR') {
        const conflict = {
          type: CONFLICT_TYPES.METADATA_CONFLICT,
          severity: 'low',
          conflictType: 'creator_profile_role_mismatch',
          userIndex: index,
          user,
          description: `User has creator profile but role is ${user.role}`,
          suggestedResolution: 'update_role_to_creator'
        };
        
        metadataConflicts.push(conflict);
      }
      
      // Check for metadata size issues
      if (user.user_metadata && JSON.stringify(user.user_metadata).length > 8000) {
        const conflict = {
          type: CONFLICT_TYPES.METADATA_CONFLICT,
          severity: 'medium',
          conflictType: 'metadata_too_large',
          userIndex: index,
          user,
          metadataSize: JSON.stringify(user.user_metadata).length,
          description: `User metadata too large: ${JSON.stringify(user.user_metadata).length} bytes`,
          suggestedResolution: 'compress_metadata'
        };
        
        metadataConflicts.push(conflict);
      }
    });
    
    this.conflicts.detected.push(...metadataConflicts);
    Logger.info(`Found ${metadataConflicts.length} metadata conflicts`);
  }

  async detectUUIDConflicts(users) {
    Logger.info('Detecting UUID conflicts...');
    
    const uuidMap = new Map();
    const uuidConflicts = [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    users.forEach((user, index) => {
      if (!user.id) return;
      
      // Check for invalid UUID format
      if (!uuidRegex.test(user.id)) {
        const conflict = {
          type: CONFLICT_TYPES.UUID_CONFLICT,
          severity: 'medium',
          conflictType: 'invalid_uuid_format',
          userIndex: index,
          user,
          description: `Invalid UUID format: ${user.id}`,
          suggestedResolution: 'generate_new_uuid'
        };
        
        uuidConflicts.push(conflict);
        return;
      }
      
      // Check for duplicate UUIDs
      if (uuidMap.has(user.id)) {
        const existingIndex = uuidMap.get(user.id);
        
        const conflict = {
          type: CONFLICT_TYPES.UUID_CONFLICT,
          severity: 'high',
          conflictType: 'duplicate_uuid',
          uuid: user.id,
          users: [
            { index: existingIndex, user: users[existingIndex] },
            { index, user }
          ],
          description: `Duplicate UUID: ${user.id}`,
          suggestedResolution: 'generate_new_uuid'
        };
        
        uuidConflicts.push(conflict);
      } else {
        uuidMap.set(user.id, index);
      }
    });
    
    this.conflicts.detected.push(...uuidConflicts);
    Logger.info(`Found ${uuidConflicts.length} UUID conflicts`);
  }

  async resolveConflicts() {
    Logger.info('Starting conflict resolution...');
    
    if (this.config.autoResolve) {
      Logger.info('Auto-resolving conflicts...');
      
      for (const conflict of this.conflicts.detected) {
        const resolution = await this.resolveConflict(conflict);
        
        if (resolution.autoResolved) {
          this.conflicts.autoResolved.push(resolution);
          this.resolutionStats.autoResolvedConflicts++;
        } else {
          this.conflicts.manualReview.push(resolution);
          this.resolutionStats.manualReviewRequired++;
        }
      }
    } else {
      Logger.info('Manual resolution mode - all conflicts require review');
      this.conflicts.manualReview = this.conflicts.detected;
      this.resolutionStats.manualReviewRequired = this.conflicts.detected.length;
    }
    
    this.resolutionStats.resolvedConflicts = this.conflicts.autoResolved.length;
    
    Logger.info(`Conflict resolution completed. Auto-resolved: ${this.resolutionStats.autoResolvedConflicts}, Manual review: ${this.resolutionStats.manualReviewRequired}`);
  }

  async resolveConflict(conflict) {
    const resolution = {
      conflict,
      resolution: null,
      autoResolved: false,
      requiresManualReview: false,
      timestamp: new Date().toISOString()
    };
    
    try {
      switch (conflict.type) {
        case CONFLICT_TYPES.DUPLICATE_EMAIL:
          resolution.resolution = await this.resolveDuplicateEmail(conflict);
          break;
        case CONFLICT_TYPES.INVALID_EMAIL:
          resolution.resolution = await this.resolveInvalidEmail(conflict);
          break;
        case CONFLICT_TYPES.INVALID_ROLE:
          resolution.resolution = await this.resolveInvalidRole(conflict);
          break;
        case CONFLICT_TYPES.MISSING_DATA:
          resolution.resolution = await this.resolveMissingData(conflict);
          break;
        case CONFLICT_TYPES.METADATA_CONFLICT:
          resolution.resolution = await this.resolveMetadataConflict(conflict);
          break;
        case CONFLICT_TYPES.UUID_CONFLICT:
          resolution.resolution = await this.resolveUUIDConflict(conflict);
          break;
        default:
          resolution.requiresManualReview = true;
          break;
      }
      
      resolution.autoResolved = !resolution.requiresManualReview;
      
    } catch (error) {
      Logger.error(`Failed to resolve conflict`, error);
      resolution.error = error.message;
      resolution.requiresManualReview = true;
    }
    
    return resolution;
  }

  async resolveDuplicateEmail(conflict) {
    const strategy = conflict.suggestedResolution;
    
    switch (strategy) {
      case 'merge_with_suffix':
        const suffixes = ['_1', '_2', '_3'];
        const resolutions = [];
        
        conflict.users.forEach((userInfo, index) => {
          const suffix = suffixes[index] || `_${index + 1}`;
          const newEmail = `${userInfo.user.email.split('@')[0]}${suffix}@${userInfo.user.email.split('@')[1]}`;
          
          resolutions.push({
            userIndex: userInfo.index,
            originalEmail: userInfo.user.email,
            newEmail,
            action: 'update_email'
          });
        });
        
        return {
          strategy,
          action: 'modify_emails',
          resolutions,
          autoResolved: true
        };
        
      case 'keep_first':
        return {
          strategy,
          action: 'keep_first_duplicate',
          keepUserIndex: conflict.users[0].index,
          removeUserIndices: conflict.users.slice(1).map(u => u.index),
          autoResolved: true
        };
        
      default:
        return { strategy, requiresManualReview: true };
    }
  }

  async resolveInvalidEmail(conflict) {
    const strategy = conflict.suggestedResolution;
    
    switch (strategy) {
      case 'generate_temp':
        const tempEmail = `temp_${crypto.randomUUID().substring(0, 8)}@openaero.cn`;
        return {
          strategy,
          action: 'replace_email',
          userIndex: conflict.userIndex,
          originalEmail: conflict.email,
          newEmail: tempEmail,
          requiresManualReview: true, // Temp emails require manual follow-up
          note: 'Temporary email generated - user should update email'
        };
        
      default:
        return { strategy, requiresManualReview: true };
    }
  }

  async resolveInvalidRole(conflict) {
    const strategy = conflict.suggestedResolution;
    
    switch (strategy) {
      case 'default_to_user':
        return {
          strategy,
          action: 'update_role',
          userIndex: conflict.userIndex,
          originalRole: conflict.role,
          newRole: 'USER',
          autoResolved: true
        };
        
      default:
        return { strategy, requiresManualReview: true };
    }
  }

  async resolveMissingData(conflict) {
    const strategy = conflict.suggestedResolution;
    
    switch (strategy) {
      case 'use_defaults':
        const defaults = {
          id: crypto.randomUUID(),
          role: 'USER',
          createdAt: new Date().toISOString()
        };
        
        const updates = {};
        conflict.missingFields.forEach(field => {
          if (defaults[field]) {
            updates[field] = defaults[field];
          }
        });
        
        return {
          strategy,
          action: 'add_defaults',
          userIndex: conflict.userIndex,
          updates,
          autoResolved: true
        };
        
      default:
        return { strategy, requiresManualReview: true };
    }
  }

  async resolveMetadataConflict(conflict) {
    const strategy = conflict.suggestedResolution;
    
    switch (conflict.conflictType) {
      case 'creator_profile_role_mismatch':
        return {
          strategy: 'update_role_to_creator',
          action: 'update_role',
          userIndex: conflict.userIndex,
          originalRole: conflict.user.role,
          newRole: 'CREATOR',
          autoResolved: true
        };
        
      case 'metadata_too_large':
        return {
          strategy: 'compress_metadata',
          action: 'compress_metadata',
          userIndex: conflict.userIndex,
          originalSize: conflict.metadataSize,
          note: 'Metadata needs manual compression to fit within limits',
          requiresManualReview: true
        };
        
      default:
        return { strategy, requiresManualReview: true };
    }
  }

  async resolveUUIDConflict(conflict) {
    const strategy = conflict.suggestedResolution;
    
    switch (conflict.conflictType) {
      case 'invalid_uuid_format':
      case 'duplicate_uuid':
        const resolutions = [];
        
        if (conflict.users) {
          // Handle duplicate UUIDs
          conflict.users.forEach((userInfo, index) => {
            if (index === 0) return; // Keep first UUID
            
            resolutions.push({
              userIndex: userInfo.index,
              originalUuid: conflict.uuid,
              newUuid: crypto.randomUUID(),
              action: 'update_uuid'
            });
          });
        } else {
          // Handle invalid UUID
          resolutions.push({
            userIndex: conflict.userIndex,
            originalUuid: conflict.user.id,
            newUuid: crypto.randomUUID(),
            action: 'update_uuid'
          });
        }
        
        return {
          strategy,
          action: 'generate_new_uuid',
          resolutions,
          autoResolved: true
        };
        
      default:
        return { strategy, requiresManualReview: true };
    }
  }

  async generateConflictReport() {
    if (!this.config.generateReports) return null;
    
    Logger.info('Generating conflict resolution report...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(this.config.outputDir, `conflict-resolution-report-${timestamp}.json`);
    
    try {
      const report = {
        summary: {
          totalConflicts: this.resolutionStats.totalConflicts,
          resolvedConflicts: this.resolutionStats.resolvedConflicts,
          autoResolvedConflicts: this.resolutionStats.autoResolvedConflicts,
          manualReviewRequired: this.resolutionStats.manualReviewRequired
        },
        conflicts: {
          detected: this.conflicts.detected,
          autoResolved: this.conflicts.autoResolved,
          manualReview: this.conflicts.manualReview
        },
        conflictBreakdown: this.getConflictBreakdown(),
        resolutionStrategies: this.config.resolutionStrategies,
        recommendations: this.generateRecommendations(),
        generatedAt: new Date().toISOString()
      };
      
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
      Logger.info(`Conflict resolution report saved to: ${reportFile}`);
      
      return reportFile;
      
    } catch (error) {
      Logger.error('Failed to generate conflict report', error);
      throw error;
    }
  }

  getConflictBreakdown() {
    const breakdown = {};
    
    this.conflicts.detected.forEach(conflict => {
      breakdown[conflict.type] = (breakdown[conflict.type] || 0) + 1;
    });
    
    return breakdown;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.resolutionStats.manualReviewRequired > 0) {
      recommendations.push({
        type: 'action_required',
        message: `${this.resolutionStats.manualReviewRequired} conflicts require manual review`,
        action: 'Review manual conflicts before proceeding with migration'
      });
    }
    
    const duplicateEmails = this.conflicts.detected.filter(c => c.type === CONFLICT_TYPES.DUPLICATE_EMAIL);
    if (duplicateEmails.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `Found ${duplicateEmails.length} duplicate email addresses`,
        action: 'Consider contacting users to verify email addresses'
      });
    }
    
    const invalidEmails = this.conflicts.detected.filter(c => c.type === CONFLICT_TYPES.INVALID_EMAIL);
    if (invalidEmails.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `Found ${invalidEmails.length} invalid email addresses`,
        action: 'Temporary emails were generated - users should update their email'
      });
    }
    
    return recommendations;
  }

  async saveConflictData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const conflictFile = path.join(this.config.conflictDir, `conflicts-${timestamp}.json`);
    
    try {
      await fs.writeFile(conflictFile, JSON.stringify(this.conflicts, null, 2));
      Logger.info(`Conflict data saved to: ${conflictFile}`);
      return conflictFile;
    } catch (error) {
      Logger.error('Failed to save conflict data', error);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  const exportFile = args[0];
  
  if (!exportFile) {
    console.error('Usage: node conflict-resolver.js <export-file>');
    process.exit(1);
  }
  
  const resolver = new ConflictResolver();
  
  try {
    await resolver.initialize();
    
    const exportData = await resolver.loadExportData(exportFile);
    await resolver.detectConflicts(exportData);
    await resolver.resolveConflicts();
    
    const reportFile = await resolver.generateConflictReport();
    const conflictFile = await resolver.saveConflictData();
    
    Logger.info('Conflict resolution completed successfully');
    console.log('\nOutput Files:');
    console.log(`- Conflict Report: ${reportFile}`);
    console.log(`- Conflict Data: ${conflictFile}`);
    
    console.log('\nResolution Summary:');
    console.log(`- Total Conflicts: ${resolver.resolutionStats.totalConflicts}`);
    console.log(`- Auto-Resolved: ${resolver.resolutionStats.autoResolvedConflicts}`);
    console.log(`- Manual Review Required: ${resolver.resolutionStats.manualReviewRequired}`);
    
  } catch (error) {
    Logger.error('Conflict resolution failed', error);
    process.exit(1);
  }
}

// Run script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ConflictResolver, CONFLICT_TYPES, Logger };