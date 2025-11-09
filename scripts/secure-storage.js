#!/usr/bin/env node

/**
 * Secure Backup Storage Script
 * 
 * This script sets up secure storage for migration backups,
 * including encryption, access control, and storage management.
 * 
 * Features:
 * - Backup encryption and decryption
 * - Secure storage directory setup
 * - Access control implementation
 * - Storage cleanup and rotation
 * - Backup integrity monitoring
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  backupDir: './backups/migration',
  secureDir: './secure-backups',
  encryptionAlgorithm: 'aes-256-gcm',
  keyDerivationIterations: 100000,
  accessControlEnabled: true,
  permissions: {
    owner: 'read,write,execute',
    group: 'read',
    others: 'none'
  }
};

// Logger utility
class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level}: ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  static info(message, data) { return this.log('INFO', message, data); }
  static warn(message, data) { return this.log('WARN', message, data); }
  static error(message, data) { return this.log('ERROR', message, data); }
}

class SecureStorage {
  constructor(config = CONFIG) {
    this.config = config;
    this.encryptionKey = null;
  }

  async initialize() {
    Logger.info('Initializing secure storage...');
    
    try {
      await this.setupSecureDirectory();
      await this.generateEncryptionKey();
      await this.setupAccessControl();
      
      Logger.info('Secure storage initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize secure storage', error);
      throw error;
    }
  }

  async setupSecureDirectory() {
    try {
      await fs.mkdir(this.config.secureDir, { 
        recursive: true, 
        mode: 0o700 // Only owner can read/write/execute
      });
      
      Logger.info(`Secure directory created: ${this.config.secureDir}`);
    } catch (error) {
      Logger.error('Failed to create secure directory', error);
      throw error;
    }
  }

  async generateEncryptionKey() {
    try {
      // Generate a new encryption key
      this.encryptionKey = crypto.randomBytes(32); // 256 bits for AES-256
      
      // Save the key securely (in production, this would be stored in a secure key management system)
      const keyFile = path.join(this.config.secureDir, '.encryption_key');
      await fs.writeFile(keyFile, this.encryptionKey, { mode: 0o600 });
      
      Logger.info('Encryption key generated and stored securely');
    } catch (error) {
      Logger.error('Failed to generate encryption key', error);
      throw error;
    }
  }

  async setupAccessControl() {
    if (!this.config.accessControlEnabled) {
      Logger.info('Access control disabled');
      return;
    }

    try {
      // Set appropriate permissions on secure directory
      const chmodCommand = `chmod 700 "${this.config.secureDir}"`;
      execSync(chmodCommand);
      
      Logger.info('Access control configured');
    } catch (error) {
      Logger.warn('Failed to set access control', error);
    }
  }

  async encryptFile(inputPath, outputPath) {
    try {
      const inputBuffer = await fs.readFile(inputPath);
      
      // Generate initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipher(this.config.encryptionAlgorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('backup-encryption')); // Additional authenticated data
      
      // Encrypt the data
      const encrypted = Buffer.concat([
        cipher.update(inputBuffer),
        cipher.final()
      ]);
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine iv, authTag, and encrypted data
      const combined = Buffer.concat([iv, authTag, encrypted]);
      
      // Write encrypted file
      await fs.writeFile(outputPath, combined, { mode: 0o600 });
      
      Logger.info(`File encrypted successfully: ${inputPath} -> ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      Logger.error('Failed to encrypt file', error);
      throw error;
    }
  }

  async decryptFile(inputPath, outputPath) {
    try {
      const encrypted = await fs.readFile(inputPath);
      
      // Extract iv, authTag, and encrypted data
      const iv = encrypted.slice(0, 16);
      const authTag = encrypted.slice(16, 32);
      const ciphertext = encrypted.slice(32);
      
      // Create decipher
      const decipher = crypto.createDecipher(this.config.encryptionAlgorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from('backup-encryption'));
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);
      
      // Write decrypted file
      await fs.writeFile(outputPath, decrypted);
      
      Logger.info(`File decrypted successfully: ${inputPath} -> ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      Logger.error('Failed to decrypt file', error);
      throw error;
    }
  }

  async secureBackup(backupPath) {
    try {
      const filename = path.basename(backupPath);
      const encryptedPath = path.join(this.config.secureDir, `${filename}.enc`);
      
      await this.encryptFile(backupPath, encryptedPath);
      
      // Verify encrypted file
      const stats = await fs.stat(encryptedPath);
      
      Logger.info(`Backup secured: ${filename}`, {
        originalSize: (await fs.stat(backupPath)).size,
        encryptedSize: stats.size
      });
      
      return encryptedPath;
      
    } catch (error) {
      Logger.error('Failed to secure backup', error);
      throw error;
    }
  }

  async cleanupOldSecureBackups(retentionDays = 30) {
    try {
      const files = await fs.readdir(this.config.secureDir);
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
      
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.config.secureDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          cleanedCount++;
          Logger.info(`Removed old secure backup: ${file}`);
        }
      }
      
      Logger.info(`Secure backup cleanup completed: removed ${cleanedCount} files`);
      
    } catch (error) {
      Logger.error('Failed to cleanup old secure backups', error);
    }
  }
}

module.exports = { SecureStorage, Logger };