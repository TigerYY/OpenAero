#!/usr/bin/env node

/**
 * 批量修复 console 语句脚本
 * 将 console 语句包装在开发环境检查中
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 要处理的文件扩展名
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// 排除的目录
const EXCLUDE_DIRS = [
  'node_modules',
  '.next',
  'out',
  'dist',
  'coverage',
  '.git',
  'scripts', // 脚本文件中的 console 可以保留
];

// 排除的文件模式
const EXCLUDE_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /\.config\.(ts|js)$/,
  /\.d\.ts$/,
];

// Console 语句模式
const CONSOLE_PATTERNS = [
  /console\.log\(/g,
  /console\.error\(/g,
  /console\.warn\(/g,
  /console\.info\(/g,
  /console\.debug\(/g,
];

// 检查文件是否应该被处理
function shouldProcessFile(filePath) {
  // 检查扩展名
  const ext = path.extname(filePath);
  if (!EXTENSIONS.includes(ext)) {
    return false;
  }

  // 检查排除模式
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(filePath)) {
      return false;
    }
  }

  // 检查排除目录
  for (const dir of EXCLUDE_DIRS) {
    if (filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)) {
      return false;
    }
  }

  return true;
}

// 检查 console 语句是否已经在开发环境检查中
function isWrappedInDevCheck(content, index) {
  // 向前查找最近的 if 语句
  const beforeIndex = Math.max(0, index - 500);
  const beforeContent = content.substring(beforeIndex, index);
  
  // 检查是否有开发环境检查
  const devCheckPattern = /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\)/;
  const hasDevCheck = devCheckPattern.test(beforeContent);
  
  // 检查是否在最近的 if 块内
  const lastIfIndex = beforeContent.lastIndexOf('if');
  if (lastIfIndex === -1) {
    return false;
  }
  
  // 检查最近的 if 是否是开发环境检查
  const afterLastIf = beforeContent.substring(lastIfIndex);
  return devCheckPattern.test(afterLastIf);
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let changes = [];

    // 查找所有 console 语句
    for (const pattern of CONSOLE_PATTERNS) {
      const matches = [...content.matchAll(new RegExp(pattern.source, 'g'))];
      
      // 从后向前处理，避免索引偏移
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const index = match.index;
        
        // 跳过已经在开发环境检查中的
        if (isWrappedInDevCheck(content, index)) {
          continue;
        }
        
        // 跳过注释中的
        const beforeMatch = content.substring(Math.max(0, index - 100), index);
        if (beforeMatch.includes('//') || beforeMatch.includes('/*')) {
          continue;
        }
        
        // 找到 console 语句的结束位置
        let depth = 0;
        let inString = false;
        let stringChar = null;
        let endIndex = index;
        let foundStart = false;
        
        for (let j = index; j < content.length; j++) {
          const char = content[j];
          
          if (!foundStart && char === '(') {
            foundStart = true;
            depth = 1;
            continue;
          }
          
          if (!foundStart) continue;
          
          if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar && content[j - 1] !== '\\') {
            inString = false;
            stringChar = null;
          }
          
          if (!inString) {
            if (char === '(') depth++;
            if (char === ')') depth--;
            if (depth === 0) {
              endIndex = j + 1;
              break;
            }
          }
        }
        
        // 获取完整的 console 语句
        const consoleStatement = content.substring(index, endIndex);
        
        // 检查是否是单行语句
        const isSingleLine = !consoleStatement.includes('\n');
        
        // 获取缩进
        const lineStart = content.lastIndexOf('\n', index) + 1;
        const indent = content.substring(lineStart, index);
        
        // 包装在开发环境检查中
        let wrappedStatement;
        if (isSingleLine) {
          wrappedStatement = `if (process.env.NODE_ENV === 'development') {\n${indent}  ${consoleStatement.trim()}\n${indent}}`;
        } else {
          // 多行语句需要更复杂的处理
          const lines = consoleStatement.split('\n');
          const firstLine = lines[0];
          const restLines = lines.slice(1, -1).map(line => `  ${line}`);
          const lastLine = lines[lines.length - 1];
          wrappedStatement = `if (process.env.NODE_ENV === 'development') {\n${indent}  ${firstLine.trim()}\n${restLines.join('\n')}\n${indent}  ${lastLine.trim()}\n${indent}}`;
        }
        
        // 替换
        content = content.substring(0, index) + wrappedStatement + content.substring(endIndex);
        modified = true;
        changes.push({
          type: pattern.source.replace(/\\/g, ''),
          line: content.substring(0, index).split('\n').length,
        });
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return { modified: true, changes };
    }
    
    return { modified: false, changes: [] };
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error.message);
    return { modified: false, error: error.message };
  }
}

// 递归查找所有文件
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (shouldProcessFile(filePath)) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// 主函数
function main() {
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('src 目录不存在');
    process.exit(1);
  }
  
  console.log('正在查找文件...');
  const files = findFiles(srcDir);
  console.log(`找到 ${files.length} 个文件需要处理`);
  
  let totalModified = 0;
  let totalChanges = 0;
  const results = [];
  
  for (const file of files) {
    const result = processFile(file);
    if (result.modified) {
      totalModified++;
      totalChanges += result.changes.length;
      results.push({
        file: path.relative(process.cwd(), file),
        changes: result.changes.length,
      });
    }
  }
  
  console.log('\n处理完成！');
  console.log(`修改了 ${totalModified} 个文件`);
  console.log(`共处理了 ${totalChanges} 个 console 语句`);
  
  if (results.length > 0) {
    console.log('\n修改的文件列表:');
    results.slice(0, 20).forEach(r => {
      console.log(`  - ${r.file} (${r.changes} 个更改)`);
    });
    if (results.length > 20) {
      console.log(`  ... 还有 ${results.length - 20} 个文件`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, findFiles };

