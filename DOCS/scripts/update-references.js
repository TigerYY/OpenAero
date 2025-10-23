#!/usr/bin/env node

/**
 * 引用更新脚本
 * 自动更新所有文档中的文件引用，确保链接和路径正确
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');

class ReferenceUpdater {
  constructor() {
    this.updateResults = {
      filesUpdated: 0,
      linksUpdated: 0,
      errors: 0,
      details: []
    };
  }

  async updateAll() {
    console.log(chalk.blue('🔄 开始更新文档引用...'));
    
    // 更新所有Markdown文件
    await this.updateMarkdownFiles();
    
    // 更新脚本文件
    await this.updateScriptFiles();
    
    // 更新配置文件
    await this.updateConfigFiles();
    
    this.printSummary();
    return this.updateResults.errors === 0;
  }

  async updateMarkdownFiles() {
    console.log(chalk.blue('📄 更新Markdown文件...'));
    
    const mdFiles = glob.sync('DOCS/**/*.md', { cwd: process.cwd() });
    
    for (const file of mdFiles) {
      await this.updateFile(file);
    }
  }

  async updateScriptFiles() {
    console.log(chalk.blue('🔧 更新脚本文件...'));
    
    const scriptFiles = glob.sync('DOCS/scripts/*.js', { cwd: process.cwd() });
    
    for (const file of scriptFiles) {
      await this.updateFile(file);
    }
  }

  async updateConfigFiles() {
    console.log(chalk.blue('⚙️  更新配置文件...'));
    
    const configFiles = [
      'package.json',
      'next.config.js',
      'tailwind.config.js',
      'tsconfig.json'
    ];
    
    for (const file of configFiles) {
      if (await fs.pathExists(file)) {
        await this.updateFile(file);
      }
    }
  }

  async updateFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const updatedContent = this.updateContent(content, filePath);
      
      if (updatedContent !== content) {
        await fs.writeFile(filePath, updatedContent);
        this.updateResults.filesUpdated++;
        this.updateResults.details.push(`✅ 更新 ${filePath}`);
      }
    } catch (error) {
      this.updateResults.errors++;
      this.updateResults.details.push(`❌ 更新失败 ${filePath}: ${error.message}`);
    }
  }

  updateContent(content, filePath) {
    let updatedContent = content;
    
    // 更新文件路径引用
    updatedContent = this.updateFilePathReferences(updatedContent, filePath);
    
    // 更新链接引用
    updatedContent = this.updateLinkReferences(updatedContent, filePath);
    
    // 更新脚本引用
    updatedContent = this.updateScriptReferences(updatedContent, filePath);
    
    return updatedContent;
  }

  updateFilePathReferences(content, filePath) {
    let updatedContent = content;
    
    // 更新PRD文档引用
    const prdPatterns = [
      { from: 'enhanced-prd-zh.md', to: 'enhanced-prd.md' },
      { from: 'enhanced-prd-en.md', to: 'enhanced-prd-en.md' },
      { from: 'README-zh.md', to: 'README.md' },
      { from: 'README-en.md', to: 'README-en.md' },
      { from: 'user-auth-zh.md', to: 'user-auth.md' },
      { from: 'user-auth-en.md', to: 'user-auth-en.md' },
      { from: 'i18n-zh.md', to: 'i18n.md' },
      { from: 'i18n-en.md', to: 'i18n-en.md' },
      { from: 'solutions-zh.md', to: 'solutions.md' },
      { from: 'solutions-en.md', to: 'solutions-en.md' },
      { from: 'creator-app-zh.md', to: 'creator-app.md' },
      { from: 'creator-app-en.md', to: 'creator-app-en.md' },
      { from: 'admin-dashboard-zh.md', to: 'admin-dashboard.md' },
      { from: 'admin-dashboard-en.md', to: 'admin-dashboard-en.md' }
    ];
    
    prdPatterns.forEach(pattern => {
      const regex = new RegExp(pattern.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (updatedContent.match(regex)) {
        updatedContent = updatedContent.replace(regex, pattern.to);
        this.updateResults.linksUpdated++;
      }
    });
    
    return updatedContent;
  }

  updateLinkReferences(content, filePath) {
    let updatedContent = content;
    
    // 更新相对路径链接
    const linkPatterns = [
      { from: '../enhanced-prd-zh.md', to: '../enhanced-prd.md' },
      { from: '../enhanced-prd-en.md', to: '../enhanced-prd-en.md' },
      { from: './enhanced-prd-zh.md', to: './enhanced-prd.md' },
      { from: './enhanced-prd-en.md', to: './enhanced-prd-en.md' }
    ];
    
    linkPatterns.forEach(pattern => {
      const regex = new RegExp(pattern.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (updatedContent.match(regex)) {
        updatedContent = updatedContent.replace(regex, pattern.to);
        this.updateResults.linksUpdated++;
      }
    });
    
    return updatedContent;
  }

  updateScriptReferences(content, filePath) {
    let updatedContent = content;
    
    // 更新脚本文件引用
    const scriptPatterns = [
      { from: 'status-validator.js', to: 'status-validator-zh.js' },
      { from: 'status-reporter.js', to: 'status-reporter-zh.js' }
    ];
    
    // 只在package.json中更新脚本引用
    if (filePath.includes('package.json')) {
      scriptPatterns.forEach(pattern => {
        const regex = new RegExp(pattern.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        if (updatedContent.match(regex)) {
          updatedContent = updatedContent.replace(regex, pattern.to);
          this.updateResults.linksUpdated++;
        }
      });
    }
    
    return updatedContent;
  }

  printSummary() {
    console.log(chalk.blue('\n📊 引用更新摘要'));
    console.log(chalk.blue('=================='));
    
    console.log(`更新文件: ${this.updateResults.filesUpdated}`);
    console.log(`更新链接: ${this.updateResults.linksUpdated}`);
    console.log(chalk.green(`成功: ${this.updateResults.filesUpdated}`));
    console.log(chalk.red(`错误: ${this.updateResults.errors}`));
    
    if (this.updateResults.details.length > 0) {
      console.log(chalk.blue('\n详细信息:'));
      this.updateResults.details.forEach(detail => {
        if (detail.startsWith('✅')) {
          console.log(chalk.green(detail));
        } else if (detail.startsWith('❌')) {
          console.log(chalk.red(detail));
        }
      });
    }
    
    if (this.updateResults.errors === 0) {
      console.log(chalk.green('\n🎉 所有引用更新成功!'));
    }
  }

  async validateReferences() {
    console.log(chalk.blue('🔍 验证引用完整性...'));
    
    const mdFiles = glob.sync('DOCS/**/*.md', { cwd: process.cwd() });
    let brokenLinks = 0;
    
    for (const file of mdFiles) {
      const content = await fs.readFile(file, 'utf8');
      const links = this.extractLinks(content);
      
      for (const link of links) {
        if (link.url.startsWith('./') || link.url.startsWith('../')) {
          const resolvedPath = path.resolve(path.dirname(file), link.url);
          
          if (!await fs.pathExists(resolvedPath)) {
            brokenLinks++;
            console.log(chalk.red(`❌ 损坏链接: ${file} -> ${link.url}`));
          }
        }
      }
    }
    
    if (brokenLinks === 0) {
      console.log(chalk.green('✅ 所有引用完整!'));
    } else {
      console.log(chalk.red(`❌ 发现 ${brokenLinks} 个损坏链接`));
    }
    
    return brokenLinks === 0;
  }

  extractLinks(content) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return links;
  }
}

// CLI接口
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const updater = new ReferenceUpdater();
  
  switch (command) {
    case 'update':
      await updater.updateAll();
      break;
    case 'validate':
      await updater.validateReferences();
      break;
    default:
      console.log(chalk.blue('引用更新工具使用说明:'));
      console.log('  node update-references.js update   - 更新所有引用');
      console.log('  node update-references.js validate - 验证引用完整性');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ReferenceUpdater;
