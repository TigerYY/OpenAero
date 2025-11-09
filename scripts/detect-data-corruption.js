#!/usr/bin/env node

/**
 * Data Corruption Detection Script
 * Detects and reports data corruption during rollback processes
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class DataCorruptionDetector {
  constructor() {
    this.baselineData = new Map();
    this.currentData = new Map();
    this.corruptionResults = {
      totalChecks: 0,
      corruptionDetected: 0,
      integrityPassed: 0,
      details: []
    };
    this.backupDir = path.join(process.cwd(), 'backups');
  }

  // Log corruption detection result
  logResult(checkName, isCorrupted, message, details = null) {
    this.corruptionResults.totalChecks++;
    
    if (isCorrupted) {
      this.corruptionResults.corruptionDetected++;
      console.log(`🚨 ${checkName}: CORRUPTION DETECTED - ${message}`);
    } else {
      this.corruptionResults.integrityPassed++;
      console.log(`✅ ${checkName}: ${message}`);
    }

    this.corruptionResults.details.push({
      check: checkName,
      status: isCorrupted ? 'CORRUPTION' : 'INTEGRITY',
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Generate data hash for integrity checking
  generateDataHash(data) {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  // Capture baseline data before operations
  async captureBaseline() {
    console.log('📸 Capturing baseline data...');
    
    try {
      // Get baseline users data
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Sample for performance

      if (usersError) throw usersError;

      // Store baseline with hashes
      for (const user of users || []) {
        const userHash = this.generateDataHash(user);
        this.baselineData.set(user.id, {
          data: user,
          hash: userHash,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`✅ Baseline captured: ${this.baselineData.size} users`);
      return true;

    } catch (error) {
      console.error('❌ Failed to capture baseline:', error.message);
      return false;
    }
  }

  // Check 1: Verify user record integrity
  async checkUserRecordIntegrity() {
    try {
      const { data: currentUsers, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      let corruptionCount = 0;
      const integrityDetails = [];

      for (const user of currentUsers || []) {
        const baseline = this.baselineData.get(user.id);
        
        if (!baseline) {
          // New user - not corruption
          continue;
        }

        const currentHash = this.generateDataHash(user);
        
        if (baseline.hash !== currentHash) {
          corruptionCount++;
          
          // Find what changed
          const changes = this.detectChanges(baseline.data, user);
          
          integrityDetails.push({
            userId: user.id,
            email: user.email,
            type: 'MODIFIED',
            changes,
            baselineHash: baseline.hash,
            currentHash: currentHash
          });

          this.logResult(
            `User Integrity: ${user.email}`,
            true,
            `Data modified for user ${user.id}`,
            { changes }
          );
        }
      }

      if (corruptionCount === 0) {
        this.logResult(
          'User Record Integrity',
          false,
          'All user records intact',
          { checkedUsers: currentUsers?.length || 0 }
        );
      }

      return {
        isCorrupted: corruptionCount > 0,
        details: integrityDetails
      };

    } catch (error) {
      this.logResult(
        'User Record Integrity',
        true,
        `Integrity check failed: ${error.message}`
      );
      return { isCorrupted: true, error: error.message };
    }
  }

  // Check 2: Verify data structure consistency
  async checkDataStructureConsistency() {
    try {
      const { data: sampleUsers, error } = await supabase
        .from('users')
        .select('*')
        .limit(10);

      if (error) throw error;

      const expectedFields = ['id', 'email', 'name', 'role', 'created_at', 'updated_at'];
      let structureIssues = 0;
      const structureDetails = [];

      for (const user of sampleUsers || []) {
        const userFields = Object.keys(user);
        const missingFields = expectedFields.filter(field => !userFields.includes(field));
        const extraFields = userFields.filter(field => !expectedFields.includes(field));

        if (missingFields.length > 0 || extraFields.length > 0) {
          structureIssues++;
          
          structureDetails.push({
            userId: user.id,
            email: user.email,
            missingFields,
            extraFields,
            totalFields: userFields.length
          });
        }
      }

      const isCorrupted = structureIssues > 0;
      
      this.logResult(
        'Data Structure Consistency',
        isCorrupted,
        isCorrupted 
          ? `Structure issues found in ${structureIssues} users`
          : 'Data structure consistent across all users',
        { issues: structureIssues, details: structureDetails }
      );

      return {
        isCorrupted,
        details: structureDetails
      };

    } catch (error) {
      this.logResult(
        'Data Structure Consistency',
        true,
        `Structure check failed: ${error.message}`
      );
      return { isCorrupted: true, error: error.message };
    }
  }

  // Check 3: Verify email uniqueness and format
  async checkEmailIntegrity() {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email')
        .limit(100);

      if (error) throw error;

      const emailMap = new Map();
      let integrityIssues = 0;
      const emailDetails = [];

      for (const user of users || []) {
        // Check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
          integrityIssues++;
          emailDetails.push({
            userId: user.id,
            email: user.email,
            issue: 'INVALID_FORMAT'
          });
          continue;
        }

        // Check for duplicates
        if (emailMap.has(user.email)) {
          integrityIssues++;
          emailDetails.push({
            userId: user.id,
            email: user.email,
            issue: 'DUPLICATE_EMAIL',
            duplicateWith: emailMap.get(user.email)
          });
        } else {
          emailMap.set(user.email, user.id);
        }
      }

      const isCorrupted = integrityIssues > 0;
      
      this.logResult(
        'Email Integrity',
        isCorrupted,
        isCorrupted 
          ? `Email integrity issues: ${integrityIssues}`
          : 'Email integrity verified',
        { issues: integrityIssues, details: emailDetails }
      );

      return {
        isCorrupted,
        details: emailDetails
      };

    } catch (error) {
      this.logResult(
        'Email Integrity',
        true,
        `Email integrity check failed: ${error.message}`
      );
      return { isCorrupted: true, error: error.message };
    }
  }

  // Check 4: Verify timestamp consistency
  async checkTimestampConsistency() {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      let timestampIssues = 0;
      const timestampDetails = [];

      for (const user of users || []) {
        const issues = [];

        // Check if timestamps exist
        if (!user.created_at) {
          issues.push('MISSING_CREATED_AT');
        }

        if (!user.updated_at) {
          issues.push('MISSING_UPDATED_AT');
        }

        // Check if updated_at is after created_at
        if (user.created_at && user.updated_at) {
          const created = new Date(user.created_at);
          const updated = new Date(user.updated_at);
          
          if (updated < created) {
            issues.push('UPDATED_BEFORE_CREATED');
          }
        }

        // Check for future timestamps
        const now = new Date();
        if (user.created_at && new Date(user.created_at) > now) {
          issues.push('FUTURE_CREATED_AT');
        }

        if (user.updated_at && new Date(user.updated_at) > now) {
          issues.push('FUTURE_UPDATED_AT');
        }

        if (issues.length > 0) {
          timestampIssues++;
          timestampDetails.push({
            userId: user.id,
            email: user.email,
            issues,
            created_at: user.created_at,
            updated_at: user.updated_at
          });
        }
      }

      const isCorrupted = timestampIssues > 0;
      
      this.logResult(
        'Timestamp Consistency',
        isCorrupted,
        isCorrupted 
          ? `Timestamp issues: ${timestampIssues}`
          : 'Timestamp consistency verified',
        { issues: timestampIssues, details: timestampDetails }
      );

      return {
        isCorrupted,
        details: timestampDetails
      };

    } catch (error) {
      this.logResult(
        'Timestamp Consistency',
        true,
        `Timestamp check failed: ${error.message}`
      );
      return { isCorrupted: true, error: error.message };
    }
  }

  // Check 5: Compare with backup data
  async checkBackupConsistency() {
    try {
      const usersBackupPath = path.join(this.backupDir, 'users-backup.sql');
      
      if (!fs.existsSync(usersBackupPath)) {
        this.logResult(
          'Backup Consistency',
          true,
          'Backup file not found'
        );
        return { isCorrupted: true };
      }

      const backupContent = fs.readFileSync(usersBackupPath, 'utf8');
      
      // Extract emails from backup
      const emailMatches = backupContent.match(/'([^@']+@[^@']+)'/g) || [];
      const backupEmails = emailMatches.map(match => match.slice(1, -1)); // Remove quotes

      // Get current emails from database
      const { data: currentUsers, error } = await supabase
        .from('users')
        .select('email')
        .limit(100);

      if (error) throw error;

      const currentEmails = currentUsers?.map(u => u.email) || [];

      // Compare
      const missingInCurrent = backupEmails.filter(email => !currentEmails.includes(email));
      const extraInCurrent = currentEmails.filter(email => !backupEmails.includes(email));

      const isCorrupted = missingInCurrent.length > 0 || extraInCurrent.length > 0;
      
      this.logResult(
        'Backup Consistency',
        isCorrupted,
        isCorrupted 
          ? `Inconsistencies detected: ${missingInCurrent.length} missing, ${extraInCurrent.length} extra`
          : 'Backup consistency verified',
        { 
          backupCount: backupEmails.length,
          currentCount: currentEmails.length,
          missingInCurrent,
          extraInCurrent
        }
      );

      return {
        isCorrupted,
        details: {
          backupCount: backupEmails.length,
          currentCount: currentEmails.length,
          missingInCurrent,
          extraInCurrent
        }
      };

    } catch (error) {
      this.logResult(
        'Backup Consistency',
        true,
        `Backup consistency check failed: ${error.message}`
      );
      return { isCorrupted: true, error: error.message };
    }
  }

  // Detect changes between baseline and current data
  detectChanges(baseline, current) {
    const changes = [];
    
    for (const key of Object.keys(baseline)) {
      if (baseline[key] !== current[key]) {
        changes.push({
          field: key,
          baseline: baseline[key],
          current: current[key]
        });
      }
    }
    
    return changes;
  }

  // Generate corruption detection report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: this.corruptionResults.totalChecks,
        corruptionDetected: this.corruptionResults.corruptionDetected,
        integrityPassed: this.corruptionResults.integrityPassed,
        corruptionRate: `${((this.corruptionResults.corruptionDetected / this.corruptionResults.totalChecks) * 100).toFixed(1)}%`
      },
      details: this.corruptionResults.details,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(process.cwd(), 'data-corruption-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n🚨 Data Corruption Detection Report:`);
    console.log(`   Total Checks: ${report.summary.totalChecks}`);
    console.log(`   Corruption Detected: ${report.summary.corruptionDetected}`);
    console.log(`   Integrity Passed: ${report.summary.integrityPassed}`);
    console.log(`   Corruption Rate: ${report.summary.corruptionRate}`);
    console.log(`   Report saved to: ${reportPath}`);

    return report;
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];

    if (this.corruptionResults.corruptionDetected > 0) {
      recommendations.push('🚨 IMMEDIATE ACTION REQUIRED: Data corruption detected');
      recommendations.push('Review corruption details and restore from backup if necessary');
      recommendations.push('Investigate root cause of corruption');
      recommendations.push('Implement additional data validation measures');
    } else {
      recommendations.push('✅ No data corruption detected - system integrity maintained');
      recommendations.push('Continue monitoring during rollback process');
    }

    recommendations.push('Schedule regular corruption detection scans');
    recommendations.push('Implement automated corruption alerts');
    recommendations.push('Document corruption response procedures');

    return recommendations;
  }

  // Run all corruption detection checks
  async runAllChecks() {
    console.log('🔍 Starting Data Corruption Detection...\n');

    // Capture baseline first
    const baselineCaptured = await this.captureBaseline();
    if (!baselineCaptured) {
      console.error('❌ Failed to capture baseline - cannot proceed with corruption detection');
      return null;
    }

    // Wait a moment for any operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run all detection checks
    await this.checkUserRecordIntegrity();
    await this.checkDataStructureConsistency();
    await this.checkEmailIntegrity();
    await this.checkTimestampConsistency();
    await this.checkBackupConsistency();

    // Generate and return report
    const report = this.generateReport();

    return report;
  }
}

// Execute corruption detection
if (require.main === module) {
  const detector = new DataCorruptionDetector();
  detector.runAllChecks()
    .then(report => {
      if (!report) {
        process.exit(1);
      }
      
      const hasCorruption = report.summary.corruptionDetected > 0;
      process.exit(hasCorruption ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Corruption detection failed:', error);
      process.exit(1);
    });
}

module.exports = DataCorruptionDetector;