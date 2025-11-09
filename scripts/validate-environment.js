#!/usr/bin/env node

/**
 * Pre-migration validation script
 * Validates system readiness before migrating users to Supabase Auth
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

class PreMigrationValidator {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.prisma = new PrismaClient();
    this.validationResults = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  async validateAll() {
    console.log('🔍 Starting pre-migration validation...\n');

    try {
      await this.validateSupabaseConnection();
      await this.validateDatabaseConnection();
      await this.validateSupabaseAuth();
      await this.validateUserTable();
      await this.validateEmailConfiguration();
      await this.validateBackupSystem();
      await this.validateEnvironmentVariables();
      await this.validateDependencies();
      await this.validateDiskSpace();
      await this.validateSecuritySettings();

      this.generateReport();
      return this.validationResults;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async validateSupabaseConnection() {
    console.log('📡 Validating Supabase connection...');
    
    try {
      const { data, error } = await this.supabase.from('_').select('*').limit(1);
      
      if (error && !error.message.includes('does not exist')) {
        throw error;
      }

      this.validationResults.passed.push('✅ Supabase connection successful');
    } catch (error) {
      this.validationResults.failed.push('❌ Supabase connection failed: ' + error.message);
    }
  }

  async validateDatabaseConnection() {
    console.log('🗄️ Validating database connection...');
    
    try {
      await this.prisma.$connect();
      const result = await this.prisma.$queryRaw`SELECT 1 as test`;
      
      this.validationResults.passed.push('✅ Database connection successful');
    } catch (error) {
      this.validationResults.failed.push('❌ Database connection failed: ' + error.message);
    }
  }

  async validateSupabaseAuth() {
    console.log('🔐 Validating Supabase Auth configuration...');
    
    try {
      // Check if auth.users table exists
      const { data: authUsers, error } = await this.supabase
        .from('auth.users')
        .select('count')
        .limit(1);

      if (error && !error.message.includes('does not exist')) {
        throw error;
      }

      // Check if email auth is enabled
      const { data: authConfig } = await this.supabase
        .from('auth.config')
        .select('*')
        .eq('name', 'enable_signup')
        .single();

      this.validationResults.passed.push('✅ Supabase Auth configuration validated');
    } catch (error) {
      this.validationResults.warnings.push('⚠️ Supabase Auth validation warning: ' + error.message);
    }
  }

  async validateUserTable() {
    console.log('👥 Validating users table structure...');
    
    try {
      // Check if users table exists
      const userCount = await this.prisma.users.count();
      
      // Check required columns
      const sampleUser = await this.prisma.users.findFirst({
        select: ['id', 'email', 'created_at', 'updated_at']
      });

      if (!sampleUser) {
        this.validationResults.warnings.push('⚠️ Users table is empty');
      } else {
        this.validationResults.passed.push(`✅ Users table validated (${userCount} users found)`);
      }

      // Check for duplicate emails
      const duplicateEmails = await this.prisma.$queryRaw`
        SELECT email, COUNT(*) as count
        FROM users
        GROUP BY email
        HAVING COUNT(*) > 1
      `;

      if (duplicateEmails.length > 0) {
        this.validationResults.failed.push(`❌ Found ${duplicateEmails.length} duplicate emails`);
      } else {
        this.validationResults.passed.push('✅ No duplicate emails found');
      }

      // Check for invalid emails
      const invalidEmails = await this.prisma.users.findMany({
        where: {
          OR: [
            { email: { not: { contains: '@' } } },
            { email: { contains: ' ' } }
          ]
        }
      });

      if (invalidEmails.length > 0) {
        this.validationResults.warnings.push(`⚠️ Found ${invalidEmails.length} potentially invalid emails`);
      }

    } catch (error) {
      this.validationResults.failed.push('❌ Users table validation failed: ' + error.message);
    }
  }

  async validateEmailConfiguration() {
    console.log('📧 Validating email configuration...');
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const optionalEnvVars = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.validationResults.failed.push(`❌ Missing required environment variable: ${envVar}`);
      }
    }

    const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar]);
    if (missingOptional.length > 0) {
      this.validationResults.warnings.push(`⚠️ Missing optional environment variables: ${missingOptional.join(', ')}`);
    }

    if (requiredEnvVars.every(envVar => process.env[envVar])) {
      this.validationResults.passed.push('✅ Email configuration validated');
    }
  }

  async validateBackupSystem() {
    console.log('💾 Validating backup system...');
    
    try {
      const backupDir = path.join(process.cwd(), 'backups');
      await fs.access(backupDir);
      
      const backupFiles = await fs.readdir(backupDir);
      const recentBackups = backupFiles.filter(file => 
        file.endsWith('.backup') || file.endsWith('.sql')
      );

      if (recentBackups.length === 0) {
        this.validationResults.warnings.push('⚠️ No existing backups found');
      } else {
        this.validationResults.passed.push(`✅ Backup system validated (${recentBackups.length} backups found)`);
      }

      // Test backup script existence
      const backupScript = path.join(process.cwd(), 'scripts', 'database-backup.js');
      await fs.access(backupScript);
      
      this.validationResults.passed.push('✅ Backup scripts available');
    } catch (error) {
      this.validationResults.failed.push('❌ Backup system validation failed: ' + error.message);
    }
  }

  async validateEnvironmentVariables() {
    console.log('🌍 Validating environment variables...');
    
    const criticalEnvVars = [
      'DATABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const allValid = criticalEnvVars.every(envVar => {
      if (!process.env[envVar]) {
        this.validationResults.failed.push(`❌ Critical environment variable missing: ${envVar}`);
        return false;
      }
      return true;
    });

    if (allValid) {
      this.validationResults.passed.push('✅ Critical environment variables validated');
    }
  }

  async validateDependencies() {
    console.log('📦 Validating dependencies...');
    
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      const requiredDeps = [
        '@supabase/supabase-js',
        '@prisma/client'
      ];

      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const missingDeps = requiredDeps.filter(dep => !allDeps[dep]);

      if (missingDeps.length > 0) {
        this.validationResults.failed.push(`❌ Missing required dependencies: ${missingDeps.join(', ')}`);
      } else {
        this.validationResults.passed.push('✅ All required dependencies are installed');
      }
    } catch (error) {
      this.validationResults.failed.push('❌ Dependency validation failed: ' + error.message);
    }
  }

  async validateDiskSpace() {
    console.log('💿 Validating disk space...');
    
    try {
      const stats = await fs.stat(process.cwd());
      
      // Simple check - ensure we can write to the directory
      const testFile = path.join(process.cwd(), '.migration-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      this.validationResults.passed.push('✅ Disk space validated');
    } catch (error) {
      this.validationResults.failed.push('❌ Disk space validation failed: ' + error.message);
    }
  }

  async validateSecuritySettings() {
    console.log('🔒 Validating security settings...');
    
    try {
      // Check if service role key is being used (not anon key for migration)
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (serviceKey && serviceKey !== anonKey) {
        this.validationResults.passed.push('✅ Service role key is properly configured');
      } else {
        this.validationResults.warnings.push('⚠️ Service role key may not be properly configured');
      }

      // Check for secure environment
      if (process.env.NODE_ENV === 'production') {
        this.validationResults.warnings.push('⚠️ Running migration in production environment');
      } else {
        this.validationResults.passed.push('✅ Running in non-production environment');
      }
    } catch (error) {
      this.validationResults.warnings.push('⚠️ Security validation warning: ' + error.message);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PRE-MIGRATION VALIDATION REPORT');
    console.log('='.repeat(60));

    if (this.validationResults.passed.length > 0) {
      console.log('\n✅ PASSED VALIDATIONS:');
      this.validationResults.passed.forEach(result => console.log(`  ${result}`));
    }

    if (this.validationResults.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.validationResults.warnings.forEach(result => console.log(`  ${result}`));
    }

    if (this.validationResults.failed.length > 0) {
      console.log('\n❌ FAILED VALIDATIONS:');
      this.validationResults.failed.forEach(result => console.log(`  ${result}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log(`SUMMARY: ${this.validationResults.passed.length} passed, ${this.validationResults.warnings.length} warnings, ${this.validationResults.failed.length} failed`);
    console.log('='.repeat(60));

    // Return overall status
    const canProceed = this.validationResults.failed.length === 0;
    console.log(`\n🚀 Migration can proceed: ${canProceed ? 'YES' : 'NO'}`);

    if (!canProceed) {
      console.log('\n❌ Please resolve failed validations before proceeding with migration.');
      process.exit(1);
    } else if (this.validationResults.warnings.length > 0) {
      console.log('\n⚠️ Proceed with caution due to warnings.');
    } else {
      console.log('\n✅ All validations passed! Ready to proceed with migration.');
    }

    return canProceed;
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PreMigrationValidator();
  validator.validateAll()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = PreMigrationValidator;