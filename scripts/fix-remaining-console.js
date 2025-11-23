#!/usr/bin/env node

/**
 * 修复剩余的未包装的 console 语句
 * 处理脚本可能遗漏的情况
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fixRemainingConsole(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 查找未包装的 console 语句（不在 if 块内）
    const consolePattern = /(?!if\s*\([^)]*process\.env\.NODE_ENV[^)]*\)\s*\{[^}]*)\bconsole\.(log|error|warn|info|debug)\(/g;
    
    // 更简单的方法：查找不在开发环境检查中的 console
    const lines = content.split('\n');
    const newLines = [];
    let inDevCheck = false;
    let devCheckDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查是否进入开发环境检查
      if (line.includes("if (process.env.NODE_ENV === 'development')")) {
        inDevCheck = true;
        devCheckDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        newLines.push(line);
        continue;
      }
      
      // 检查是否退出开发环境检查
      if (inDevCheck) {
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        devCheckDepth += openBraces - closeBraces;
        
        if (devCheckDepth <= 0 && line.trim().startsWith('}')) {
          inDevCheck = false;
          devCheckDepth = 0;
        }
        newLines.push(line);
        continue;
      }
      
      // 检查是否有未包装的 console 语句
      if (/console\.(log|error|warn|info|debug)\(/.test(line) && !inDevCheck) {
        // 获取缩进
        const indent = line.match(/^(\s*)/)[1];
        // 包装在开发环境检查中
        newLines.push(`${indent}if (process.env.NODE_ENV === 'development') {`);
        newLines.push(`${indent}  ${line.trim()}`);
        newLines.push(`${indent}}`);
        modified = true;
      } else {
        newLines.push(line);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error.message);
    return false;
  }
}

// 获取有 console 警告的文件列表
function getFilesWithConsoleWarnings() {
  try {
    const output = execSync('npm run lint 2>&1 | grep "Unexpected console" | cut -d: -f1 | sort -u', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return output.trim().split('\n').filter(f => f);
  } catch (error) {
    return [];
  }
}

function main() {
  console.log('正在查找有 console 警告的文件...');
  const files = getFilesWithConsoleWarnings();
  
  if (files.length === 0) {
    console.log('没有找到需要修复的文件');
    return;
  }
  
  console.log(`找到 ${files.length} 个文件需要修复`);
  
  let fixed = 0;
  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath) && fixRemainingConsole(filePath)) {
      fixed++;
      console.log(`修复了: ${file}`);
    }
  }
  
  console.log(`\n修复了 ${fixed} 个文件`);
}

if (require.main === module) {
  main();
}

module.exports = { fixRemainingConsole };

