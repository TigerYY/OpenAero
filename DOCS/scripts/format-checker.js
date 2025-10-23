#!/usr/bin/env node

/**
 * Format Checker Script
 * Checks Markdown formatting and style compliance
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');

class FormatChecker {
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

  async checkFile(filePath) {
    console.log(chalk.blue(`🔍 Checking format: ${filePath}`));
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      this.stats.totalFiles++;
      
      // Check various formatting rules
      this.checkLineLength(content, fileName);
      this.checkHeadingFormat(content, fileName);
      this.checkListFormat(content, fileName);
      this.checkTableFormat(content, fileName);
      this.checkLinkFormat(content, fileName);
      this.checkCodeBlockFormat(content, fileName);
      this.checkWhitespace(content, fileName);
      this.checkConsistency(content, fileName);
      
      if (this.errors.length === 0) {
        this.stats.validFiles++;
        console.log(chalk.green(`✅ ${fileName} format is valid`));
      } else {
        this.stats.invalidFiles++;
        console.log(chalk.red(`❌ ${fileName} has ${this.errors.length} format errors`));
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

  checkLineLength(content, fileName) {
    const lines = content.split('\n');
    const maxLength = 120;
    
    lines.forEach((line, index) => {
      if (line.length > maxLength && !line.startsWith('http') && !line.includes('```')) {
        this.warnings.push({
          file: fileName,
          type: 'line_length',
          message: `Line ${index + 1} exceeds ${maxLength} characters (${line.length})`,
          line: index + 1,
          content: line.substring(0, 50) + '...'
        });
      }
    });
  }

  checkHeadingFormat(content, fileName) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for proper heading format
      if (line.match(/^#{1,6}\s/)) {
        // Check for trailing spaces
        if (line.endsWith(' ')) {
          this.errors.push({
            file: fileName,
            type: 'heading_format',
            message: 'Heading should not have trailing spaces',
            line: index + 1,
            content: line
          });
        }
        
        // Check for proper capitalization
        const headingText = line.replace(/^#{1,6}\s+/, '');
        if (headingText.length > 0 && headingText[0] !== headingText[0].toUpperCase()) {
          this.warnings.push({
            file: fileName,
            type: 'heading_capitalization',
            message: 'Heading should start with capital letter',
            line: index + 1,
            content: line
          });
        }
      }
    });
  }

  checkListFormat(content, fileName) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for consistent list formatting
      if (line.match(/^\s*[-*+]\s/)) {
        // Check for proper indentation
        const indent = line.match(/^(\s*)/)[1];
        if (indent.length % 2 !== 0) {
          this.warnings.push({
            file: fileName,
            type: 'list_indentation',
            message: 'List items should use even number of spaces for indentation',
            line: index + 1,
            content: line
          });
        }
        
        // Check for space after list marker
        if (!line.match(/^\s*[-*+]\s\s/)) {
          this.warnings.push({
            file: fileName,
            type: 'list_spacing',
            message: 'List items should have space after marker',
            line: index + 1,
            content: line
          });
        }
      }
      
      // Check for checkbox format consistency
      if (line.match(/^\s*[-*+]\s\[[ x]\]\s/)) {
        // Check for proper checkbox format
        if (!line.match(/^\s*[-*+]\s\[[ x]\]\s\w/)) {
          this.warnings.push({
            file: fileName,
            type: 'checkbox_format',
            message: 'Checkbox should have space after bracket',
            line: index + 1,
            content: line
          });
        }
      }
    });
  }

  checkTableFormat(content, fileName) {
    const lines = content.split('\n');
    let inTable = false;
    
    lines.forEach((line, index) => {
      if (line.includes('|')) {
        if (!inTable) {
          inTable = true;
        }
        
        // Check for proper table formatting
        if (!line.match(/^\s*\|.*\|.*\|\s*$/)) {
          this.errors.push({
            file: fileName,
            type: 'table_format',
            message: 'Table row should start and end with |',
            line: index + 1,
            content: line
          });
        }
        
        // Check for consistent column count
        const columns = line.split('|').length - 2; // Subtract 2 for empty strings at start/end
        if (columns > 0) {
          // This is a basic check - could be enhanced
        }
      } else if (inTable && line.trim() === '') {
        // Empty line in table
      } else if (inTable && !line.includes('|')) {
        inTable = false;
      }
    });
  }

  checkLinkFormat(content, fileName) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for proper link formatting
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = linkRegex.exec(line)) !== null) {
        const linkText = match[1];
        const linkUrl = match[2];
        
        // Check for empty link text
        if (linkText.trim() === '') {
          this.errors.push({
            file: fileName,
            type: 'link_format',
            message: 'Link text cannot be empty',
            line: index + 1,
            content: line
          });
        }
        
        // Check for empty URL
        if (linkUrl.trim() === '') {
          this.errors.push({
            file: fileName,
            type: 'link_format',
            message: 'Link URL cannot be empty',
            line: index + 1,
            content: line
          });
        }
        
        // Check for proper URL format
        if (linkUrl.includes(' ') && !linkUrl.startsWith('mailto:')) {
          this.warnings.push({
            file: fileName,
            type: 'link_format',
            message: 'Link URL should not contain spaces',
            line: index + 1,
            content: line
          });
        }
      }
    });
  }

  checkCodeBlockFormat(content, fileName) {
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockStart = 0;
    
    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStart = index;
        } else {
          inCodeBlock = false;
        }
      } else if (inCodeBlock) {
        // Check for proper indentation in code blocks
        if (line.trim() !== '' && !line.startsWith('    ') && !line.startsWith('\t')) {
          this.warnings.push({
            file: fileName,
            type: 'code_block_format',
            message: 'Code block content should be properly indented',
            line: index + 1,
            content: line
          });
        }
      }
    });
  }

  checkWhitespace(content, fileName) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for trailing whitespace
      if (line.endsWith(' ') || line.endsWith('\t')) {
        this.errors.push({
          file: fileName,
          type: 'whitespace',
          message: 'Line has trailing whitespace',
          line: index + 1,
          content: line
        });
      }
      
      // Check for multiple consecutive empty lines
      if (index > 0 && line.trim() === '' && lines[index - 1].trim() === '') {
        this.warnings.push({
          file: fileName,
          type: 'whitespace',
          message: 'Multiple consecutive empty lines',
          line: index + 1,
          content: line
        });
      }
    });
  }

  checkConsistency(content, fileName) {
    const lines = content.split('\n');
    
    // Check for consistent bullet points
    const bulletTypes = new Set();
    lines.forEach(line => {
      if (line.match(/^\s*[-*+]\s/)) {
        const bullet = line.match(/^\s*([-*+])\s/)[1];
        bulletTypes.add(bullet);
      }
    });
    
    if (bulletTypes.size > 1) {
      this.warnings.push({
        file: fileName,
        type: 'consistency',
        message: `Inconsistent bullet point types: ${Array.from(bulletTypes).join(', ')}`,
        line: 0,
        content: ''
      });
    }
    
    // Check for consistent heading levels
    const headingLevels = lines
      .filter(line => line.match(/^#{1,6}\s/))
      .map(line => line.match(/^(#{1,6})\s/)[1].length);
    
    if (headingLevels.length > 0) {
      const maxLevel = Math.max(...headingLevels);
      const minLevel = Math.min(...headingLevels);
      
      if (maxLevel - minLevel > 3) {
        this.warnings.push({
          file: fileName,
          type: 'consistency',
          message: 'Heading levels span too many levels',
          line: 0,
          content: ''
        });
      }
    }
  }

  async checkAll(pattern = 'DOCS/**/*.md') {
    console.log(chalk.blue('🔍 Starting format check...'));
    
    const files = glob.sync(pattern, { cwd: process.cwd() });
    
    for (const file of files) {
      await this.checkFile(file);
    }
    
    this.printSummary();
    return this.errors.length === 0;
  }

  printSummary() {
    console.log(chalk.blue('\n📊 Format Check Summary'));
    console.log(chalk.blue('========================'));
    
    console.log(`Total files: ${this.stats.totalFiles}`);
    console.log(chalk.green(`Valid files: ${this.stats.validFiles}`));
    console.log(chalk.red(`Invalid files: ${this.stats.invalidFiles}`));
    console.log(chalk.red(`Total errors: ${this.errors.length}`));
    console.log(chalk.yellow(`Total warnings: ${this.warnings.length}`));
    
    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ Format Errors:'));
      this.errors.forEach(error => {
        console.log(chalk.red(`  ${error.file}:${error.line} - ${error.message}`));
        if (error.content) {
          console.log(chalk.red(`    Content: ${error.content}`));
        }
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Format Warnings:'));
      this.warnings.forEach(warning => {
        console.log(chalk.yellow(`  ${warning.file}:${warning.line} - ${warning.message}`));
        if (warning.content) {
          console.log(chalk.yellow(`    Content: ${warning.content}`));
        }
      });
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('\n🎉 All files have valid format!'));
    }
  }

  async fixFormat(filePath) {
    console.log(chalk.blue(`🔧 Fixing format: ${filePath}`));
    
    try {
      let content = await fs.readFile(filePath, 'utf8');
      
      // Fix trailing whitespace
      content = content.replace(/[ \t]+$/gm, '');
      
      // Fix multiple consecutive empty lines
      content = content.replace(/\n\n\n+/g, '\n\n');
      
      // Fix heading trailing spaces
      content = content.replace(/^(#{1,6}\s+.*?)\s+$/gm, '$1');
      
      // Fix list spacing
      content = content.replace(/^(\s*[-*+])\s+(\[?[ x]\]?\s*)/gm, '$1 $2');
      
      await fs.writeFile(filePath, content);
      console.log(chalk.green(`✅ Fixed format: ${filePath}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error fixing format ${filePath}: ${error.message}`));
    }
  }

  async fixAll(pattern = 'DOCS/**/*.md') {
    console.log(chalk.blue('🔧 Fixing format for all files...'));
    
    const files = glob.sync(pattern, { cwd: process.cwd() });
    
    for (const file of files) {
      await this.fixFormat(file);
    }
    
    console.log(chalk.green('✅ Format fixing completed'));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const pattern = args[0] || 'DOCS/**/*.md';
  const fix = args.includes('--fix');
  
  const checker = new FormatChecker();
  
  if (fix) {
    await checker.fixAll(pattern);
  } else {
    const isValid = await checker.checkAll(pattern);
    process.exit(isValid ? 0 : 1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = FormatChecker;
