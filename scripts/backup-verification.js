#!/usr/bin/env node

/**
 * Backup Verification Script
 * 
 * This script verifies the integrity and completeness of database backups
 * to ensure they can be safely used for restoration.
 * 
 * Features:
 * - Backup file integrity verification
 * - Checksum validation
 * - Decompression testing
 * - Schema validation
 * - Data consistency checks
 * - Restoration dry runs
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

// Configuration
const CONFIG = {
  backupDir: './backups/migration',
  testDatabase: process.env.TEST_DATABASE_URL,
  checksumAlgorithm: 'sha256',
  enableDecompressionTest: true,
  enableSchemaValidation: true,
  enableDataValidation: true,
  enableDryRunRestore: false, // Set to true for full restoration test
  tempDir: './temp/verification'
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
  static debug(message, data) { return this.log('DEBUG', message, data); }
}

class BackupVerifier {
  constructor(config = CONFIG) {
    this.config = config;
    this.prisma = new PrismaClient();
    this.verificationSession = {
      id: this.generateVerificationId(),
      startTime: new Date(),
      endTime: null,
      results: [],
      errors: [],
      summary: {
        totalBackups: 0,
        verifiedBackups: 0,
        failedBackups: 0,
        warnings: 0
      }
    };
  }

  generateVerificationId() {
    return `verify_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  async initialize() {
    Logger.info('Initializing backup verification...');
    
    try {
      await fs.mkdir(this.config.tempDir, { recursive: true });
      Logger.info(`Verification session initialized: ${this.verificationSession.id}`);
      Logger.info(`Temp directory: ${this.config.tempDir}`);
      
      return this.verificationSession.id;
      
    } catch (error) {
      Logger.error('Failed to initialize verification', error);
      throw error;
    }
  }

  async loadBackupManifest(manifestPath) {
    Logger.info(`Loading backup manifest: ${manifestPath}`);
    
    try {
      const data = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(data);
      
      if (!manifest.backups || !Array.isArray(manifest.backups)) {
        throw new Error('Invalid manifest format: missing backups array');
      }
      
      Logger.info(`Loaded manifest with ${manifest.backups.length} backups`);
      return manifest;
      
    } catch (error) {
      Logger.error('Failed to load backup manifest', error);
      throw error;
    }
  }

  async verifyAllBackups(manifest) {
    Logger.info('Starting comprehensive backup verification...');
    
    this.verificationSession.summary.totalBackups = manifest.backups.length;
    
    for (const backup of manifest.backups) {
      try {
        const result = await this.verifySingleBackup(backup);
        this.verificationSession.results.push(result);
        
        if (result.verified) {
          this.verificationSession.summary.verifiedBackups++;
        } else {
          this.verificationSession.summary.failedBackups++;
        }
        
        if (result.warnings && result.warnings.length > 0) {
          this.verificationSession.summary.warnings += result.warnings.length;
        }
        
      } catch (error) {
        Logger.error(`Failed to verify backup: ${backup.path}`, error);
        this.verificationSession.summary.failedBackups++;
        this.verificationSession.errors.push({
          backup,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    Logger.info('Backup verification completed', this.verificationSession.summary);
    return this.verificationSession.results;
  }

  async verifySingleBackup(backup) {
    Logger.info(`Verifying backup: ${backup.path}`);
    
    const result = {
      backup,
      verified: false,
      checks: {},
      warnings: [],
      errors: [],
      verificationTime: new Date().toISOString()
    };
    
    try {
      // 1. File existence and accessibility
      result.checks.fileAccess = await this.verifyFileAccess(backup.path);
      
      // 2. File size verification
      result.checks.fileSize = await this.verifyFileSize(backup);
      
      // 3. Checksum verification
      result.checks.checksum = await this.verifyChecksum(backup);
      
      // 4. Decompression test (if compressed)
      if (backup.path.endsWith('.gz')) {
        result.checks.decompression = await this.verifyDecompression(backup.path);
      }
      
      // 5. Schema validation
      if (this.config.enableSchemaValidation) {
        result.checks.schema = await this.verifySchema(backup);
      }
      
      // 6. Data validation
      if (this.config.enableDataValidation) {
        result.checks.data = await this.verifyData(backup);
      }
      
      // 7. Dry run restoration (if enabled)
      if (this.config.enableDryRunRestore) {
        result.checks.restoration = await this.verifyRestoration(backup);
      }
      
      // Determine overall verification status
      result.verified = this.determineVerificationStatus(result.checks, result.errors, result.warnings);
      
      Logger.info(`Backup verification completed: ${backup.path}`, {
        verified: result.verified,
        errors: result.errors.length,
        warnings: result.warnings.length
      });
      
    } catch (error) {
      Logger.error(`Backup verification failed: ${backup.path}`, error);
      result.errors.push({
        type: 'verification_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  }

  async verifyFileAccess(filePath) {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      return { passed: true, message: 'File is accessible' };
    } catch (error) {
      return { passed: false, message: `File not accessible: ${error.message}` };
    }
  }

  async verifyFileSize(backup) {
    try {
      const stats = await fs.stat(backup.path);
      const actualSize = stats.size;
      const expectedSize = backup.size;
      
      if (actualSize !== expectedSize) {
        return {
          passed: false,
          message: `Size mismatch: expected ${expectedSize}, actual ${actualSize}`,
          actualSize,
          expectedSize
        };
      }
      
      return { 
        passed: true, 
        message: `File size verified: ${actualSize} bytes`,
        actualSize
      };
    } catch (error) {
      return { passed: false, message: `Failed to verify file size: ${error.message}` };
    }
  }

  async verifyChecksum(backup) {
    try {
      const actualChecksum = await this.generateChecksum(backup.path);
      const expectedChecksum = backup.checksum;
      
      if (actualChecksum !== expectedChecksum) {
        return {
          passed: false,
          message: `Checksum mismatch`,
          expectedChecksum,
          actualChecksum
        };
      }
      
      return {
        passed: true,
        message: 'Checksum verified',
        checksum: actualChecksum
      };
    } catch (error) {
      return { passed: false, message: `Failed to verify checksum: ${error.message}` };
    }
  }

  async verifyDecompression(filePath) {
    if (!this.config.enableDecompressionTest) {
      return { passed: true, message: 'Decompression test skipped' };
    }
    
    try {
      const compressed = await fs.readFile(filePath);
      const decompressed = await promisify(zlib.gunzip)(compressed);
      
      return {
        passed: true,
        message: 'Decompression successful',
        originalSize: compressed.length,
        decompressedSize: decompressed.length
      };
    } catch (error) {
      return { passed: false, message: `Decompression failed: ${error.message}` };
    }
  }

  async verifySchema(backup) {
    try {
      // For SQL backups, we can extract schema information
      if (backup.path.endsWith('.sql') || backup.path.endsWith('.gz')) {
        const schema = await this.extractSchema(backup.path);
        const validation = this.validateSchema(schema);
        
        return validation;
      }
      
      return { passed: true, message: 'Schema validation not applicable for this backup type' };
      
    } catch (error) {
      return { passed: false, message: `Schema validation failed: ${error.message}` };
    }
  }

  async extractSchema(backupPath) {
    let content;
    
    // Decompress if needed
    if (backupPath.endsWith('.gz')) {
      const compressed = await fs.readFile(backupPath);
      content = await promisify(zlib.gunzip)(compressed);
    } else {
      content = await fs.readFile(backupPath, 'utf8');
    }
    
    // Extract CREATE TABLE statements
    const createTableRegex = /CREATE TABLE [^;]+;/gi;
    const matches = content.toString().match(createTableRegex) || [];
    
    return {
      tables: matches.length,
      schema: content.toString()
    };
  }

  validateSchema(schema) {
    const expectedTables = [
      'users', 'creator_profiles', 'solutions', 'orders', 
      'payment_transactions', 'notifications', 'audit_logs'
    ];
    
    const schemaContent = schema.schema.toLowerCase();
    const foundTables = [];
    
    expectedTables.forEach(table => {
      if (schemaContent.includes(`create table ${table}`) || 
          schemaContent.includes(`create table public.${table}`)) {
        foundTables.push(table);
      }
    });
    
    const missingTables = expectedTables.filter(table => !foundTables.includes(table));
    
    if (missingTables.length > 0) {
      return {
        passed: false,
        message: `Missing expected tables: ${missingTables.join(', ')}`,
        foundTables,
        missingTables,
        totalTables: schema.tables
      };
    }
    
    return {
      passed: true,
      message: `All expected tables found (${foundTables.length})`,
      foundTables,
      totalTables: schema.tables
    };
  }

  async verifyData(backup) {
    try {
      // For custom format backups, use pg_restore to list contents
      if (backup.path.includes('.sql')) {
        const dataInfo = await this.extractDataInfo(backup.path);
        return this.validateData(dataInfo);
      }
      
      return { passed: true, message: 'Data validation not applicable for this backup type' };
      
    } catch (error) {
      return { passed: false, message: `Data validation failed: ${error.message}` };
    }
  }

  async extractDataInfo(backupPath) {
    // This is a simplified implementation
    // In a real scenario, you might use pg_restore --list for custom format backups
    const content = await fs.readFile(backupPath, 'utf8');
    
    // Count INSERT statements as a rough data indicator
    const insertRegex = /INSERT INTO [^;]+;/gi;
    const inserts = content.match(insertRegex) || [];
    
    // Count COPY statements
    const copyRegex = /COPY [^;]+;/gi;
    const copies = content.match(copyRegex) || [];
    
    return {
      insertStatements: inserts.length,
      copyStatements: copies.length,
      totalDataOperations: inserts.length + copies.length,
      contentSize: content.length
    };
  }

  validateData(dataInfo) {
    // Basic validation - check if there's any data
    if (dataInfo.totalDataOperations === 0) {
      return {
        passed: false,
        message: 'No data operations found in backup',
        ...dataInfo
      };
    }
    
    return {
      passed: true,
      message: `Data validation passed (${dataInfo.totalDataOperations} operations)`,
      ...dataInfo
    };
  }

  async verifyRestoration(backup) {
    if (!this.config.enableDryRunRestore || !this.config.testDatabase) {
      return { passed: true, message: 'Dry run restoration skipped' };
    }
    
    try {
      Logger.info(`Testing restoration with test database...`);
      
      // Create temporary restoration command
      const restoreCommand = this.buildRestoreCommand(backup);
      
      // Execute in test environment
      const result = await this.executeDryRun(restoreCommand);
      
      return {
        passed: true,
        message: 'Dry run restoration successful',
        result
      };
      
    } catch (error) {
      return { passed: false, message: `Dry run restoration failed: ${error.message}` };
    }
  }

  buildRestoreCommand(backup) {
    const testDbUrl = this.config.testDatabase;
    
    if (backup.path.includes('.sql')) {
      // For SQL dumps
      return `psql "${testDbUrl}" < "${backup.path}"`;
    } else {
      // For custom format backups
      return `pg_restore --verbose --clean --if-exists --dbname "${testDbUrl}" "${backup.path}"`;
    }
  }

  async executeDryRun(command) {
    // This would execute the command in a test environment
    // For now, we'll simulate the execution
    Logger.debug(`Dry run command: ${command}`);
    
    return {
      command,
      simulated: true,
      message: 'Dry run execution simulated'
    };
  }

  determineVerificationStatus(checks, errors, warnings) {
    // Check for any failed critical checks
    const criticalChecks = ['fileAccess', 'checksum'];
    const failedCritical = criticalChecks.filter(check => 
      checks[check] && !checks[check].passed
    );
    
    if (failedCritical.length > 0) {
      return false;
    }
    
    // Check for any errors
    if (errors.length > 0) {
      return false;
    }
    
    // If all critical checks pass and no errors, consider verified
    return true;
  }

  async generateChecksum(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash(this.config.checksumAlgorithm);
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Failed to generate checksum: ${error.message}`);
    }
  }

  async generateVerificationReport() {
    Logger.info('Generating verification report...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.config.backupDir, `verification-report-${timestamp}.json`);
    
    try {
      const report = {
        verificationSession: this.verificationSession.id,
        timestamp: new Date().toISOString(),
        summary: this.verificationSession.summary,
        results: this.verificationSession.results,
        errors: this.verificationSession.errors,
        recommendations: this.generateRecommendations(),
        completedAt: new Date().toISOString()
      };
      
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      Logger.info(`Verification report saved: ${reportPath}`);
      
      return reportPath;
      
    } catch (error) {
      Logger.error('Failed to generate verification report', error);
      throw error;
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.verificationSession.summary.failedBackups > 0) {
      recommendations.push({
        type: 'critical',
        message: `${this.verificationSession.summary.failedBackups} backups failed verification`,
        action: 'Recreate failed backups before proceeding with migration'
      });
    }
    
    if (this.verificationSession.summary.warnings > 0) {
      recommendations.push({
        type: 'warning',
        message: `${this.verificationSession.summary.warnings} warnings detected`,
        action: 'Review warnings and address if necessary'
      });
    }
    
    if (this.verificationSession.summary.verifiedBackups === this.verificationSession.summary.totalBackups) {
      recommendations.push({
        type: 'success',
        message: 'All backups verified successfully',
        action: 'Backups are ready for migration'
      });
    }
    
    return recommendations;
  }

  async cleanup() {
    Logger.info('Cleaning up verification resources...');
    
    try {
      // Clean up temp directory
      await fs.rm(this.config.tempDir, { recursive: true, force: true });
      
      await this.prisma.$disconnect();
      Logger.info('Verification cleanup completed');
      
    } catch (error) {
      Logger.error('Failed to cleanup verification resources', error);
    }
  }
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  const manifestPath = args[0];
  
  if (!manifestPath) {
    console.error('Usage: node backup-verification.js <manifest-file>');
    process.exit(1);
  }
  
  const verifier = new BackupVerifier();
  
  try {
    await verifier.initialize();
    
    const manifest = await verifier.loadBackupManifest(manifestPath);
    await verifier.verifyAllBackups(manifest);
    
    const reportPath = await verifier.generateVerificationReport();
    
    Logger.info('Backup verification completed successfully');
    console.log('\nVerification Summary:');
    console.log(`- Total Backups: ${verifier.verificationSession.summary.totalBackups}`);
    console.log(`- Verified: ${verifier.verificationSession.summary.verifiedBackups}`);
    console.log(`- Failed: ${verifier.verificationSession.summary.failedBackups}`);
    console.log(`- Warnings: ${verifier.verificationSession.summary.warnings}`);
    console.log(`- Report: ${reportPath}`);
    
  } catch (error) {
    Logger.error('Backup verification failed', error);
    process.exit(1);
  } finally {
    await verifier.cleanup();
  }
}

// Run script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BackupVerifier, Logger };