#!/usr/bin/env node

/**
 * Status Validator Script
 * Validates implementation status consistency across feature modules
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');

class StatusValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      totalErrors: 0,
      totalWarnings: 0
    };
  }

  async validateStatus(filePath) {
    console.log(chalk.blue(`🔍 Validating status: ${filePath}`));
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      this.stats.totalFiles++;
      
      // Extract status information
      const statusInfo = this.extractStatusInfo(content, fileName);
      
      // Validate status consistency
      this.validateStatusConsistency(statusInfo, fileName);
      
      // Validate progress consistency
      this.validateProgressConsistency(statusInfo, fileName);
      
      // Validate date consistency
      this.validateDateConsistency(statusInfo, fileName);
      
      if (this.errors.length === 0) {
        this.stats.validFiles++;
        console.log(chalk.green(`✅ ${fileName} status is valid`));
      } else {
        this.stats.invalidFiles++;
        console.log(chalk.red(`❌ ${fileName} has ${this.errors.length} status errors`));
      }
      
    } catch (error) {
      this.errors.push({
        file: filePath,
        type: 'file_error',
        message: `Failed to read file: ${error.message}`,
        line: 0
      });
      this.stats.invalidFiles++;
    }
  }

  extractStatusInfo(content, fileName) {
    const statusMatch = content.match(/\*\*Status\*\*:\s*\[([^\]]+)\]/);
    const priorityMatch = content.match(/\*\*Priority\*\*:\s*\[([^\]]+)\]/);
    const progressMatch = content.match(/\*\*Progress\*\*:\s*(\d+)%/);
    const lastUpdatedMatch = content.match(/\*\*Last Updated\*\*:\s*\[([^\]]+)\]/);
    const versionMatch = content.match(/\*\*Version\*\*:\s*([^\s]+)/);
    
    return {
      status: statusMatch ? statusMatch[1] : null,
      priority: priorityMatch ? priorityMatch[1] : null,
      progress: progressMatch ? parseInt(progressMatch[1]) : null,
      lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1] : null,
      version: versionMatch ? versionMatch[1] : null,
      fileName
    };
  }

  validateStatusConsistency(statusInfo, fileName) {
    const { status, priority, progress } = statusInfo;
    
    // Validate status values
    const validStatuses = ['📋 Planned', '🔄 In Progress', '✅ Completed', '⚠️ Blocked', '❌ Deprecated'];
    if (status && !validStatuses.includes(status)) {
      this.errors.push({
        file: fileName,
        type: 'status_validation',
        message: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`,
        line: 0
      });
    }
    
    // Validate priority values
    const validPriorities = ['P0', 'P1', 'P2', 'P3'];
    if (priority && !validPriorities.includes(priority)) {
      this.errors.push({
        file: fileName,
        type: 'priority_validation',
        message: `Invalid priority: ${priority}. Must be one of: ${validPriorities.join(', ')}`,
        line: 0
      });
    }
    
    // Validate status and progress consistency
    if (status === '✅ Completed' && progress !== null && progress < 100) {
      this.warnings.push({
        file: fileName,
        type: 'status_progress_mismatch',
        message: 'Status is Completed but progress is less than 100%',
        line: 0
      });
    }
    
    if (status === '📋 Planned' && progress !== null && progress > 0) {
      this.warnings.push({
        file: fileName,
        type: 'status_progress_mismatch',
        message: 'Status is Planned but progress is greater than 0%',
        line: 0
      });
    }
  }

  validateProgressConsistency(statusInfo, fileName) {
    const { progress } = statusInfo;
    
    if (progress !== null && (progress < 0 || progress > 100)) {
      this.errors.push({
        file: fileName,
        type: 'progress_validation',
        message: `Invalid progress: ${progress}%. Must be between 0 and 100`,
        line: 0
      });
    }
  }

  validateDateConsistency(statusInfo, fileName) {
    const { lastUpdated } = statusInfo;
    
    if (lastUpdated) {
      const date = new Date(lastUpdated);
      if (isNaN(date.getTime())) {
        this.errors.push({
          file: fileName,
          type: 'date_validation',
          message: `Invalid date format: ${lastUpdated}. Must be YYYY-MM-DD`,
          line: 0
        });
      } else {
        const today = new Date();
        const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 30) {
          this.warnings.push({
            file: fileName,
            type: 'date_stale',
            message: `Last updated ${diffDays} days ago. Consider updating status`,
            line: 0
          });
        }
      }
    }
  }

  async validateAll(pattern = 'docs/prd/status-tracking/*.md') {
    console.log(chalk.blue('🔍 Starting status validation...'));
    
    const files = glob.sync(pattern, { cwd: process.cwd() });
    
    for (const file of files) {
      await this.validateStatus(file);
    }
    
    this.printSummary();
    return this.errors.length === 0;
  }

  printSummary() {
    console.log(chalk.blue('\n📊 Status Validation Summary'));
    console.log(chalk.blue('============================'));
    
    console.log(`Total files: ${this.stats.totalFiles}`);
    console.log(chalk.green(`Valid files: ${this.stats.validFiles}`));
    console.log(chalk.red(`Invalid files: ${this.stats.invalidFiles}`));
    console.log(chalk.red(`Total errors: ${this.errors.length}`));
    console.log(chalk.yellow(`Total warnings: ${this.warnings.length}`));
    
    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ Status Errors:'));
      this.errors.forEach(error => {
        console.log(chalk.red(`  ${error.file} - ${error.message}`));
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Status Warnings:'));
      this.warnings.forEach(warning => {
        console.log(chalk.yellow(`  ${warning.file} - ${warning.message}`));
      });
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('\n🎉 All status information is valid!'));
    }
  }

  async generateStatusReport() {
    console.log(chalk.blue('📊 Generating Status Report...'));
    
    const files = glob.sync('docs/prd/status-tracking/*.md', { cwd: process.cwd() });
    const statusCounts = {
      '📋 Planned': 0,
      '🔄 In Progress': 0,
      '✅ Completed': 0,
      '⚠️ Blocked': 0,
      '❌ Deprecated': 0
    };
    
    const priorityCounts = {
      'P0': 0,
      'P1': 0,
      'P2': 0,
      'P3': 0
    };
    
    let totalProgress = 0;
    let completedFeatures = 0;
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const statusInfo = this.extractStatusInfo(content, path.basename(file));
      
      if (statusInfo.status) {
        statusCounts[statusInfo.status] = (statusCounts[statusInfo.status] || 0) + 1;
        
        if (statusInfo.status === '✅ Completed') {
          completedFeatures++;
        }
      }
      
      if (statusInfo.priority) {
        priorityCounts[statusInfo.priority] = (priorityCounts[statusInfo.priority] || 0) + 1;
      }
      
      if (statusInfo.progress !== null) {
        totalProgress += statusInfo.progress;
      }
    }
    
    const totalFeatures = files.length;
    const averageProgress = totalFeatures > 0 ? Math.round(totalProgress / totalFeatures) : 0;
    
    console.log(`\nTotal Features: ${totalFeatures}`);
    console.log(`Completed Features: ${completedFeatures}`);
    console.log(`Average Progress: ${averageProgress}%`);
    
    console.log('\nStatus Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = totalFeatures > 0 ? Math.round((count / totalFeatures) * 100) : 0;
      console.log(`  ${status}: ${count} (${percentage}%)`);
    });
    
    console.log('\nPriority Distribution:');
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      const percentage = totalFeatures > 0 ? Math.round((count / totalFeatures) * 100) : 0;
      console.log(`  ${priority}: ${count} (${percentage}%)`);
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const pattern = args[0] || 'docs/prd/status-tracking/*.md';
  const report = args.includes('--report');
  
  const validator = new StatusValidator();
  
  if (report) {
    await validator.generateStatusReport();
  } else {
    const isValid = await validator.validateAll(pattern);
    process.exit(isValid ? 0 : 1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = StatusValidator;
