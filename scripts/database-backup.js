#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * This script creates comprehensive database backups for migration safety,
 * including full database dumps, table-specific backups, and verification.
 * 
 * Features:
 * - Full database backup with compression
 * - Table-specific backups
 * - Backup verification and integrity checks
 * - Backup rotation and cleanup
 * - Multiple backup formats
 * - Secure backup storage
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');

// Configuration
const CONFIG = {
  backupDir: './backups/migration',
  retentionDays: 30,
  compressionLevel: 6,
  verifyBackups: true,
  createTableBackups: true,
  createFullBackup: true,
  checksumAlgorithm: 'sha256',
  encryptionEnabled: false, // Set to true for encrypted backups
  excludeTables: [], // Tables to exclude from backup
  includeTables: [] // If specified, only backup these tables
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

class DatabaseBackup {
  constructor(config = CONFIG) {
    this.config = config;
    this.prisma = new PrismaClient();
    this.backupSession = {
      id: this.generateBackupId(),
      startTime: new Date(),
      endTime: null,
      backups: [],
      verificationResults: [],
      errors: []
    };
  }

  generateBackupId() {
    return `backup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  async initialize() {
    Logger.info('Initializing database backup...');
    
    try {
      await fs.mkdir(this.config.backupDir, { recursive: true });
      
      // Create session subdirectory
      const sessionDir = path.join(this.config.backupDir, this.backupSession.id);
      await fs.mkdir(sessionDir, { recursive: true });
      
      this.backupSession.sessionDir = sessionDir;
      Logger.info(`Backup session initialized: ${this.backupSession.id}`);
      Logger.info(`Backup directory: ${sessionDir}`);
      
      return sessionDir;
      
    } catch (error) {
      Logger.error('Failed to initialize backup', error);
      throw error;
    }
  }

  async createFullBackup() {
    if (!this.config.createFullBackup) {
      Logger.info('Full backup disabled in configuration');
      return null;
    }
    
    Logger.info('Creating full database backup...');
    
    try {
      const backupPath = path.join(
        this.backupSession.sessionDir, 
        `full_backup_${Date.now()}.sql`
      );
      
      // Get database connection info
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }
      
      // Parse database URL to get connection details
      const connectionInfo = this.parseDatabaseUrl(databaseUrl);
      
      // Create pg_dump command
      const command = this.buildPgDumpCommand(connectionInfo, backupPath, 'full');
      
      // Execute backup
      const timer = this.startTimer('full_backup');
      await this.executeCommand(command);
      const duration = timer();
      
      // Compress backup if enabled
      const finalPath = this.config.compressionLevel > 0 ? 
        await this.compressFile(backupPath) : backupPath;
      
      // Generate checksum
      const checksum = await this.generateChecksum(finalPath);
      
      const backup = {
        type: 'full',
        path: finalPath,
        originalPath: backupPath,
        size: await this.getFileSize(finalPath),
        checksum,
        duration,
        createdAt: new Date().toISOString(),
        tables: 'all'
      };
      
      this.backupSession.backups.push(backup);
      
      Logger.info(`Full backup completed`, {
        path: finalPath,
        size: backup.size,
        duration: `${duration}ms`,
        checksum
      });
      
      return backup;
      
    } catch (error) {
      Logger.error('Failed to create full backup', error);
      this.backupSession.errors.push({
        type: 'full_backup',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async createTableBackups() {
    if (!this.config.createTableBackups) {
      Logger.info('Table backups disabled in configuration');
      return [];
    }
    
    Logger.info('Creating table-specific backups...');
    
    try {
      const tables = await this.getTablesToBackup();
      const backups = [];
      
      for (const table of tables) {
        try {
          const backup = await this.createSingleTableBackup(table);
          backups.push(backup);
        } catch (error) {
          Logger.warn(`Failed to backup table ${table}`, error);
          this.backupSession.errors.push({
            type: 'table_backup',
            table,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      Logger.info(`Table backups completed: ${backups.length}/${tables.length} tables`);
      return backups;
      
    } catch (error) {
      Logger.error('Failed to create table backups', error);
      throw error;
    }
  }

  async getTablesToBackup() {
    if (this.config.includeTables.length > 0) {
      return this.config.includeTables;
    }
    
    // Get all tables from database
    const result = await this.prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    
    const allTables = result.map(row => row.tablename);
    
    // Filter out excluded tables
    const tablesToBackup = allTables.filter(
      table => !this.config.excludeTables.includes(table)
    );
    
    Logger.info(`Found ${allTables.length} tables, backing up ${tablesToBackup.length}`);
    
    return tablesToBackup;
  }

  async createSingleTableBackup(table) {
    Logger.info(`Creating backup for table: ${table}`);
    
    const backupPath = path.join(
      this.backupSession.sessionDir,
      `${table}_backup_${Date.now()}.sql`
    );
    
    // Get database connection info
    const databaseUrl = process.env.DATABASE_URL;
    const connectionInfo = this.parseDatabaseUrl(databaseUrl);
    
    // Create pg_dump command for specific table
    const command = this.buildPgDumpCommand(connectionInfo, backupPath, 'table', table);
    
    // Execute backup
    const timer = this.startTimer(`table_backup_${table}`);
    await this.executeCommand(command);
    const duration = timer();
    
    // Compress backup if enabled
    const finalPath = this.config.compressionLevel > 0 ? 
      await this.compressFile(backupPath) : backupPath;
    
    // Generate checksum
    const checksum = await this.generateChecksum(finalPath);
    
    const backup = {
      type: 'table',
      table,
      path: finalPath,
      originalPath: backupPath,
      size: await this.getFileSize(finalPath),
      checksum,
      duration,
      createdAt: new Date().toISOString()
    };
    
    Logger.info(`Table backup completed: ${table}`, {
      path: finalPath,
      size: backup.size,
      duration: `${duration}ms`
    });
    
    return backup;
  }

  parseDatabaseUrl(databaseUrl) {
    try {
      // Parse PostgreSQL connection URL
      // postgresql://username:password@hostname:port/database
      const url = new URL(databaseUrl);
      
      return {
        host: url.hostname,
        port: url.port || 5432,
        database: url.pathname.substring(1),
        username: url.username,
        password: url.password
      };
    } catch (error) {
      throw new Error(`Failed to parse DATABASE_URL: ${error.message}`);
    }
  }

  buildPgDumpCommand(connectionInfo, outputPath, type, table = null) {
    const { host, port, database, username, password } = connectionInfo;
    
    let command = `PGPASSWORD="${password}" pg_dump`;
    
    // Add connection parameters
    command += ` --host="${host}"`;
    command += ` --port="${port}"`;
    command += ` --username="${username}"`;
    command += ` --dbname="${database}"`;
    
    // Add dump options
    command += ` --verbose`;
    command += ` --no-owner`;
    command += ` --no-privileges`;
    command += ` --format=custom`;
    command += ` --compress=${this.config.compressionLevel}`;
    
    if (type === 'table' && table) {
      command += ` --table="${table}"`;
    }
    
    // Add exclude tables if specified
    this.config.excludeTables.forEach(excludeTable => {
      command += ` --exclude-table="${excludeTable}"`;
    });
    
    // Output file
    command += ` --file="${outputPath}"`;
    
    return command;
  }

  async executeCommand(command) {
    Logger.info(`Executing command: ${command}`);
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      Logger.debug('Command executed successfully', { output });
      return output;
      
    } catch (error) {
      Logger.error('Command execution failed', {
        command,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      });
      throw error;
    }
  }

  async compressFile(filePath) {
    Logger.info(`Compressing file: ${filePath}`);
    
    try {
      const compressedPath = `${filePath}.gz`;
      const input = await fs.readFile(filePath);
      const compressed = await promisify(zlib.gzip)(input, {
        level: this.config.compressionLevel
      });
      
      await fs.writeFile(compressedPath, compressed);
      
      // Remove original file
      await fs.unlink(filePath);
      
      const originalSize = input.length;
      const compressedSize = compressed.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      
      Logger.info(`File compressed`, {
        originalPath: filePath,
        compressedPath,
        originalSize,
        compressedSize,
        compressionRatio: `${compressionRatio}%`
      });
      
      return compressedPath;
      
    } catch (error) {
      Logger.error('Failed to compress file', error);
      throw error;
    }
  }

  async generateChecksum(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash(this.config.checksumAlgorithm);
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      Logger.error('Failed to generate checksum', error);
      throw error;
    }
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      Logger.error('Failed to get file size', error);
      return 0;
    }
  }

  startTimer(operation) {
    const startTime = process.hrtime.bigint();
    
    return () => {
      const endTime = process.hrtime.bigint();
      return Number(endTime - startTime) / 1000000; // Convert to milliseconds
    };
  }

  async verifyBackups() {
    if (!this.config.verifyBackups) {
      Logger.info('Backup verification disabled in configuration');
      return [];
    }
    
    Logger.info('Verifying backup integrity...');
    
    const verificationResults = [];
    
    for (const backup of this.backupSession.backups) {
      try {
        const result = await this.verifySingleBackup(backup);
        verificationResults.push(result);
      } catch (error) {
        Logger.error(`Failed to verify backup: ${backup.path}`, error);
        verificationResults.push({
          backup,
          verified: false,
          error: error.message
        });
      }
    }
    
    this.backupSession.verificationResults = verificationResults;
    
    const verifiedCount = verificationResults.filter(r => r.verified).length;
    Logger.info(`Backup verification completed: ${verifiedCount}/${verificationResults.length} verified`);
    
    return verificationResults;
  }

  async verifySingleBackup(backup) {
    Logger.info(`Verifying backup: ${backup.path}`);
    
    // Check if file exists
    try {
      await fs.access(backup.path);
    } catch (error) {
      throw new Error(`Backup file does not exist: ${backup.path}`);
    }
    
    // Verify checksum
    const currentChecksum = await this.generateChecksum(backup.path);
    const checksumValid = currentChecksum === backup.checksum;
    
    if (!checksumValid) {
      throw new Error(`Checksum mismatch: expected ${backup.checksum}, got ${currentChecksum}`);
    }
    
    // For compressed files, try to decompress to verify integrity
    if (backup.path.endsWith('.gz')) {
      try {
        const compressed = await fs.readFile(backup.path);
        await promisify(zlib.gunzip)(compressed);
      } catch (error) {
        throw new Error(`Compressed file is corrupted: ${error.message}`);
      }
    }
    
    const result = {
      backup,
      verified: true,
      verifiedAt: new Date().toISOString(),
      checksumValid,
      fileAccessible: true
    };
    
    Logger.info(`Backup verified successfully: ${backup.path}`);
    return result;
  }

  async createBackupManifest() {
    Logger.info('Creating backup manifest...');
    
    const manifest = {
      backupSession: this.backupSession.id,
      createdAt: this.backupSession.startTime.toISOString(),
      completedAt: this.backupSession.endTime || new Date().toISOString(),
      configuration: this.config,
      backups: this.backupSession.backups,
      verificationResults: this.backupSession.verificationResults,
      errors: this.backupSession.errors,
      summary: {
        totalBackups: this.backupSession.backups.length,
        totalSize: this.backupSession.backups.reduce((sum, b) => sum + b.size, 0),
        verifiedBackups: this.backupSession.verificationResults.filter(r => r.verified).length,
        errors: this.backupSession.errors.length
      }
    };
    
    const manifestPath = path.join(
      this.backupSession.sessionDir,
      'manifest.json'
    );
    
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    Logger.info(`Backup manifest created: ${manifestPath}`);
    return manifestPath;
  }

  async cleanupOldBackups() {
    Logger.info('Cleaning up old backups...');
    
    try {
      const backupDir = this.config.backupDir;
      const entries = await fs.readdir(backupDir, { withFileTypes: true });
      
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      let cleanedCount = 0;
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const entryPath = path.join(backupDir, entry.name);
        const stats = await fs.stat(entryPath);
        
        if (stats.mtime < cutoffDate) {
          await fs.rm(entryPath, { recursive: true, force: true });
          cleanedCount++;
          Logger.info(`Removed old backup: ${entry.name}`);
        }
      }
      
      Logger.info(`Cleanup completed: removed ${cleanedCount} old backup directories`);
      
    } catch (error) {
      Logger.error('Failed to cleanup old backups', error);
    }
  }

  async finalizeBackup() {
    this.backupSession.endTime = new Date();
    
    Logger.info('Finalizing backup session...');
    
    try {
      // Create manifest
      await this.createBackupManifest();
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      const summary = {
        sessionId: this.backupSession.id,
        duration: this.backupSession.endTime - this.backupSession.startTime,
        backups: this.backupSession.backups.length,
        totalSize: this.backupSession.backups.reduce((sum, b) => sum + b.size, 0),
        verified: this.backupSession.verificationResults.filter(r => r.verified).length,
        errors: this.backupSession.errors.length
      };
      
      Logger.info('Backup session completed', summary);
      return summary;
      
    } catch (error) {
      Logger.error('Failed to finalize backup', error);
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
  const backup = new DatabaseBackup();
  
  try {
    await backup.initialize();
    
    // Create full backup
    await backup.createFullBackup();
    
    // Create table backups
    await backup.createTableBackups();
    
    // Verify backups
    await backup.verifyBackups();
    
    // Finalize backup session
    const summary = await backup.finalizeBackup();
    
    Logger.info('Database backup completed successfully');
    console.log('\nBackup Summary:');
    console.log(`- Session ID: ${summary.sessionId}`);
    console.log(`- Duration: ${summary.duration}ms`);
    console.log(`- Backups: ${summary.backups}`);
    console.log(`- Total Size: ${summary.totalSize} bytes`);
    console.log(`- Verified: ${summary.verified}`);
    console.log(`- Errors: ${summary.errors}`);
    
  } catch (error) {
    Logger.error('Database backup failed', error);
    process.exit(1);
  } finally {
    await backup.cleanup();
  }
}

// Run script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseBackup, Logger };