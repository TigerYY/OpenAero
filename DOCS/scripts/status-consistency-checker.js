#!/usr/bin/env node

/**
 * Status Consistency Checker
 * Automated checking for status consistency across all feature modules
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');

class StatusConsistencyChecker {
  constructor() {
    this.inconsistencies = [];
    this.stats = {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0
    };
  }

  async checkConsistency() {
    console.log(chalk.blue('🔍 Starting status consistency check...'));
    
    const featureFiles = glob.sync('docs/prd/status-tracking/*.md', { cwd: process.cwd() });
    const prdFile = 'docs/prd/enhanced-prd.md';
    
    // Check feature files against PRD
    await this.checkFeatureAgainstPRD(featureFiles, prdFile);
    
    // Check cross-feature dependencies
    await this.checkCrossFeatureDependencies(featureFiles);
    
    // Check status progression
    await this.checkStatusProgression(featureFiles);
    
    this.printSummary();
    return this.inconsistencies.length === 0;
  }

  async checkFeatureAgainstPRD(featureFiles, prdFile) {
    console.log(chalk.blue('📋 Checking features against PRD...'));
    
    try {
      const prdContent = await fs.readFile(prdFile, 'utf8');
      
      for (const featureFile of featureFiles) {
        const featureContent = await fs.readFile(featureFile, 'utf8');
        const featureName = path.basename(featureFile, '.md');
        
        // Check if feature is mentioned in PRD
        if (!prdContent.includes(featureName)) {
          this.inconsistencies.push({
            type: 'prd_missing',
            message: `Feature ${featureName} not found in PRD document`,
            file: featureFile,
            severity: 'warning'
          });
        }
        
        // Check status consistency
        const prdStatus = this.extractPRDStatus(prdContent, featureName);
        const featureStatus = this.extractFeatureStatus(featureContent);
        
        if (prdStatus && featureStatus && prdStatus !== featureStatus) {
          this.inconsistencies.push({
            type: 'status_mismatch',
            message: `Status mismatch: PRD shows ${prdStatus}, feature shows ${featureStatus}`,
            file: featureFile,
            severity: 'error'
          });
        }
        
        this.stats.totalChecks++;
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error checking PRD: ${error.message}`));
    }
  }

  async checkCrossFeatureDependencies(featureFiles) {
    console.log(chalk.blue('🔗 Checking cross-feature dependencies...'));
    
    const features = [];
    
    // Load all feature data
    for (const featureFile of featureFiles) {
      const content = await fs.readFile(featureFile, 'utf8');
      const featureData = this.extractFeatureData(content, path.basename(featureFile, '.md'));
      features.push(featureData);
    }
    
    // Check dependencies
    for (const feature of features) {
      if (feature.dependencies && feature.dependencies.length > 0) {
        for (const dep of feature.dependencies) {
          const depFeature = features.find(f => f.id === dep);
          
          if (!depFeature) {
            this.inconsistencies.push({
              type: 'missing_dependency',
              message: `Feature ${feature.id} depends on ${dep} but it doesn't exist`,
              file: feature.file,
              severity: 'error'
            });
          } else if (depFeature.status === '📋 Planned' && feature.status === '✅ Completed') {
            this.inconsistencies.push({
              type: 'dependency_violation',
              message: `Feature ${feature.id} is completed but depends on ${dep} which is only planned`,
              file: feature.file,
              severity: 'error'
            });
          }
        }
      }
    }
  }

  async checkStatusProgression(featureFiles) {
    console.log(chalk.blue('📈 Checking status progression...'));
    
    for (const featureFile of featureFiles) {
      const content = await fs.readFile(featureFile, 'utf8');
      const featureName = path.basename(featureFile, '.md');
      
      // Check for invalid status transitions
      const statusHistory = this.extractStatusHistory(content);
      if (statusHistory.length > 1) {
        for (let i = 1; i < statusHistory.length; i++) {
          const prevStatus = statusHistory[i - 1].status;
          const currStatus = statusHistory[i].status;
          
          if (!this.isValidStatusTransition(prevStatus, currStatus)) {
            this.inconsistencies.push({
              type: 'invalid_transition',
              message: `Invalid status transition from ${prevStatus} to ${currStatus}`,
              file: featureFile,
              severity: 'warning'
            });
          }
        }
      }
    }
  }

  extractPRDStatus(prdContent, featureName) {
    // Look for feature status in PRD
    const statusPattern = new RegExp(`\\*\\*Status\\*\\*:\\s*\\[([^\\]]+)\\]`, 'g');
    let match;
    
    while ((match = statusPattern.exec(prdContent)) !== null) {
      // This is a simplified check - in practice, you'd need more sophisticated parsing
      if (prdContent.includes(featureName)) {
        return match[1];
      }
    }
    
    return null;
  }

  extractFeatureStatus(content) {
    const statusMatch = content.match(/\*\*Status\*\*:\s*\[([^\]]+)\]/);
    return statusMatch ? statusMatch[1] : null;
  }

  extractFeatureData(content, featureId) {
    const statusMatch = content.match(/\*\*Status\*\*:\s*\[([^\]]+)\]/);
    const dependenciesMatch = content.match(/\*\*Dependencies\*\*:\s*([^\n]+)/);
    
    return {
      id: featureId,
      status: statusMatch ? statusMatch[1] : null,
      dependencies: dependenciesMatch ? dependenciesMatch[1].split(',').map(d => d.trim()) : [],
      file: `docs/prd/status-tracking/${featureId}.md`
    };
  }

  extractStatusHistory(content) {
    // Extract status history from implementation notes or changelog
    const history = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('Status changed to') || line.includes('Updated status')) {
        const statusMatch = line.match(/Status changed to \[([^\]]+)\]/);
        if (statusMatch) {
          history.push({
            status: statusMatch[1],
            date: new Date().toISOString().split('T')[0] // Simplified
          });
        }
      }
    }
    
    return history;
  }

  isValidStatusTransition(from, to) {
    const validTransitions = {
      '📋 Planned': ['🔄 In Progress', '❌ Deprecated'],
      '🔄 In Progress': ['✅ Completed', '⚠️ Blocked', '❌ Deprecated'],
      '⚠️ Blocked': ['🔄 In Progress', '❌ Deprecated'],
      '✅ Completed': ['❌ Deprecated'], // Completed features can be deprecated
      '❌ Deprecated': [] // Deprecated features can't transition
    };
    
    return validTransitions[from] && validTransitions[from].includes(to);
  }

  printSummary() {
    console.log(chalk.blue('\n📊 Consistency Check Summary'));
    console.log(chalk.blue('============================'));
    
    console.log(`Total checks: ${this.stats.totalChecks}`);
    console.log(chalk.green(`Passed checks: ${this.stats.passedChecks}`));
    console.log(chalk.red(`Failed checks: ${this.stats.failedChecks}`));
    console.log(chalk.red(`Inconsistencies found: ${this.inconsistencies.length}`));
    
    if (this.inconsistencies.length > 0) {
      console.log(chalk.red('\n❌ Inconsistencies:'));
      
      const errors = this.inconsistencies.filter(i => i.severity === 'error');
      const warnings = this.inconsistencies.filter(i => i.severity === 'warning');
      
      if (errors.length > 0) {
        console.log(chalk.red('\nErrors:'));
        errors.forEach(inc => {
          console.log(chalk.red(`  ${inc.file} - ${inc.message}`));
        });
      }
      
      if (warnings.length > 0) {
        console.log(chalk.yellow('\nWarnings:'));
        warnings.forEach(inc => {
          console.log(chalk.yellow(`  ${inc.file} - ${inc.message}`));
        });
      }
    } else {
      console.log(chalk.green('\n🎉 All consistency checks passed!'));
    }
  }

  async generateConsistencyReport() {
    console.log(chalk.blue('📊 Generating Consistency Report...'));
    
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      inconsistencies: this.inconsistencies,
      summary: {
        totalFeatures: this.stats.totalChecks,
        consistentFeatures: this.stats.passedChecks,
        inconsistentFeatures: this.stats.failedChecks,
        errorCount: this.inconsistencies.filter(i => i.severity === 'error').length,
        warningCount: this.inconsistencies.filter(i => i.severity === 'warning').length
      }
    };
    
    const reportPath = 'docs/reports/consistency-report.json';
    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeJson(reportPath, report, { spaces: 2 });
    
    console.log(chalk.green(`📄 Consistency report saved to: ${reportPath}`));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const report = args.includes('--report');
  
  const checker = new StatusConsistencyChecker();
  const isConsistent = await checker.checkConsistency();
  
  if (report) {
    await checker.generateConsistencyReport();
  }
  
  process.exit(isConsistent ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = StatusConsistencyChecker;
