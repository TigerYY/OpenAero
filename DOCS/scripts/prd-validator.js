#!/usr/bin/env node

/**
 * PRD Document Validator
 * Validates PRD documents for completeness, consistency, and quality
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');
const yaml = require('yaml');

class PRDValidator {
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
    console.log(chalk.blue(`🔍 Validating PRD document: ${filePath}`));
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      this.stats.totalFiles++;
      
      // Validate document structure
      this.validateDocumentStructure(content, fileName);
      
      // Validate required sections
      this.validateRequiredSections(content, fileName);
      
      // Validate status indicators
      this.validateStatusIndicators(content, fileName);
      
      // Validate links
      await this.validateLinks(content, fileName, filePath);
      
      // Validate formatting
      this.validateFormatting(content, fileName);
      
      if (this.errors.length === 0) {
        this.stats.validFiles++;
        console.log(chalk.green(`✅ ${fileName} is valid`));
      } else {
        this.stats.invalidFiles++;
        console.log(chalk.red(`❌ ${fileName} has ${this.errors.length} errors`));
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

  validateDocumentStructure(content, fileName) {
    const lines = content.split('\n');
    
    // Check for required header
    if (!content.includes('**Version**:') || !content.includes('**Date**:') || !content.includes('**Status**:')) {
      this.errors.push({
        file: fileName,
        type: 'structure',
        message: 'Missing required header fields (Version, Date, Status)',
        line: 1
      });
    }
    
    // Check for proper heading hierarchy
    let h1Count = 0;
    let h2Count = 0;
    
    lines.forEach((line, index) => {
      if (line.startsWith('# ')) h1Count++;
      if (line.startsWith('## ')) h2Count++;
      
      // Check for orphaned headings
      if (line.startsWith('### ') && h2Count === 0) {
        this.warnings.push({
          file: fileName,
          type: 'structure',
          message: 'H3 heading without H2 parent',
          line: index + 1
        });
      }
    });
    
    if (h1Count === 0) {
      this.errors.push({
        file: fileName,
        type: 'structure',
        message: 'Document must have at least one H1 heading',
        line: 1
      });
    }
    
    if (h1Count > 1) {
      this.warnings.push({
        file: fileName,
        type: 'structure',
        message: 'Document should have only one H1 heading',
        line: 1
      });
    }
  }

  validateRequiredSections(content, fileName) {
    const requiredSections = [
      'Executive Summary',
      'Feature Modules',
      'Technical Requirements',
      'Business Requirements',
      'Implementation Roadmap',
      'Success Criteria'
    ];
    
    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        this.errors.push({
          file: fileName,
          type: 'completeness',
          message: `Missing required section: ${section}`,
          line: 0
        });
      }
    });
  }

  validateStatusIndicators(content, fileName) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for valid status indicators
      if (line.includes('**Status**:')) {
        const statusMatch = line.match(/\*\*Status\*\*:\s*\[([^\]]+)\]/);
        if (statusMatch) {
          const status = statusMatch[1];
          const validStatuses = ['Draft', 'Review', 'Approved', 'Archived', '📋 Planned', '🔄 In Progress', '✅ Completed', '⚠️ Blocked', '❌ Deprecated'];
          
          if (!validStatuses.some(validStatus => status.includes(validStatus))) {
            this.warnings.push({
              file: fileName,
              type: 'status',
              message: `Unrecognized status indicator: ${status}`,
              line: index + 1
            });
          }
        }
      }
      
      // Check for valid priority indicators
      if (line.includes('**Priority**:')) {
        const priorityMatch = line.match(/\*\*Priority\*\*:\s*\[([^\]]+)\]/);
        if (priorityMatch) {
          const priority = priorityMatch[1];
          const validPriorities = ['P0', 'P1', 'P2', 'P3'];
          
          if (!validPriorities.includes(priority)) {
            this.warnings.push({
              file: fileName,
              type: 'priority',
              message: `Invalid priority level: ${priority}. Must be P0, P1, P2, or P3`,
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
      // Check for broken internal links
      if (link.url.startsWith('./') || link.url.startsWith('../')) {
        const resolvedPath = path.resolve(path.dirname(filePath), link.url);
        
        if (!fs.existsSync(resolvedPath)) {
          this.errors.push({
            file: fileName,
            type: 'link',
            message: `Broken internal link: ${link.url}`,
            line: link.line
          });
        }
      }
      
      // Check for placeholder links
      if (link.url.includes('placeholder') || link.url.includes('example.com') || link.url.includes('TODO')) {
        this.warnings.push({
          file: fileName,
          type: 'link',
          message: `Placeholder link detected: ${link.url}`,
          line: link.line
        });
      }
    }
  }

  validateFormatting(content, fileName) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for consistent list formatting
      if (line.match(/^\s*[-*+]\s/)) {
        if (!line.match(/^\s*[-*+]\s\[[ x]\]\s/)) {
          this.warnings.push({
            file: fileName,
            type: 'formatting',
            message: 'Consider using checkbox format for actionable items',
            line: index + 1
          });
        }
      }
      
      // Check for proper table formatting
      if (line.includes('|') && !line.match(/^\s*\|.*\|.*\|\s*$/)) {
        this.warnings.push({
          file: fileName,
          type: 'formatting',
          message: 'Table row should start and end with |',
          line: index + 1
        });
      }
      
      // Check for consistent heading formatting
      if (line.match(/^#{1,6}\s/)) {
        if (line.includes('  ')) {
          this.warnings.push({
            file: fileName,
            type: 'formatting',
            message: 'Heading should not have trailing spaces',
            line: index + 1
          });
        }
      }
    });
  }

  async validateAll(pattern = '**/*.md') {
    console.log(chalk.blue('🚀 Starting PRD validation...'));
    
    const files = glob.sync(pattern, { cwd: process.cwd() });
    
    for (const file of files) {
      await this.validate(file);
    }
    
    this.printSummary();
    return this.errors.length === 0;
  }

  printSummary() {
    console.log(chalk.blue('\n📊 Validation Summary'));
    console.log(chalk.blue('=================='));
    
    console.log(`Total files: ${this.stats.totalFiles}`);
    console.log(chalk.green(`Valid files: ${this.stats.validFiles}`));
    console.log(chalk.red(`Invalid files: ${this.stats.invalidFiles}`));
    console.log(chalk.red(`Total errors: ${this.errors.length}`));
    console.log(chalk.yellow(`Total warnings: ${this.warnings.length}`));
    
    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'));
      this.errors.forEach(error => {
        console.log(chalk.red(`  ${error.file}:${error.line} - ${error.message}`));
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      this.warnings.forEach(warning => {
        console.log(chalk.yellow(`  ${warning.file}:${warning.line} - ${warning.message}`));
      });
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('\n🎉 All documents are valid!'));
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const pattern = args[0] || 'docs/**/*.md';
  
  const validator = new PRDValidator();
  const isValid = await validator.validateAll(pattern);
  
  process.exit(isValid ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PRDValidator;
