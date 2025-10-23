#!/usr/bin/env node

/**
 * Status Updater Script
 * Updates implementation status for feature modules and PRD documents
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const moment = require('moment');

class StatusUpdater {
  constructor() {
    this.statusOptions = [
      { name: '📋 Planned', value: 'planned' },
      { name: '🔄 In Progress', value: 'in_progress' },
      { name: '✅ Completed', value: 'completed' },
      { name: '⚠️ Blocked', value: 'blocked' },
      { name: '❌ Deprecated', value: 'deprecated' }
    ];
    
    this.priorityOptions = [
      { name: 'P0 - Critical', value: 'P0' },
      { name: 'P1 - High', value: 'P1' },
      { name: 'P2 - Medium', value: 'P2' },
      { name: 'P3 - Low', value: 'P3' }
    ];
  }

  async updateFeatureStatus(featurePath, updates) {
    try {
      const content = await fs.readFile(featurePath, 'utf8');
      let updatedContent = content;
      
      // Update status
      if (updates.status) {
        const statusPattern = /\*\*Status\*\*:\s*\[([^\]]+)\]/;
        const statusMatch = updatedContent.match(statusPattern);
        
        if (statusMatch) {
          const newStatus = this.getStatusDisplay(updates.status);
          updatedContent = updatedContent.replace(statusPattern, `**Status**: [${newStatus}]`);
        } else {
          // Add status if not found
          updatedContent = updatedContent.replace(
            /(\*\*Feature ID\*\*:.*\n)/,
            `$1**Status**: [${this.getStatusDisplay(updates.status)]\n`
          );
        }
      }
      
      // Update priority
      if (updates.priority) {
        const priorityPattern = /\*\*Priority\*\*:\s*\[([^\]]+)\]/;
        const priorityMatch = updatedContent.match(priorityPattern);
        
        if (priorityMatch) {
          updatedContent = updatedContent.replace(priorityPattern, `**Priority**: [${updates.priority}]`);
        } else {
          // Add priority if not found
          updatedContent = updatedContent.replace(
            /(\*\*Status\*\*:.*\n)/,
            `$1**Priority**: [${updates.priority}]\n`
          );
        }
      }
      
      // Update last updated date
      const lastUpdatedPattern = /\*\*Last Updated\*\*:\s*\[([^\]]+)\]/;
      const newDate = moment().format('YYYY-MM-DD');
      
      if (updatedContent.match(lastUpdatedPattern)) {
        updatedContent = updatedContent.replace(lastUpdatedPattern, `**Last Updated**: [${newDate}]`);
      } else {
        updatedContent = updatedContent.replace(
          /(\*\*Priority\*\*:.*\n)/,
          `$1**Last Updated**: [${newDate}]\n`
        );
      }
      
      // Update progress if provided
      if (updates.progress !== undefined) {
        const progressPattern = /\*\*Progress\*\*:\s*(\d+)%/;
        const progressMatch = updatedContent.match(progressPattern);
        
        if (progressMatch) {
          updatedContent = updatedContent.replace(progressPattern, `**Progress**: ${updates.progress}%`);
        } else {
          // Add progress section
          updatedContent = updatedContent.replace(
            /(\*\*Last Updated\*\*:.*\n)/,
            `$1**Progress**: ${updates.progress}%\n`
          );
        }
      }
      
      // Add implementation notes if provided
      if (updates.notes) {
        const notesSection = `\n### Implementation Notes\n\n${updates.notes}\n\n`;
        
        if (updatedContent.includes('### Implementation Notes')) {
          const notesPattern = /### Implementation Notes\n\n([\s\S]*?)(?=\n###|\n##|$)/;
          updatedContent = updatedContent.replace(notesPattern, `### Implementation Notes\n\n${updates.notes}\n\n`);
        } else {
          // Add notes section before the last section
          updatedContent = updatedContent.replace(/(\n## [^#])/g, `${notesSection}$1`);
        }
      }
      
      await fs.writeFile(featurePath, updatedContent);
      console.log(chalk.green(`✅ Updated ${path.basename(featurePath)}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error updating ${featurePath}: ${error.message}`));
    }
  }

  getStatusDisplay(status) {
    const statusMap = {
      'planned': '📋 Planned',
      'in_progress': '🔄 In Progress',
      'completed': '✅ Completed',
      'blocked': '⚠️ Blocked',
      'deprecated': '❌ Deprecated'
    };
    return statusMap[status] || status;
  }

  async findFeatureFiles() {
    const featureFiles = [];
    const statusTrackingDir = path.join(process.cwd(), 'docs', 'prd', 'status-tracking');
    
    if (await fs.pathExists(statusTrackingDir)) {
      const files = await fs.readdir(statusTrackingDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          featureFiles.push(path.join(statusTrackingDir, file));
        }
      }
    }
    
    return featureFiles;
  }

  async interactiveUpdate() {
    console.log(chalk.blue('🔄 Interactive Status Update'));
    console.log(chalk.blue('=========================='));
    
    const featureFiles = await this.findFeatureFiles();
    
    if (featureFiles.length === 0) {
      console.log(chalk.yellow('⚠️  No feature files found in docs/prd/status-tracking/'));
      return;
    }
    
    // Select feature file
    const fileChoices = featureFiles.map(file => ({
      name: path.basename(file, '.md'),
      value: file
    }));
    
    const { selectedFile } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedFile',
        message: 'Select feature to update:',
        choices: fileChoices
      }
    ]);
    
    // Get current status
    const content = await fs.readFile(selectedFile, 'utf8');
    const statusMatch = content.match(/\*\*Status\*\*:\s*\[([^\]]+)\]/);
    const priorityMatch = content.match(/\*\*Priority\*\*:\s*\[([^\]]+)\]/);
    const progressMatch = content.match(/\*\*Progress\*\*:\s*(\d+)%/);
    
    const currentStatus = statusMatch ? statusMatch[1] : 'planned';
    const currentPriority = priorityMatch ? priorityMatch[1] : 'P2';
    const currentProgress = progressMatch ? parseInt(progressMatch[1]) : 0;
    
    // Get updates
    const updates = await inquirer.prompt([
      {
        type: 'list',
        name: 'status',
        message: 'Update status:',
        choices: this.statusOptions,
        default: this.statusOptions.find(opt => opt.value === currentStatus)?.value
      },
      {
        type: 'list',
        name: 'priority',
        message: 'Update priority:',
        choices: this.priorityOptions,
        default: currentPriority
      },
      {
        type: 'number',
        name: 'progress',
        message: 'Update progress (0-100):',
        default: currentProgress,
        validate: (value) => value >= 0 && value <= 100 || 'Progress must be between 0 and 100'
      },
      {
        type: 'input',
        name: 'notes',
        message: 'Add implementation notes (optional):',
        default: ''
      }
    ]);
    
    // Confirm update
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Update ${path.basename(selectedFile)} with new status?`,
        default: true
      }
    ]);
    
    if (confirm) {
      await this.updateFeatureStatus(selectedFile, updates);
    } else {
      console.log(chalk.yellow('Update cancelled'));
    }
  }

  async batchUpdate(updates) {
    console.log(chalk.blue('🔄 Batch Status Update'));
    console.log(chalk.blue('====================='));
    
    const featureFiles = await this.findFeatureFiles();
    
    for (const file of featureFiles) {
      await this.updateFeatureStatus(file, updates);
    }
  }

  async updateFromCI(ciData) {
    console.log(chalk.blue('🔄 CI Status Update'));
    console.log(chalk.blue('=================='));
    
    // Parse CI data (assuming JSON format)
    const updates = {
      status: ciData.status || 'in_progress',
      progress: ciData.progress || 0,
      notes: ciData.notes || `Updated from CI: ${moment().format('YYYY-MM-DD HH:mm:ss')}`
    };
    
    const featureFiles = await this.findFeatureFiles();
    
    for (const file of featureFiles) {
      // Only update if the feature matches the CI data
      if (ciData.feature && path.basename(file, '.md').includes(ciData.feature)) {
        await this.updateFeatureStatus(file, updates);
      }
    }
  }

  async generateStatusReport() {
    console.log(chalk.blue('📊 Status Report'));
    console.log(chalk.blue('================'));
    
    const featureFiles = await this.findFeatureFiles();
    const statusCounts = {
      planned: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      deprecated: 0
    };
    
    const priorityCounts = {
      P0: 0,
      P1: 0,
      P2: 0,
      P3: 0
    };
    
    let totalProgress = 0;
    let completedFeatures = 0;
    
    for (const file of featureFiles) {
      const content = await fs.readFile(file, 'utf8');
      const statusMatch = content.match(/\*\*Status\*\*:\s*\[([^\]]+)\]/);
      const priorityMatch = content.match(/\*\*Priority\*\*:\s*\[([^\]]+)\]/);
      const progressMatch = content.match(/\*\*Progress\*\*:\s*(\d+)%/);
      
      if (statusMatch) {
        const status = this.extractStatusValue(statusMatch[1]);
        statusCounts[status]++;
        
        if (status === 'completed') {
          completedFeatures++;
        }
      }
      
      if (priorityMatch) {
        priorityCounts[priorityMatch[1]]++;
      }
      
      if (progressMatch) {
        totalProgress += parseInt(progressMatch[1]);
      }
    }
    
    const totalFeatures = featureFiles.length;
    const averageProgress = totalFeatures > 0 ? Math.round(totalProgress / totalFeatures) : 0;
    
    console.log(`\nTotal Features: ${totalFeatures}`);
    console.log(`Completed Features: ${completedFeatures}`);
    console.log(`Average Progress: ${averageProgress}%`);
    
    console.log('\nStatus Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = totalFeatures > 0 ? Math.round((count / totalFeatures) * 100) : 0;
      console.log(`  ${this.getStatusDisplay(status)}: ${count} (${percentage}%)`);
    });
    
    console.log('\nPriority Distribution:');
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      const percentage = totalFeatures > 0 ? Math.round((count / totalFeatures) * 100) : 0;
      console.log(`  ${priority}: ${count} (${percentage}%)`);
    });
  }

  extractStatusValue(statusDisplay) {
    const statusMap = {
      '📋 Planned': 'planned',
      '🔄 In Progress': 'in_progress',
      '✅ Completed': 'completed',
      '⚠️ Blocked': 'blocked',
      '❌ Deprecated': 'deprecated'
    };
    return statusMap[statusDisplay] || 'planned';
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const updater = new StatusUpdater();
  
  switch (command) {
    case 'interactive':
      await updater.interactiveUpdate();
      break;
    case 'batch':
      const updates = {
        status: args[1],
        priority: args[2],
        progress: parseInt(args[3]) || 0,
        notes: args[4] || ''
      };
      await updater.batchUpdate(updates);
      break;
    case 'ci':
      const ciData = JSON.parse(args[1] || '{}');
      await updater.updateFromCI(ciData);
      break;
    case 'report':
      await updater.generateStatusReport();
      break;
    default:
      console.log(chalk.blue('Status Updater Usage:'));
      console.log('  node status-updater.js interactive  - Interactive update');
      console.log('  node status-updater.js batch <status> <priority> <progress> <notes> - Batch update');
      console.log('  node status-updater.js ci <json-data> - Update from CI');
      console.log('  node status-updater.js report - Generate status report');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = StatusUpdater;
