#!/usr/bin/env node

/**
 * Link Checker Script
 * Checks for broken links in documentation
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class LinkChecker {
  constructor() {
    this.brokenLinks = [];
    this.workingLinks = [];
    this.skippedLinks = [];
    this.stats = {
      totalLinks: 0,
      workingLinks: 0,
      brokenLinks: 0,
      skippedLinks: 0
    };
  }

  async checkLinks(filePath) {
    console.log(chalk.blue(`🔍 Checking links in: ${filePath}`));
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const links = this.extractLinks(content, filePath);
      
      for (const link of links) {
        this.stats.totalLinks++;
        
        if (this.shouldSkipLink(link.url)) {
          this.skippedLinks.push(link);
          this.stats.skippedLinks++;
          continue;
        }
        
        const isWorking = await this.checkLink(link);
        
        if (isWorking) {
          this.workingLinks.push(link);
          this.stats.workingLinks++;
        } else {
          this.brokenLinks.push(link);
          this.stats.brokenLinks++;
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error reading file ${filePath}: ${error.message}`));
    }
  }

  extractLinks(content, filePath) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const lines = content.split('\n');
    
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      links.push({
        text: linkText,
        url: linkUrl,
        file: path.basename(filePath),
        filePath: filePath,
        line: lineNumber,
        isInternal: this.isInternalLink(linkUrl),
        resolvedPath: this.resolveInternalLink(linkUrl, filePath)
      });
    }
    
    return links;
  }

  isInternalLink(url) {
    return url.startsWith('./') || url.startsWith('../') || url.startsWith('/') || !url.includes('://');
  }

  resolveInternalLink(url, baseFilePath) {
    if (!this.isInternalLink(url)) {
      return url;
    }
    
    const baseDir = path.dirname(baseFilePath);
    
    if (url.startsWith('/')) {
      return path.join(process.cwd(), url);
    } else {
      return path.resolve(baseDir, url);
    }
  }

  shouldSkipLink(url) {
    const skipPatterns = [
      'mailto:',
      'tel:',
      'javascript:',
      'data:',
      'placeholder',
      'example.com',
      'TODO',
      'FIXME',
      '#'
    ];
    
    return skipPatterns.some(pattern => url.includes(pattern));
  }

  async checkLink(link) {
    if (link.isInternal) {
      return this.checkInternalLink(link);
    } else {
      return this.checkExternalLink(link);
    }
  }

  async checkInternalLink(link) {
    try {
      const exists = await fs.pathExists(link.resolvedPath);
      
      if (exists) {
        console.log(chalk.green(`✅ ${link.url} -> ${link.resolvedPath}`));
        return true;
      } else {
        console.log(chalk.red(`❌ ${link.url} -> ${link.resolvedPath} (not found)`));
        return false;
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${link.url} -> ${link.resolvedPath} (error: ${error.message})`));
      return false;
    }
  }

  async checkExternalLink(link) {
    return new Promise((resolve) => {
      try {
        const url = new URL(link.url);
        const options = {
          method: 'HEAD',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)'
          }
        };
        
        const request = (url.protocol === 'https:' ? https : http).request(url, options, (response) => {
          if (response.statusCode >= 200 && response.statusCode < 400) {
            console.log(chalk.green(`✅ ${link.url} (${response.statusCode})`));
            resolve(true);
          } else {
            console.log(chalk.red(`❌ ${link.url} (${response.statusCode})`));
            resolve(false);
          }
        });
        
        request.on('error', (error) => {
          console.log(chalk.red(`❌ ${link.url} (error: ${error.message})`));
          resolve(false);
        });
        
        request.on('timeout', () => {
          console.log(chalk.red(`❌ ${link.url} (timeout)`));
          request.destroy();
          resolve(false);
        });
        
        request.setTimeout(10000);
        request.end();
        
      } catch (error) {
        console.log(chalk.red(`❌ ${link.url} (invalid URL: ${error.message})`));
        resolve(false);
      }
    });
  }

  async checkAll(pattern = 'DOCS/**/*.md') {
    console.log(chalk.blue('🔗 Starting link check...'));
    
    const files = glob.sync(pattern, { cwd: process.cwd() });
    
    for (const file of files) {
      await this.checkLinks(file);
    }
    
    this.printSummary();
    return this.brokenLinks.length === 0;
  }

  printSummary() {
    console.log(chalk.blue('\n📊 Link Check Summary'));
    console.log(chalk.blue('===================='));
    
    console.log(`Total links: ${this.stats.totalLinks}`);
    console.log(chalk.green(`Working links: ${this.stats.workingLinks}`));
    console.log(chalk.red(`Broken links: ${this.stats.brokenLinks}`));
    console.log(chalk.yellow(`Skipped links: ${this.stats.skippedLinks}`));
    
    if (this.brokenLinks.length > 0) {
      console.log(chalk.red('\n❌ Broken Links:'));
      this.brokenLinks.forEach(link => {
        console.log(chalk.red(`  ${link.file}:${link.line} - ${link.url}`));
        if (link.isInternal) {
          console.log(chalk.red(`    Expected path: ${link.resolvedPath}`));
        }
      });
    }
    
    if (this.skippedLinks.length > 0) {
      console.log(chalk.yellow('\n⚠️  Skipped Links:'));
      this.skippedLinks.forEach(link => {
        console.log(chalk.yellow(`  ${link.file}:${link.line} - ${link.url}`));
      });
    }
    
    if (this.brokenLinks.length === 0) {
      console.log(chalk.green('\n🎉 All links are working!'));
    }
  }

  async generateReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      brokenLinks: this.brokenLinks,
      workingLinks: this.workingLinks,
      skippedLinks: this.skippedLinks
    };
    
    await fs.writeJson(outputPath, report, { spaces: 2 });
    console.log(chalk.green(`📄 Report saved to: ${outputPath}`));
  }

  async fixInternalLinks() {
    console.log(chalk.blue('🔧 Fixing internal links...'));
    
    for (const link of this.brokenLinks) {
      if (link.isInternal) {
        await this.suggestFix(link);
      }
    }
  }

  async suggestFix(link) {
    const dir = path.dirname(link.resolvedPath);
    const filename = path.basename(link.resolvedPath);
    
    try {
      const files = await fs.readdir(dir);
      const similarFiles = files.filter(file => 
        file.toLowerCase().includes(filename.toLowerCase()) ||
        filename.toLowerCase().includes(file.toLowerCase())
      );
      
      if (similarFiles.length > 0) {
        console.log(chalk.yellow(`💡 Suggested fix for ${link.url}:`));
        similarFiles.forEach(file => {
          console.log(chalk.yellow(`  - ${path.relative(process.cwd(), path.join(dir, file))}`));
        });
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const pattern = args[0] || 'docs/**/*.md';
  const outputPath = args[1];
  
  const checker = new LinkChecker();
  const isValid = await checker.checkAll(pattern);
  
  if (outputPath) {
    await checker.generateReport(outputPath);
  }
  
  if (args.includes('--fix')) {
    await checker.fixInternalLinks();
  }
  
  process.exit(isValid ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = LinkChecker;
