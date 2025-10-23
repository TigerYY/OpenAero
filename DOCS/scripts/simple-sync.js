#!/usr/bin/env node

/**
 * 简化同步脚本
 * 不依赖外部包的中英文文档同步
 */

const fs = require('fs');
const path = require('path');

class SimpleSync {
  constructor() {
    this.results = {
      synced: 0,
      errors: 0,
      details: []
    };
  }

  async syncAll() {
    console.log('🔄 开始同步中英文文档...');
    
    try {
      // 同步主要PRD文档
      await this.syncPRDDocuments();
      
      // 同步功能模块
      await this.syncFeatureModules();
      
      // 同步状态跟踪
      await this.syncStatusTracking();
      
      this.printSummary();
      return this.results.errors === 0;
    } catch (error) {
      console.error('❌ 同步过程中发生错误:', error.message);
      return false;
    }
  }

  async syncPRDDocuments() {
    console.log('📋 同步PRD文档...');
    
    const zhFile = 'docs/prd/enhanced-prd.md';
    const enFile = 'docs/prd/enhanced-prd-en.md';
    
    if (this.fileExists(zhFile) && this.fileExists(enFile)) {
      await this.syncDocumentPair(zhFile, enFile);
    }
  }

  async syncFeatureModules() {
    console.log('🔧 同步功能模块...');
    
    const featureFiles = [
      'docs/prd/status-tracking/user-auth.md',
      'docs/prd/status-tracking/i18n.md',
      'docs/prd/status-tracking/solutions.md',
      'docs/prd/status-tracking/creator-app.md',
      'docs/prd/status-tracking/admin-dashboard.md'
    ];
    
    for (const file of featureFiles) {
      const enFile = file.replace('.md', '-en.md');
      if (this.fileExists(file) && this.fileExists(enFile)) {
        await this.syncDocumentPair(file, enFile);
      }
    }
  }

  async syncStatusTracking() {
    console.log('📊 同步状态跟踪...');
    
    const zhFile = 'docs/prd/status-tracking/README.md';
    const enFile = 'docs/prd/status-tracking/README-en.md';
    
    if (this.fileExists(zhFile) && this.fileExists(enFile)) {
      await this.syncDocumentPair(zhFile, enFile);
    }
  }

  async syncDocumentPair(zhFile, enFile) {
    try {
      const zhContent = await this.readFile(zhFile);
      const enContent = await this.readFile(enFile);
      
      // 提取关键信息
      const zhInfo = this.extractKeyInfo(zhContent);
      const enInfo = this.extractKeyInfo(enContent);
      
      // 同步信息
      const syncInfo = this.mergeKeyInfo(zhInfo, enInfo);
      
      // 更新文档
      const updatedZhContent = this.updateDocument(zhContent, syncInfo, true);
      const updatedEnContent = this.updateDocument(enContent, syncInfo, false);
      
      // 保存更新
      if (updatedZhContent !== zhContent) {
        await this.writeFile(zhFile, updatedZhContent);
        this.results.synced++;
        this.results.details.push(`✅ 更新 ${path.basename(zhFile)}`);
      }
      
      if (updatedEnContent !== enContent) {
        await this.writeFile(enFile, updatedEnContent);
        this.results.synced++;
        this.results.details.push(`✅ 更新 ${path.basename(enFile)}`);
      }
      
    } catch (error) {
      this.results.errors++;
      this.results.details.push(`❌ 同步失败 ${path.basename(zhFile)}: ${error.message}`);
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

  updateDocument(content, syncInfo, isChinese) {
    let updatedContent = content;
    
    // 更新版本
    if (syncInfo.version) {
      const versionKey = isChinese ? '版本' : 'Version';
      updatedContent = updatedContent.replace(
        new RegExp(`\\*\\*${versionKey}\\*\\*:\\s*[^\\s\\n]+`, 'g'),
        `**${versionKey}**: ${syncInfo.version}`
      );
    }
    
    // 更新日期
    if (syncInfo.date) {
      const dateKey = isChinese ? '日期' : 'Date';
      updatedContent = updatedContent.replace(
        new RegExp(`\\*\\*${dateKey}\\*\\*:\\s*[^\\s\\n]+`, 'g'),
        `**${dateKey}**: ${syncInfo.date}`
      );
    }
    
    // 更新状态
    if (syncInfo.status) {
      const statusKey = isChinese ? '状态' : 'Status';
      updatedContent = updatedContent.replace(
        new RegExp(`\\*\\*${statusKey}\\*\\*:\\s*\\[[^\\]]+\\]`, 'g'),
        `**${statusKey}**: [${syncInfo.status}]`
      );
    }
    
    // 更新优先级
    if (syncInfo.priority) {
      const priorityKey = isChinese ? '优先级' : 'Priority';
      updatedContent = updatedContent.replace(
        new RegExp(`\\*\\*${priorityKey}\\*\\*:\\s*\\[[^\\]]+\\]`, 'g'),
        `**${priorityKey}**: [${syncInfo.priority}]`
      );
    }
    
    // 更新最后更新日期
    if (syncInfo.lastUpdated) {
      const lastUpdatedKey = isChinese ? '最后更新' : 'Last Updated';
      updatedContent = updatedContent.replace(
        new RegExp(`\\*\\*${lastUpdatedKey}\\*\\*:\\s*[^\\s\\n]+`, 'g'),
        `**${lastUpdatedKey}**: ${syncInfo.lastUpdated}`
      );
    }
    
    return updatedContent;
  }

  fileExists(filePath) {
    try {
      fs.accessSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  async writeFile(filePath, content) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  printSummary() {
    console.log('\n📊 同步摘要');
    console.log('==================');
    
    console.log(`同步文件: ${this.results.synced}`);
    console.log(`成功: ${this.results.synced}`);
    console.log(`错误: ${this.results.errors}`);
    
    if (this.results.details.length > 0) {
      console.log('\n详细信息:');
      this.results.details.forEach(detail => {
        console.log(detail);
      });
    }
    
    if (this.results.errors === 0) {
      console.log('\n🎉 所有文档同步成功!');
    }
  }
}

// CLI接口
async function main() {
  const sync = new SimpleSync();
  const success = await sync.syncAll();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SimpleSync;
