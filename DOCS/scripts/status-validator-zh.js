#!/usr/bin/env node

/**
 * 状态验证脚本 (中文兼容版)
 * 验证PRD文档的完整性、一致性和质量
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');
const yaml = require('yaml');

class StatusValidatorZH {
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

  async validate(filePath) {
    console.log(chalk.blue(`🔍 验证PRD文档: ${filePath}`));
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      this.stats.totalFiles++;
      
      // 验证文档结构
      this.validateDocumentStructure(content, fileName);
      
      // 验证必需部分
      this.validateRequiredSections(content, fileName);
      
      // 验证状态指示器
      this.validateStatusIndicators(content, fileName);
      
      // 验证链接
      await this.validateLinks(content, fileName, filePath);
      
      // 验证格式
      this.validateFormatting(content, fileName);
      
      if (this.errors.length === 0) {
        this.stats.validFiles++;
        console.log(chalk.green(`✅ ${fileName} 验证通过`));
      } else {
        this.stats.invalidFiles++;
        console.log(chalk.red(`❌ ${fileName} 有 ${this.errors.length} 个错误`));
      }
      
    } catch (error) {
      this.errors.push({
        file: filePath,
        type: 'file_error',
        message: `读取文件失败: ${error.message}`,
        line: 0
      });
      this.stats.invalidFiles++;
    }
  }

  validateDocumentStructure(content, fileName) {
    const lines = content.split('\n');
    
    // 检查必需的头部
    if (!content.includes('**版本**:') || !content.includes('**日期**:') || !content.includes('**状态**:')) {
      this.errors.push({
        file: fileName,
        type: 'structure',
        message: '缺少必需的头部字段 (版本, 日期, 状态)',
        line: 1
      });
    }
    
    // 检查正确的标题层次
    let h1Count = 0;
    let h2Count = 0;
    
    lines.forEach((line, index) => {
      if (line.startsWith('# ')) h1Count++;
      if (line.startsWith('## ')) h2Count++;
      
      // 检查孤立的标题
      if (line.startsWith('### ') && h2Count === 0) {
        this.warnings.push({
          file: fileName,
          type: 'structure',
          message: 'H3标题没有H2父级',
          line: index + 1
        });
      }
    });
    
    if (h1Count === 0) {
      this.errors.push({
        file: fileName,
        type: 'structure',
        message: '文档必须至少有一个H1标题',
        line: 1
      });
    }
    
    if (h1Count > 1) {
      this.warnings.push({
        file: fileName,
        type: 'structure',
        message: '文档应该只有一个H1标题',
        line: 1
      });
    }
  }

  validateRequiredSections(content, fileName) {
    const requiredSections = [
      '概述',
      '需求',
      '技术规范',
      '实施状态',
      '测试',
      '指标和KPI'
    ];
    
    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        this.errors.push({
          file: fileName,
          type: 'completeness',
          message: `缺少必需的部分: ${section}`,
          line: 0
        });
      }
    });
  }

  validateStatusIndicators(content, fileName) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 检查有效的状态指示器
      if (line.includes('**状态**:')) {
        const statusMatch = line.match(/\*\*状态\*\*:\s*\[([^\]]+)\]/);
        if (statusMatch) {
          const status = statusMatch[1];
          const validStatuses = ['草稿', '审查', '已批准', '已归档', '📋 计划中', '🔄 进行中', '✅ 已完成', '⚠️ 阻塞', '❌ 已废弃'];
          
          if (!validStatuses.some(validStatus => status.includes(validStatus))) {
            this.warnings.push({
              file: fileName,
              type: 'status',
              message: `未识别的状态指示器: ${status}`,
              line: index + 1
            });
          }
        }
      }
      
      // 检查有效的优先级指示器
      if (line.includes('**优先级**:')) {
        const priorityMatch = line.match(/\*\*优先级\*\*:\s*\[([^\]]+)\]/);
        if (priorityMatch) {
          const priority = priorityMatch[1];
          const validPriorities = ['P0', 'P1', 'P2', 'P3'];
          
          if (!validPriorities.includes(priority)) {
            this.warnings.push({
              file: fileName,
              type: 'priority',
              message: `无效的优先级级别: ${priority}. 必须是 P0, P1, P2, 或 P3`,
              line: index + 1
            });
          }
        }
      }
    });
  }

  async validateLinks(content, fileName, filePath) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    for (const link of links) {
      // 检查损坏的内部链接
      if (link.url.startsWith('./') || link.url.startsWith('../')) {
        const resolvedPath = path.resolve(path.dirname(filePath), link.url);
        
        if (!fs.existsSync(resolvedPath)) {
          this.errors.push({
            file: fileName,
            type: 'link',
            message: `损坏的内部链接: ${link.url}`,
            line: link.line
          });
        }
      }
      
      // 检查占位符链接
      if (link.url.includes('placeholder') || link.url.includes('example.com') || link.url.includes('TODO')) {
        this.warnings.push({
          file: fileName,
          type: 'link',
          message: `检测到占位符链接: ${link.url}`,
          line: link.line
        });
      }
    }
  }

  validateFormatting(content, fileName) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 检查一致的列表格式
      if (line.match(/^\s*[-*+]\s/)) {
        if (!line.match(/^\s*[-*+]\s\[[ x]\]\s/)) {
          this.warnings.push({
            file: fileName,
            type: 'formatting',
            message: '考虑对可操作项目使用复选框格式',
            line: index + 1
          });
        }
      }
      
      // 检查正确的表格格式
      if (line.includes('|') && !line.match(/^\s*\|.*\|.*\|\s*$/)) {
        this.warnings.push({
          file: fileName,
          type: 'formatting',
          message: '表格行应该以 | 开始和结束',
          line: index + 1
        });
      }
      
      // 检查一致的标题格式
      if (line.match(/^#{1,6}\s/)) {
        if (line.includes('  ')) {
          this.warnings.push({
            file: fileName,
            type: 'formatting',
            message: '标题不应该有尾随空格',
            line: index + 1
          });
        }
      }
    });
  }

  async validateAll(pattern = '**/*.md') {
    console.log(chalk.blue('🚀 开始PRD验证...'));
    
    const files = glob.sync(pattern, { cwd: process.cwd() });
    
    for (const file of files) {
      await this.validate(file);
    }
    
    this.printSummary();
    return this.errors.length === 0;
  }

  printSummary() {
    console.log(chalk.blue('\n📊 验证摘要'));
    console.log(chalk.blue('=================='));
    
    console.log(`总文件数: ${this.stats.totalFiles}`);
    console.log(chalk.green(`有效文件: ${this.stats.validFiles}`));
    console.log(chalk.red(`无效文件: ${this.stats.invalidFiles}`));
    console.log(chalk.red(`总错误数: ${this.errors.length}`));
    console.log(chalk.yellow(`总警告数: ${this.warnings.length}`));
    
    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ 错误:'));
      this.errors.forEach(error => {
        console.log(chalk.red(`  ${error.file}:${error.line} - ${error.message}`));
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  警告:'));
      this.warnings.forEach(warning => {
        console.log(chalk.yellow(`  ${warning.file}:${warning.line} - ${warning.message}`));
      });
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('\n🎉 所有文档都有效!'));
    }
  }
}

// CLI接口
async function main() {
  const args = process.argv.slice(2);
  const pattern = args[0] || 'DOCS/**/*.md';
  
  const validator = new StatusValidatorZH();
  const isValid = await validator.validateAll(pattern);
  
  process.exit(isValid ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = StatusValidatorZH;
