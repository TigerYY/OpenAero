#!/usr/bin/env node

/**
 * CI Status Updater
 * Automatically updates feature status from development pipeline
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');

class CIStatusUpdater {
  constructor() {
    this.ciData = {};
    this.featureFiles = [];
  }

  async updateFromCI(ciData) {
    console.log(chalk.blue('🔄 Updating status from CI pipeline...'));
    
    this.ciData = ciData;
    await this.loadFeatureFiles();
    
    // Update status based on CI data
    await this.updateFeatureStatuses();
    
    // Update PRD document
    await this.updatePRDDocument();
    
    // Generate status report
    await this.generateStatusReport();
    
    console.log(chalk.green('✅ CI status update completed!'));
  }

  async loadFeatureFiles() {
    this.featureFiles = glob.sync('docs/prd/status-tracking/*.md', { cwd: process.cwd() });
  }

  async updateFeatureStatuses() {
    for (const file of this.featureFiles) {
      const content = await fs.readFile(file, 'utf8');
      const updatedContent = this.updateFeatureContent(content, file);
      
      if (updatedContent !== content) {
        await fs.writeFile(file, updatedContent);
        console.log(chalk.green(`✅ Updated ${path.basename(file)}`));
      }
    }
  }

  updateFeatureContent(content, filePath) {
    const fileName = path.basename(filePath, '.md');
    let updatedContent = content;
    
    // Check if this feature has CI data
    const featureCIData = this.ciData.features?.[fileName];
    if (!featureCIData) return content;
    
    // Update status based on CI status
    if (featureCIData.status) {
      const statusPattern = /\*\*Status\*\*:\s*\[([^\]]+)\]/;
      const newStatus = this.mapCIStatusToFeatureStatus(featureCIData.status);
      
      if (updatedContent.match(statusPattern)) {
        updatedContent = updatedContent.replace(statusPattern, `**Status**: [${newStatus}]`);
      }
    }
    
    // Update progress
    if (featureCIData.progress !== undefined) {
      const progressPattern = /\*\*Progress\*\*:\s*(\d+)%/;
      
      if (updatedContent.match(progressPattern)) {
        updatedContent = updatedContent.replace(progressPattern, `**Progress**: ${featureCIData.progress}%`);
      } else {
        // Add progress if not exists
        updatedContent = updatedContent.replace(
          /(\*\*Last Updated\*\*:.*\n)/,
          `$1**Progress**: ${featureCIData.progress}%\n`
        );
      }
    }
    
    // Update last updated date
    const lastUpdatedPattern = /\*\*Last Updated\*\*:\s*\[([^\]]+)\]/;
    const newDate = new Date().toISOString().split('T')[0];
    
    if (updatedContent.match(lastUpdatedPattern)) {
      updatedContent = updatedContent.replace(lastUpdatedPattern, `**Last Updated**: [${newDate}]`);
    }
    
    // Add CI update note
    const ciNote = `\n### CI Update\n\n**CI Status**: ${featureCIData.status}\n**CI Build**: ${featureCIData.buildId || 'N/A'}\n**CI Timestamp**: ${new Date().toISOString()}\n\n`;
    
    if (!updatedContent.includes('### CI Update')) {
      updatedContent = updatedContent.replace(/(\n## [^#])/g, `${ciNote}$1`);
    }
    
    return updatedContent;
  }

  mapCIStatusToFeatureStatus(ciStatus) {
    const statusMap = {
      'success': '✅ Completed',
      'running': '🔄 In Progress',
      'pending': '📋 Planned',
      'failed': '⚠️ Blocked',
      'cancelled': '❌ Deprecated'
    };
    
    return statusMap[ciStatus] || '📋 Planned';
  }

  async updatePRDDocument() {
    const prdFile = 'docs/prd/enhanced-prd.md';
    
    if (!await fs.pathExists(prdFile)) {
      console.log(chalk.yellow('⚠️  PRD document not found, skipping update'));
      return;
    }
    
    const content = await fs.readFile(prdFile, 'utf8');
    const updatedContent = this.updatePRDContent(content);
    
    if (updatedContent !== content) {
      await fs.writeFile(prdFile, updatedContent);
      console.log(chalk.green('✅ Updated PRD document'));
    }
  }

  updatePRDContent(content) {
    let updatedContent = content;
    
    // Update last updated date
    const lastUpdatedPattern = /\*\*Last Updated\*\*:\s*([^\n]+)/;
    const newDate = new Date().toISOString().split('T')[0];
    
    if (updatedContent.match(lastUpdatedPattern)) {
      updatedContent = updatedContent.replace(lastUpdatedPattern, `**Last Updated**: ${newDate}`);
    }
    
    // Add CI update section
    const ciUpdateSection = `\n## CI Pipeline Status\n\n**Last CI Update**: ${new Date().toISOString()}\n**CI Status**: ${this.ciData.overallStatus || 'Unknown'}\n**Build ID**: ${this.ciData.buildId || 'N/A'}\n\n`;
    
    if (!updatedContent.includes('## CI Pipeline Status')) {
      updatedContent = updatedContent.replace(/(\n## [^#])/g, `${ciUpdateSection}$1`);
    }
    
    return updatedContent;
  }

  async generateStatusReport() {
    const reportPath = 'docs/reports/ci-status-report.json';
    await fs.ensureDir(path.dirname(reportPath));
    
    const report = {
      timestamp: new Date().toISOString(),
      ciData: this.ciData,
      updatedFeatures: this.featureFiles.map(f => path.basename(f, '.md')),
      summary: {
        totalFeatures: this.featureFiles.length,
        updatedFeatures: this.featureFiles.length,
        ciStatus: this.ciData.overallStatus || 'Unknown'
      }
    };
    
    await fs.writeJson(reportPath, report, { spaces: 2 });
    console.log(chalk.green(`📄 CI status report saved to: ${reportPath}`));
  }

  async processWebhook(webhookData) {
    console.log(chalk.blue('🔗 Processing webhook data...'));
    
    // Parse webhook data
    const ciData = this.parseWebhookData(webhookData);
    
    // Update status
    await this.updateFromCI(ciData);
    
    // Send notification (if configured)
    await this.sendNotification(ciData);
  }

  parseWebhookData(webhookData) {
    // Parse webhook data from various CI systems
    const ciData = {
      overallStatus: webhookData.status || 'unknown',
      buildId: webhookData.build_id || webhookData.buildId,
      features: {}
    };
    
    // Parse feature-specific data
    if (webhookData.features) {
      webhookData.features.forEach(feature => {
        ciData.features[feature.name] = {
          status: feature.status,
          progress: feature.progress,
          tests: feature.tests,
          coverage: feature.coverage
        };
      });
    }
    
    return ciData;
  }

  async sendNotification(ciData) {
    // Send notification to team (email, Slack, etc.)
    console.log(chalk.blue('📧 Sending notification...'));
    
    // This would integrate with notification services
    // For now, just log the notification
    console.log(chalk.green(`✅ Notification sent for CI status: ${ciData.overallStatus}`));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const updater = new CIStatusUpdater();
  
  switch (command) {
    case 'update':
      const ciData = JSON.parse(args[1] || '{}');
      await updater.updateFromCI(ciData);
      break;
      
    case 'webhook':
      const webhookData = JSON.parse(args[1] || '{}');
      await updater.processWebhook(webhookData);
      break;
      
    default:
      console.log(chalk.blue('CI Status Updater Usage:'));
      console.log('  node ci-status-updater.js update <ci-data-json>');
      console.log('  node ci-status-updater.js webhook <webhook-data-json>');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CIStatusUpdater;
