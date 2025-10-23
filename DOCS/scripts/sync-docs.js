#!/usr/bin/env node

/**
 * 文档同步脚本
 * 自动同步中英文文档的关键信息，确保状态、优先级、版本号一致
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');

class DocSync {
  constructor() {
    this.syncResults = {
      synced: 0,
      errors: 0,
      warnings: 0,
      details: []
    };
  }

  async syncAll() {
    console.log(chalk.blue('🔄 开始同步中英文文档...'));
    
    // 同步主要PRD文档
    await this.syncPRDDocuments();
    
    // 同步功能模块
    await this.syncFeatureModules();
    
    // 同步状态跟踪
    await this.syncStatusTracking();
    
    this.printSummary();
    return this.syncResults.errors === 0;
  }

  async syncPRDDocuments() {
    console.log(chalk.blue('📋 同步PRD文档...'));
    
    const zhFile = 'DOCS/prd/enhanced-prd.md';
    const enFile = 'DOCS/prd/enhanced-prd-en.md';
    
    if (await fs.pathExists(zhFile) && await fs.pathExists(enFile)) {
      await this.syncDocumentPair(zhFile, enFile);
    }
  }

  async syncFeatureModules() {
    console.log(chalk.blue('🔧 同步功能模块...'));
    
    const featureFiles = glob.sync('DOCS/prd/status-tracking/*.md', { cwd: process.cwd() });
    
    for (const file of featureFiles) {
      if (!file.includes('-en.md')) {
        const enFile = file.replace('.md', '-en.md');
        if (await fs.pathExists(enFile)) {
          await this.syncDocumentPair(file, enFile);
        }
      }
    }
  }

  async syncStatusTracking() {
    console.log(chalk.blue('📊 同步状态跟踪...'));
    
    const zhFile = 'DOCS/prd/status-tracking/README.md';
    const enFile = 'DOCS/prd/status-tracking/README-en.md';
    
    if (await fs.pathExists(zhFile) && await fs.pathExists(enFile)) {
      await this.syncDocumentPair(zhFile, enFile);
    }
  }

  async syncDocumentPair(zhFile, enFile) {
    try {
      const zhContent = await fs.readFile(zhFile, 'utf8');
      const enContent = await fs.readFile(enFile, 'utf8');
      
      // 提取关键信息
      const zhInfo = this.extractKeyInfo(zhContent);
      const enInfo = this.extractKeyInfo(enContent);
      
      // 同步信息
      const syncInfo = this.mergeKeyInfo(zhInfo, enInfo);
      
      // 更新文档
      const updatedZhContent = this.updateDocument(zhContent, syncInfo);
      const updatedEnContent = this.updateDocument(enContent, syncInfo);
      
      // 保存更新
      if (updatedZhContent !== zhContent) {
        await fs.writeFile(zhFile, updatedZhContent);
        this.syncResults.synced++;
        this.syncResults.details.push(`✅ 更新 ${path.basename(zhFile)}`);
      }
      
      if (updatedEnContent !== enContent) {
        await fs.writeFile(enFile, updatedEnContent);
        this.syncResults.synced++;
        this.syncResults.details.push(`✅ 更新 ${path.basename(enFile)}`);
      }
      
    } catch (error) {
      this.syncResults.errors++;
      this.syncResults.details.push(`❌ 同步失败 ${path.basename(zhFile)}: ${error.message}`);
    }
  }

  extractKeyInfo(content) {
    const versionMatch = content.match(/\*\*版本\*\*:\s*([^\s\n]+)/) || content.match(/\*\*Version\*\*:\s*([^\s\n]+)/);
    const dateMatch = content.match(/\*\*日期\*\*:\s*([^\s\n]+)/) || content.match(/\*\*Date\*\*:\s*([^\s\n]+)/);
    const statusMatch = content.match(/\*\*状态\*\*:\s*\[([^\]]+)\]/) || content.match(/\*\*Status\*\*:\s*\[([^\]]+)\]/);
    const priorityMatch = content.match(/\*\*优先级\*\*:\s*\[([^\]]+)\]/) || content.match(/\*\*Priority\*\*:\s*\[([^\]]+)\]/);
    const lastUpdatedMatch = content.match(/\*\*最后更新\*\*:\s*([^\s\n]+)/) || content.match(/\*\*Last Updated\*\*:\s*([^\s\n]+)/);
    
    return {
      version: versionMatch ? versionMatch[1] : null,
      date: dateMatch ? dateMatch[1] : null,
      status: statusMatch ? statusMatch[1] : null,
      priority: priorityMatch ? priorityMatch[1] : null,
      lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1] : null
    };
  }

  mergeKeyInfo(zhInfo, enInfo) {
    // 优先使用中文版本的信息，如果中文版本缺失则使用英文版本
    return {
      version: zhInfo.version || enInfo.version || '1.0.0',
      date: zhInfo.date || enInfo.date || new Date().toISOString().split('T')[0],
      status: zhInfo.status || enInfo.status || '📋 计划中',
      priority: zhInfo.priority || enInfo.priority || 'P2',
      lastUpdated: new Date().toISOString().split('T')[0]
    };
  }

  updateDocument(content, syncInfo) {
    let updatedContent = content;
    
    // 更新版本
    if (syncInfo.version) {
      updatedContent = updatedContent.replace(
        /\*\*(?:版本|Version)\*\*:\s*[^\s\n]+/g,
        `**${content.includes('**版本**:') ? '版本' : 'Version'}**: ${syncInfo.version}`
      );
    }
    
    // 更新日期
    if (syncInfo.date) {
      updatedContent = updatedContent.replace(
        /\*\*(?:日期|Date)\*\*:\s*[^\s\n]+/g,
        `**${content.includes('**日期**:') ? '日期' : 'Date'}**: ${syncInfo.date}`
      );
    }
    
    // 更新状态
    if (syncInfo.status) {
      updatedContent = updatedContent.replace(
        /\*\*(?:状态|Status)\*\*:\s*\[[^\]]+\]/g,
        `**${content.includes('**状态**:') ? '状态' : 'Status'}**: [${syncInfo.status}]`
      );
    }
    
    // 更新优先级
    if (syncInfo.priority) {
      updatedContent = updatedContent.replace(
        /\*\*(?:优先级|Priority)\*\*:\s*\[[^\]]+\]/g,
        `**${content.includes('**优先级**:') ? '优先级' : 'Priority'}**: [${syncInfo.priority}]`
      );
    }
    
    // 更新最后更新日期
    if (syncInfo.lastUpdated) {
      updatedContent = updatedContent.replace(
        /\*\*(?:最后更新|Last Updated)\*\*:\s*[^\s\n]+/g,
        `**${content.includes('**最后更新**:') ? '最后更新' : 'Last Updated'}**: ${syncInfo.lastUpdated}`
      );
    }
    
    return updatedContent;
  }

  printSummary() {
    console.log(chalk.blue('\n📊 同步摘要'));
    console.log(chalk.blue('=================='));
    
    console.log(`同步文件: ${this.syncResults.synced}`);
    console.log(chalk.green(`成功: ${this.syncResults.synced}`));
    console.log(chalk.red(`错误: ${this.syncResults.errors}`));
    console.log(chalk.yellow(`警告: ${this.syncResults.warnings}`));
    
    if (this.syncResults.details.length > 0) {
      console.log(chalk.blue('\n详细信息:'));
      this.syncResults.details.forEach(detail => {
        if (detail.startsWith('✅')) {
          console.log(chalk.green(detail));
        } else if (detail.startsWith('❌')) {
          console.log(chalk.red(detail));
        } else {
          console.log(chalk.yellow(detail));
        }
      });
    }
    
    if (this.syncResults.errors === 0) {
      console.log(chalk.green('\n🎉 所有文档同步成功!'));
    }
  }

  async validateSync() {
    console.log(chalk.blue('🔍 验证同步结果...'));
    
    const featureFiles = glob.sync('DOCS/prd/status-tracking/*.md', { cwd: process.cwd() });
    let inconsistencies = 0;
    
    for (const file of featureFiles) {
      if (!file.includes('-en.md')) {
        const enFile = file.replace('.md', '-en.md');
        if (await fs.pathExists(enFile)) {
          const zhInfo = this.extractKeyInfo(await fs.readFile(file, 'utf8'));
          const enInfo = this.extractKeyInfo(await fs.readFile(enFile, 'utf8'));
          
          // 检查关键信息一致性
          if (zhInfo.version !== enInfo.version || 
              zhInfo.status !== enInfo.status || 
              zhInfo.priority !== enInfo.priority) {
            inconsistencies++;
            console.log(chalk.yellow(`⚠️  不一致: ${path.basename(file)}`));
          }
        }
      }
    }
    
    if (inconsistencies === 0) {
      console.log(chalk.green('✅ 所有文档同步一致!'));
    } else {
      console.log(chalk.red(`❌ 发现 ${inconsistencies} 个不一致项`));
    }
    
    return inconsistencies === 0;
  }
}

// CLI接口
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const sync = new DocSync();
  
  switch (command) {
    case 'sync':
      await sync.syncAll();
      break;
    case 'validate':
      await sync.validateSync();
      break;
    default:
      console.log(chalk.blue('文档同步工具使用说明:'));
      console.log('  node sync-docs.js sync      - 同步所有文档');
      console.log('  node sync-docs.js validate  - 验证同步结果');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DocSync;
